from datetime import datetime

from pydantic import Field, model_validator

from app.models.enums import LeaveReason, MeetingStatus, ParticipantRole
from app.schemas.common import ApiModel, DisplayName, ResponseModel
from app.schemas.meeting import MeetingOut

ALLOWED_REACTIONS = ("👏", "👍", "❤️", "😂", "😮", "🎉")


class JoinMeetingRequest(ApiModel):
    display_name: DisplayName
    # Only honoured when the logged-in user is the meeting's host.
    as_host: bool = False
    is_muted: bool = False
    is_video_on: bool = True


class ParticipantOut(ResponseModel):
    id: int
    display_name: str
    role: ParticipantRole
    is_muted: bool
    is_video_on: bool
    hand_raised: bool
    is_screen_sharing: bool
    reaction: str | None
    reaction_at: datetime | None
    joined_at: datetime
    left_at: datetime | None
    left_reason: LeaveReason | None
    is_active: bool


class JoinMeetingResponse(ResponseModel):
    meeting: MeetingOut
    participant: ParticipantOut
    # Secret the client sends back in the X-Participant-Token header.
    session_token: str


class ParticipantUpdate(ApiModel):
    is_muted: bool | None = None
    is_video_on: bool | None = None
    hand_raised: bool | None = None
    is_screen_sharing: bool | None = None
    reaction: str | None = Field(default=None, description=f"One of {' '.join(ALLOWED_REACTIONS)}")

    @model_validator(mode="after")
    def validate_reaction(self) -> "ParticipantUpdate":
        if self.reaction is not None and self.reaction not in ALLOWED_REACTIONS:
            raise ValueError("Unsupported reaction")
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        return self


class HeartbeatResponse(ResponseModel):
    participant: ParticipantOut
    meeting_status: MeetingStatus
    participants: list[ParticipantOut]
