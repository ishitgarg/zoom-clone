import enum

from sqlalchemy import Enum


class MeetingType(str, enum.Enum):
    INSTANT = "instant"
    SCHEDULED = "scheduled"


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"  # created for the future, nobody has joined yet
    LIVE = "live"  # at least one participant is (or was recently) in the room
    ENDED = "ended"  # everyone left, or the host ended it for all
    CANCELLED = "cancelled"  # host deleted a scheduled meeting; it can no longer be joined


class ParticipantRole(str, enum.Enum):
    HOST = "host"
    ATTENDEE = "attendee"


class LeaveReason(str, enum.Enum):
    LEFT = "left"
    REMOVED = "removed"  # removed by the host
    TIMED_OUT = "timed_out"  # stopped sending heartbeats (closed tab, lost network)
    MEETING_ENDED = "meeting_ended"  # host ended the meeting for everyone


def db_enum(enum_cls: type[enum.Enum]) -> Enum:
    """Store enum *values* as VARCHAR with a CHECK constraint (SQLite has no native enum type)."""
    return Enum(
        enum_cls,
        native_enum=False,
        create_constraint=True,
        values_callable=lambda members: [member.value for member in members],
        length=20,
        name=f"{enum_cls.__name__.lower()}_enum",
    )
