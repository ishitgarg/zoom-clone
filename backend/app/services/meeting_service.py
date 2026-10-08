"""Business logic for creating, finding and listing meetings."""

import logging
from collections.abc import Callable, Sequence
from datetime import timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.errors import (
    MEETING_NOT_FOUND_MESSAGE,
    InvalidInputError,
    NotFoundError,
    PermissionDeniedError,
)
from app.core.meeting_codes import generate_meeting_code, normalize_meeting_code
from app.core.time import utcnow
from app.models import Meeting, MeetingStatus, MeetingType, Participant, User
from app.schemas.meeting import (
    MAX_DURATION_MINUTES,
    InstantMeetingCreate,
    MeetingOut,
    ScheduledMeetingCreate,
)
from app.schemas.user import HostOut
from app.services.presence_service import expire_stale_participants

logger = logging.getLogger(__name__)

MAX_CODE_GENERATION_ATTEMPTS = 5
INSTANT_MEETING_DEFAULT_DURATION = 60
DASHBOARD_LIST_LIMIT = 20


# ---------------------------------------------------------------- lookup


def get_meeting_by_code(db: Session, raw_code: str) -> Meeting:
    code = normalize_meeting_code(raw_code)
    if code is None:
        raise InvalidInputError("Please enter a valid meeting ID (9-11 digits) or invite link.")
    meeting = db.scalar(select(Meeting).options(selectinload(Meeting.host)).where(Meeting.meeting_code == code))
    if meeting is None:
        raise NotFoundError(MEETING_NOT_FOUND_MESSAGE)
    return meeting


# ---------------------------------------------------------------- creation


def _insert_with_unique_code(db: Session, build: Callable[[str], Meeting]) -> Meeting:
    """Insert a meeting with a freshly generated, unique meeting code.

    Uniqueness is guaranteed by the UNIQUE index on meetings.meeting_code. We pre-check to
    avoid most collisions, and if two requests race for the same code the database rejects
    the second insert with an IntegrityError, so we roll back and try a new code.
    """
    for _ in range(MAX_CODE_GENERATION_ATTEMPTS):
        code = generate_meeting_code()
        if db.scalar(select(Meeting.id).where(Meeting.meeting_code == code)) is not None:
            continue
        meeting = build(code)
        db.add(meeting)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if db.scalar(select(Meeting.id).where(Meeting.meeting_code == code)) is None:
                raise  # some other constraint failed; don't mask it
            logger.warning("Meeting code collision on insert, retrying")
            continue
        db.refresh(meeting)
        return meeting
    raise RuntimeError("Could not generate a unique meeting ID")


def create_instant_meeting(db: Session, host: User, data: InstantMeetingCreate) -> Meeting:
    now = utcnow()
    return _insert_with_unique_code(
        db,
        lambda code: Meeting(
            meeting_code=code,
            title=data.title or f"{host.name}'s Zoom Meeting",
            host_id=host.id,
            meeting_type=MeetingType.INSTANT,
            # An instant meeting starts immediately; the host is redirected straight in.
            status=MeetingStatus.LIVE,
            duration_minutes=INSTANT_MEETING_DEFAULT_DURATION,
            started_at=now,
        ),
    )


def create_scheduled_meeting(db: Session, host: User, data: ScheduledMeetingCreate) -> Meeting:
    return _insert_with_unique_code(
        db,
        lambda code: Meeting(
            meeting_code=code,
            title=data.title,
            description=data.description,
            host_id=host.id,
            meeting_type=MeetingType.SCHEDULED,
            status=MeetingStatus.SCHEDULED,
            scheduled_start=data.start_time,
            duration_minutes=data.duration_minutes,
        ),
    )


def cancel_meeting(db: Session, user: User, meeting: Meeting) -> None:
    if meeting.host_id != user.id:
        raise PermissionDeniedError("Only the host can delete this meeting.")
    if meeting.status != MeetingStatus.SCHEDULED:
        raise InvalidInputError("Only meetings that have not started can be deleted.")
    meeting.status = MeetingStatus.CANCELLED
    db.commit()


# ---------------------------------------------------------------- listing


def list_upcoming_meetings(db: Session, user: User) -> list[Meeting]:
    """Scheduled meetings hosted by the user that have not finished yet, soonest first."""
    now = utcnow()
    # SQLite can't easily add a per-row duration to a datetime, so narrow the query with the
    # longest possible duration and apply the exact "has it finished?" check in Python.
    candidates = db.scalars(
        select(Meeting)
        .options(selectinload(Meeting.host))
        .where(
            Meeting.host_id == user.id,
            Meeting.meeting_type == MeetingType.SCHEDULED,
            Meeting.status.in_([MeetingStatus.SCHEDULED, MeetingStatus.LIVE]),
            Meeting.scheduled_start > now - timedelta(minutes=MAX_DURATION_MINUTES),
        )
        .order_by(Meeting.scheduled_start)
    ).all()
    upcoming = [
        m
        for m in candidates
        if m.status == MeetingStatus.LIVE or m.scheduled_start + timedelta(minutes=m.duration_minutes) > now
    ]
    return upcoming[:DASHBOARD_LIST_LIMIT]


def list_recent_meetings(db: Session, user: User) -> list[Meeting]:
    """Meetings that have actually taken place and that the user hosted or attended."""
    attended = select(Participant.meeting_id).where(Participant.user_id == user.id)
    last_activity = func.coalesce(Meeting.ended_at, Meeting.started_at)
    return list(
        db.scalars(
            select(Meeting)
            .options(selectinload(Meeting.host))
            .where(
                or_(Meeting.host_id == user.id, Meeting.id.in_(attended)),
                Meeting.started_at.is_not(None),
                Meeting.status.in_([MeetingStatus.LIVE, MeetingStatus.ENDED]),
            )
            .order_by(last_activity.desc())
            .limit(DASHBOARD_LIST_LIMIT)
        ).all()
    )


# ---------------------------------------------------------------- serialisation


def build_invite_url(meeting_code: str) -> str:
    return f"{get_settings().frontend_url}/meeting/{meeting_code}"


def to_meeting_out_list(db: Session, meetings: Sequence[Meeting]) -> list[MeetingOut]:
    """Serialise meetings, expiring stale participants first so counts are accurate."""
    if not meetings:
        return []
    expire_stale_participants(db, meetings)
    db.commit()

    counts = dict(
        db.execute(
            select(Participant.meeting_id, func.count(Participant.id))
            .where(Participant.meeting_id.in_([m.id for m in meetings]), Participant.left_at.is_(None))
            .group_by(Participant.meeting_id)
        ).all()
    )
    return [
        MeetingOut(
            meeting_id=m.meeting_code,
            title=m.title,
            description=m.description,
            meeting_type=m.meeting_type,
            status=m.status,
            host=HostOut.model_validate(m.host),
            scheduled_start=m.scheduled_start,
            duration_minutes=m.duration_minutes,
            started_at=m.started_at,
            ended_at=m.ended_at,
            created_at=m.created_at,
            invite_url=build_invite_url(m.meeting_code),
            active_participant_count=counts.get(m.id, 0),
        )
        for m in meetings
    ]


def to_meeting_out(db: Session, meeting: Meeting) -> MeetingOut:
    return to_meeting_out_list(db, [meeting])[0]
