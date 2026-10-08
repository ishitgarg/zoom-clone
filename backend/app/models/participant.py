from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import UTCDateTime
from app.database.base import Base, TimestampMixin
from app.models.enums import LeaveReason, ParticipantRole, db_enum

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.user import User


class Participant(TimestampMixin, Base):
    """One row per *attendance* of a meeting (a person who leaves and re-joins gets a new row)."""

    __tablename__ = "participants"
    __table_args__ = (
        # "Who is currently in meeting X?" is the hottest query in the app.
        Index("ix_participants_meeting_active", "meeting_id", "left_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    # Set for the logged-in (default) user; NULL for guests who joined with just a display name.
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)

    display_name: Mapped[str] = mapped_column(String(50), nullable=False)
    role: Mapped[ParticipantRole] = mapped_column(db_enum(ParticipantRole), nullable=False)

    # Secret handed to the joining browser; required to act as this participant.
    session_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)

    is_muted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_video_on: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    hand_raised: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_screen_sharing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    reaction: Mapped[str | None] = mapped_column(String(16), nullable=True)
    reaction_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)

    joined_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    left_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    left_reason: Mapped[LeaveReason | None] = mapped_column(db_enum(LeaveReason), nullable=True)

    meeting: Mapped["Meeting"] = relationship(back_populates="participants")
    user: Mapped["User | None"] = relationship()

    @property
    def is_active(self) -> bool:
        return self.left_at is None
