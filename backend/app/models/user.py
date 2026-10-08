from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.meeting import Meeting


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    # NULL means the account can't sign in with a password.
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    hosted_meetings: Mapped[list["Meeting"]] = relationship(back_populates="host")
