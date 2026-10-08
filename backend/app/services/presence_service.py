"""Keeps meeting/participant state consistent when people leave, time out or are removed.

There is no persistent socket connection, so each browser in a meeting sends a heartbeat
every few seconds. Participants whose heartbeat stops are marked as timed out the next time
anyone looks at the meeting ("lazy expiry"), which avoids needing a background worker.
"""

from collections.abc import Iterable
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.time import utcnow
from app.models import LeaveReason, Meeting, MeetingStatus, Participant, ParticipantRole


def active_participants_query(meeting_id: int):
    return (
        select(Participant)
        .where(Participant.meeting_id == meeting_id, Participant.left_at.is_(None))
        .order_by(Participant.joined_at, Participant.id)
    )


def mark_left(participant: Participant, reason: LeaveReason) -> None:
    participant.left_at = utcnow()
    participant.left_reason = reason
    participant.hand_raised = False
    participant.is_screen_sharing = False


def reconcile_meeting(db: Session, meeting: Meeting) -> None:
    """Called after someone departs: end an empty meeting, or hand the host role on."""
    db.flush()
    active = db.scalars(active_participants_query(meeting.id)).all()
    if not active:
        if meeting.status == MeetingStatus.LIVE:
            meeting.status = MeetingStatus.ENDED
            meeting.ended_at = utcnow()
        return
    if not any(p.role == ParticipantRole.HOST for p in active):
        # Like Zoom: when the host leaves, the longest-present participant becomes host.
        active[0].role = ParticipantRole.HOST


def expire_stale_participants(db: Session, meetings: Iterable[Meeting]) -> None:
    """Mark participants who stopped sending heartbeats as having left. Does not commit."""
    meetings_by_id = {m.id: m for m in meetings if m.status == MeetingStatus.LIVE}
    if not meetings_by_id:
        return

    cutoff = utcnow() - timedelta(seconds=get_settings().participant_timeout_seconds)
    stale = db.scalars(
        select(Participant).where(
            Participant.meeting_id.in_(meetings_by_id.keys()),
            Participant.left_at.is_(None),
            Participant.last_seen_at < cutoff,
        )
    ).all()

    for participant in stale:
        mark_left(participant, LeaveReason.TIMED_OUT)
    for meeting_id in {p.meeting_id for p in stale}:
        reconcile_meeting(db, meetings_by_id[meeting_id])
