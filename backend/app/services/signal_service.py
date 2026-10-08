"""Relays WebRTC signalling messages between participants of the same meeting."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import Meeting, Participant, Signal
from app.schemas.signal import SignalCreate
from app.services.participant_service import require_active

MAX_SIGNALS_PER_POLL = 100


def send_signal(db: Session, meeting: Meeting, sender: Participant, data: SignalCreate) -> Signal:
    require_active(sender)
    recipient = db.get(Participant, data.recipient_id)
    if recipient is None or recipient.meeting_id != meeting.id or not recipient.is_active:
        raise NotFoundError("That participant is no longer in the meeting.")
    signal = Signal(
        meeting_id=meeting.id, sender_id=sender.id, recipient_id=recipient.id, kind=data.kind, payload=data.payload
    )
    db.add(signal)
    db.commit()
    db.refresh(signal)
    return signal


def receive_signals(db: Session, recipient: Participant, after_id: int) -> list[Signal]:
    """Signals addressed to `recipient` newer than `after_id`. Older ones are pruned, since the
    client confirms it has processed everything up to `after_id` by asking for newer ones."""
    db.execute(delete(Signal).where(Signal.recipient_id == recipient.id, Signal.id <= after_id))
    signals = db.scalars(
        select(Signal)
        .where(Signal.recipient_id == recipient.id, Signal.id > after_id)
        .order_by(Signal.id)
        .limit(MAX_SIGNALS_PER_POLL)
    ).all()
    db.commit()
    return list(signals)
