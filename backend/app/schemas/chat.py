from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import ApiModel, MultiLineText, ResponseModel


class ChatMessageCreate(ApiModel):
    body: MultiLineText = Field(max_length=1000)

    @field_validator("body")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("Message cannot be empty")
        return value


class ChatMessageOut(ResponseModel):
    id: int
    participant_id: int | None
    sender_name: str
    body: str
    created_at: datetime
