from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import UTCDateTime
from app.database.base import Base, TimestampMixin
from app.models.enums import MeetingStatus, MeetingType, db_enum

if TYPE_CHECKING:
    from app.models.chat_message import ChatMessage
    from app.models.participant import Participant
    from app.models.user import User


class Meeting(TimestampMixin, Base):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="ck_meetings_duration_positive"),
        CheckConstraint(
            "meeting_type != 'scheduled' OR scheduled_start IS NOT NULL",
            name="ck_meetings_scheduled_has_start",
        ),
        Index("ix_meetings_host_status_start", "host_id", "status", "scheduled_start"),
    )

    # Internal surrogate key; never exposed to clients.
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Public, shareable 10-digit Meeting ID. The UNIQUE index is the final uniqueness guarantee.
    meeting_code: Mapped[str] = mapped_column(String(11), unique=True, index=True, nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    meeting_type: Mapped[MeetingType] = mapped_column(db_enum(MeetingType), nullable=False)
    status: Mapped[MeetingStatus] = mapped_column(db_enum(MeetingStatus), nullable=False)

    scheduled_start: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)

    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)

    host: Mapped["User"] = relationship(back_populates="hosted_meetings")
    participants: Mapped[list["Participant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True
    )
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True
    )
