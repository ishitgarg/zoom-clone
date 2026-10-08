"""Business logic for joining, leaving and managing people inside a meeting."""

import secrets

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.errors import (
    InvalidInputError,
    InvalidTokenError,
    MeetingUnavailableError,
    NotFoundError,
    PermissionDeniedError,
)
from app.core.time import utcnow
from app.models import LeaveReason, Meeting, MeetingStatus, Participant, ParticipantRole, Signal, User
from app.schemas.participant import JoinMeetingRequest, ParticipantUpdate
from app.services.presence_service import (
    active_participants_query,
    expire_stale_participants,
    mark_left,
    reconcile_meeting,
)

# ---------------------------------------------------------------- joining


def join_meeting(
    db: Session, meeting: Meeting, user: User, data: JoinMeetingRequest, signed_in: bool = False
) -> Participant:
    """Add a participant. `signed_in` is True when the user actually signed in (rather than
    being the default user), in which case the attendance is linked to their account."""
    if meeting.status == MeetingStatus.CANCELLED:
        raise MeetingUnavailableError("This meeting has been cancelled by the host.")

    if data.as_host and meeting.host_id != user.id:
        raise PermissionDeniedError("Only the host can start this meeting.")
    role = ParticipantRole.HOST if data.as_host else ParticipantRole.ATTENDEE

    now = utcnow()
    if meeting.status != MeetingStatus.LIVE:
        # First person in a scheduled meeting, or re-opening a meeting that had ended.
        meeting.status = MeetingStatus.LIVE
        meeting.started_at = now
        meeting.ended_at = None

    participant = Participant(
        meeting_id=meeting.id,
        # Hosts and signed-in users are linked to their account; everyone else joins as a guest.
        user_id=user.id if role == ParticipantRole.HOST or signed_in else None,
        display_name=data.display_name,
        role=role,
        session_token=secrets.token_urlsafe(32),
        is_muted=data.is_muted,
        is_video_on=data.is_video_on,
        joined_at=now,
        last_seen_at=now,
    )
    if role == ParticipantRole.HOST:
        # The meeting owner reclaims the host role if it was handed to someone else.
        for other in db.scalars(active_participants_query(meeting.id)).all():
            if other.role == ParticipantRole.HOST:
                other.role = ParticipantRole.ATTENDEE
    db.add(participant)
    expire_stale_participants(db, [meeting])
    db.commit()
    db.refresh(participant)
    return participant


# ---------------------------------------------------------------- identity / permissions


def authenticate_participant(db: Session, meeting: Meeting, token: str | None) -> Participant:
    """Resolve the participant making a request from the secret token issued at join time."""
    participant = None
    if token:
        participant = db.scalar(
            select(Participant).where(Participant.session_token == token, Participant.meeting_id == meeting.id)
        )
    if participant is None:
        raise InvalidTokenError("Your meeting session is not valid. Please re-join the meeting.")
    return participant


def require_active(participant: Participant) -> None:
    if not participant.is_active:
        raise MeetingUnavailableError("You are no longer in this meeting.")


def require_host(participant: Participant) -> None:
    require_active(participant)
    if participant.role != ParticipantRole.HOST:
        raise PermissionDeniedError("Only the host can do that.")


def _get_active_target(db: Session, meeting: Meeting, participant_id: int) -> Participant:
    target = db.get(Participant, participant_id)
    if target is None or target.meeting_id != meeting.id or not target.is_active:
        raise NotFoundError("That participant is no longer in the meeting.")
    return target


# ---------------------------------------------------------------- presence


def list_active_participants(db: Session, meeting: Meeting) -> list[Participant]:
    """Active participants, host first and then in join order."""
    expire_stale_participants(db, [meeting])
    db.commit()
    participants = db.scalars(active_participants_query(meeting.id)).all()
    return sorted(participants, key=lambda p: p.role != ParticipantRole.HOST)


def heartbeat(db: Session, meeting: Meeting, participant: Participant) -> list[Participant]:
    """Record that the participant is still connected and return the current roster."""
    if participant.is_active:
        participant.last_seen_at = utcnow()
    return list_active_participants(db, meeting)


def update_own_state(db: Session, participant: Participant, data: ParticipantUpdate) -> Participant:
    require_active(participant)
    if data.is_muted is not None:
        participant.is_muted = data.is_muted
    if data.is_video_on is not None:
        participant.is_video_on = data.is_video_on
    if data.hand_raised is not None:
        participant.hand_raised = data.hand_raised
    if data.is_screen_sharing is not None:
        participant.is_screen_sharing = data.is_screen_sharing
    if data.reaction is not None:
        participant.reaction = data.reaction
        participant.reaction_at = utcnow()
    participant.last_seen_at = utcnow()
    db.commit()
    db.refresh(participant)
    return participant


def leave_meeting(db: Session, meeting: Meeting, participant: Participant) -> None:
    if not participant.is_active:
        return  # leaving twice (e.g. button + page unload) is harmless
    mark_left(participant, LeaveReason.LEFT)
    reconcile_meeting(db, meeting)
    db.commit()


# ---------------------------------------------------------------- host controls


def remove_participant(db: Session, meeting: Meeting, host: Participant, participant_id: int) -> None:
    require_host(host)
    target = _get_active_target(db, meeting, participant_id)
    if target.id == host.id:
        raise InvalidInputError("You can't remove yourself. Use Leave instead.")
    mark_left(target, LeaveReason.REMOVED)
    db.commit()


def mute_participant(db: Session, meeting: Meeting, host: Participant, participant_id: int) -> Participant:
    require_host(host)
    target = _get_active_target(db, meeting, participant_id)
    target.is_muted = True
    db.commit()
    return target


def mute_all(db: Session, meeting: Meeting, host: Participant) -> int:
    """Mute every active participant except the host. Returns how many were muted."""
    require_host(host)
    others = db.scalars(
        active_participants_query(meeting.id).where(Participant.id != host.id, Participant.is_muted.is_(False))
    ).all()
    for participant in others:
        participant.is_muted = True
    db.commit()
    return len(others)


def end_meeting_for_all(db: Session, meeting: Meeting, host: Participant) -> None:
    require_host(host)
    for participant in db.scalars(active_participants_query(meeting.id)).all():
        mark_left(participant, LeaveReason.MEETING_ENDED)
    meeting.status = MeetingStatus.ENDED
    meeting.ended_at = utcnow()
    db.execute(delete(Signal).where(Signal.meeting_id == meeting.id))
    db.commit()
