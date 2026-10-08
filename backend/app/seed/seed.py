"""Sample data for local development and demos.

Run from the backend directory:
    python -m app.seed.seed            # seed only if the database has no meetings
    python -m app.seed.seed --reset    # drop all tables, recreate and seed

Times are relative to "now" so upcoming meetings are always in the future.
Seeded meetings use fixed IDs so they are easy to try out (see README).
Every seeded account can sign in with the DEMO_PASSWORD setting (default: zoomdemo123).
"""

import argparse
import logging
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.security import hash_password
from app.core.time import utcnow
from app.database.base import Base
from app.database.init_db import create_tables
from app.database.session import SessionLocal, engine
from app.models import (
    ChatMessage,
    LeaveReason,
    Meeting,
    MeetingStatus,
    MeetingType,
    Participant,
    ParticipantRole,
    User,
)
from app.services.user_service import ensure_default_user

logger = logging.getLogger(__name__)

OTHER_USERS = [
    ("Priya Sharma", "priya.sharma@example.com"),
    ("Daniel Kim", "daniel.kim@example.com"),
    ("Sofia Rossi", "sofia.rossi@example.com"),
]


@dataclass
class UpcomingSeed:
    code: str
    title: str
    description: str
    starts_in: timedelta
    duration: int


@dataclass
class PastSeed:
    code: str
    title: str
    started_ago: timedelta
    duration: int
    attendees: list[str]
    meeting_type: MeetingType = MeetingType.SCHEDULED
    host_email: str | None = None  # None -> the default user
    description: str | None = None
    chat: list[tuple[str, str]] = field(default_factory=list)


UPCOMING = [
    UpcomingSeed(
        "8123456789", "Weekly Product Sync", "Roadmap check-in, blockers and release status.", timedelta(hours=2), 30
    ),
    UpcomingSeed(
        "8234567890",
        "Design Review: Mobile Onboarding",
        "Walk through the new onboarding flow mocks with the design team.",
        timedelta(days=1, hours=1),
        60,
    ),
    UpcomingSeed("8345678901", "1:1 with Priya", "Career growth and Q4 goals.", timedelta(days=2, hours=3), 30),
    UpcomingSeed(
        "8456789012",
        "Sprint Planning",
        "Plan and estimate stories for the next two-week sprint.",
        timedelta(days=3, hours=-1),
        90,
    ),
    UpcomingSeed("8567890123", "Customer Demo: Acme Corp", "Live product demo followed by Q&A.", timedelta(days=6), 45),
]

PAST = [
    PastSeed(
        "7123456780",
        "Engineering Standup",
        timedelta(days=1, hours=2),
        15,
        ["Priya Sharma", "Daniel Kim", "Sofia Rossi"],
        chat=[
            ("Priya Sharma", "Morning all! PR for the billing fix is up."),
            ("Daniel Kim", "I'll review it after standup."),
            ("Alex Morgan", "Thanks both 🙌"),
        ],
    ),
    PastSeed(
        "7234567801",
        "Marketing Brainstorm",
        timedelta(days=2, hours=5),
        45,
        ["Sofia Rossi", "Daniel Kim"],
        description="Ideas for the winter campaign.",
    ),
    PastSeed(
        "7345678012",
        "Alex Morgan's Zoom Meeting",
        timedelta(days=3, hours=1),
        20,
        ["Daniel Kim"],
        meeting_type=MeetingType.INSTANT,
    ),
    PastSeed(
        "7456780123",
        "Quarterly Business Review",
        timedelta(days=4, hours=4),
        60,
        ["Alex Morgan", "Daniel Kim"],
        host_email="priya.sharma@example.com",
        description="Q3 results and Q4 targets.",
    ),
    PastSeed("7567801234", "Hiring Panel: Frontend Engineer", timedelta(days=5, hours=6), 60, ["Priya Sharma"]),
]


def _round_to_half_hour(moment: datetime) -> datetime:
    moment = moment.replace(second=0, microsecond=0)
    return moment + timedelta(minutes=(30 - moment.minute % 30) % 30)


def _participant(
    meeting: Meeting, name: str, role: ParticipantRole, user: User | None, joined: datetime, left: datetime
) -> Participant:
    return Participant(
        meeting=meeting,
        user_id=user.id if user else None,
        display_name=name,
        role=role,
        session_token=secrets.token_urlsafe(32),
        joined_at=joined,
        last_seen_at=left,
        left_at=left,
        left_reason=LeaveReason.LEFT,
        is_video_on=True,
    )


def seed(db: Session) -> None:
    default_user = ensure_default_user(db)
    users_by_email = {default_user.email: default_user}
    for name, email in OTHER_USERS:
        user = db.scalar(select(User).where(User.email == email)) or User(
            name=name, email=email, password_hash=hash_password(get_settings().demo_password)
        )
        db.add(user)
        users_by_email[email] = user
    db.flush()

    now = utcnow()
    for item in UPCOMING:
        db.add(
            Meeting(
                meeting_code=item.code,
                title=item.title,
                description=item.description,
                host_id=default_user.id,
                meeting_type=MeetingType.SCHEDULED,
                status=MeetingStatus.SCHEDULED,
                scheduled_start=_round_to_half_hour(now + item.starts_in),
                duration_minutes=item.duration,
            )
        )

    for item in PAST:
        host = users_by_email[item.host_email] if item.host_email else default_user
        started = _round_to_half_hour(now - item.started_ago)
        ended = started + timedelta(minutes=item.duration)
        meeting = Meeting(
            meeting_code=item.code,
            title=item.title,
            description=item.description,
            host_id=host.id,
            meeting_type=item.meeting_type,
            status=MeetingStatus.ENDED,
            scheduled_start=started if item.meeting_type == MeetingType.SCHEDULED else None,
            duration_minutes=item.duration,
            started_at=started,
            ended_at=ended,
            created_at=started - timedelta(days=2),
        )
        db.add(meeting)
        db.add(_participant(meeting, host.name, ParticipantRole.HOST, host, started, ended))
        for offset, name in enumerate(item.attendees, start=1):
            # Only the logged-in user is linked to an account; other attendees are guests.
            linked_user = default_user if name == default_user.name else None
            db.add(
                _participant(
                    meeting, name, ParticipantRole.ATTENDEE, linked_user, started + timedelta(minutes=offset), ended
                )
            )
        db.flush()
        senders = {p.display_name: p for p in meeting.participants}
        for minute, (sender, body) in enumerate(item.chat, start=2):
            db.add(
                ChatMessage(
                    meeting_id=meeting.id,
                    participant_id=senders[sender].id,
                    sender_name=sender,
                    body=body,
                    created_at=started + timedelta(minutes=minute),
                )
            )

    # A cancelled meeting, to show it is excluded from the dashboard.
    db.add(
        Meeting(
            meeting_code="7999999999",
            title="Offsite Planning (cancelled)",
            host_id=default_user.id,
            meeting_type=MeetingType.SCHEDULED,
            status=MeetingStatus.CANCELLED,
            scheduled_start=_round_to_half_hour(now + timedelta(days=4)),
            duration_minutes=60,
        )
    )
    db.commit()
    logger.info("Seeded %d upcoming and %d past meetings", len(UPCOMING), len(PAST))


def seed_if_empty(db: Session) -> bool:
    if db.scalar(select(Meeting.id).limit(1)) is not None:
        logger.info("Database already has meetings; skipping seed")
        return False
    seed(db)
    return True


def main() -> None:
    configure_logging()
    parser = argparse.ArgumentParser(description="Seed the Zoom clone database with sample data.")
    parser.add_argument("--reset", action="store_true", help="drop all tables before seeding")
    args = parser.parse_args()

    if args.reset:
        Base.metadata.drop_all(bind=engine)
    create_tables(engine)
    with SessionLocal() as db:
        if args.reset:
            seed(db)
        else:
            seed_if_empty(db)


if __name__ == "__main__":
    main()
