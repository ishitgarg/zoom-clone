from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class Signal(TimestampMixin, Base):
    """A WebRTC signalling message (SDP offer/answer or ICE candidate) relayed between two
    participants. Browsers exchange these through the API to set up peer-to-peer media;
    the audio/video itself never touches the server.
    """

    __tablename__ = "signals"
    __table_args__ = (Index("ix_signals_recipient_id", "recipient_id", "id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True, nullable=False)
    sender_id: Mapped[int] = mapped_column(ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # offer | answer | candidate
    payload: Mapped[str] = mapped_column(Text, nullable=False)  # JSON produced by the browser
