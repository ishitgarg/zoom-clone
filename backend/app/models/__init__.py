"""Importing this package registers every model on Base.metadata."""

from app.models.auth_session import AuthSession
from app.models.chat_message import ChatMessage
from app.models.enums import LeaveReason, MeetingStatus, MeetingType, ParticipantRole
from app.models.meeting import Meeting
from app.models.participant import Participant
from app.models.signal import Signal
from app.models.user import User

__all__ = [
    "AuthSession",
    "ChatMessage",
    "LeaveReason",
    "Meeting",
    "MeetingStatus",
    "MeetingType",
    "Participant",
    "ParticipantRole",
    "Signal",
    "User",
]
