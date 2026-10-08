from datetime import datetime, timedelta

from pydantic import Field, field_validator

from app.core.time import utcnow
from app.models.enums import MeetingStatus, MeetingType
from app.schemas.common import ApiModel, MultiLineText, ResponseModel, SingleLineText
from app.schemas.user import HostOut

MIN_DURATION_MINUTES = 15
MAX_DURATION_MINUTES = 24 * 60
MAX_SCHEDULE_AHEAD = timedelta(days=365)
# Allow a small amount of clock skew between browser and server.
PAST_START_TOLERANCE = timedelta(minutes=2)


class InstantMeetingCreate(ApiModel):
    title: SingleLineText | None = Field(default=None, max_length=200)


class ScheduledMeetingCreate(ApiModel):
    title: SingleLineText = Field(max_length=200)
    description: MultiLineText | None = Field(default=None, max_length=2000)
    start_time: datetime = Field(description="ISO-8601 timestamp including a timezone offset")
    duration_minutes: int = Field(ge=MIN_DURATION_MINUTES, le=MAX_DURATION_MINUTES)

    @field_validator("title")
    @classmethod
    def title_required(cls, value: str) -> str:
        if not value:
            raise ValueError("Please enter a meeting topic")
        return value

    @field_validator("description")
    @classmethod
    def empty_description_is_none(cls, value: str | None) -> str | None:
        return value or None

    @field_validator("start_time")
    @classmethod
    def start_time_in_future(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("Start time must include a timezone offset")
        now = utcnow()
        if value < now - PAST_START_TOLERANCE:
            raise ValueError("Start time must be in the future")
        if value > now + MAX_SCHEDULE_AHEAD:
            raise ValueError("Meetings can be scheduled at most one year ahead")
        return value


class MeetingOut(ResponseModel):
    meeting_id: str
    title: str
    description: str | None
    meeting_type: MeetingType
    status: MeetingStatus
    host: HostOut
    scheduled_start: datetime | None
    duration_minutes: int
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime
    invite_url: str
    active_participant_count: int
