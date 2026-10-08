import json
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.common import ApiModel, ResponseModel

MAX_SIGNAL_PAYLOAD_BYTES = 20_000


class SignalCreate(ApiModel):
    recipient_id: int
    kind: Literal["offer", "answer", "candidate"]
    payload: str = Field(max_length=MAX_SIGNAL_PAYLOAD_BYTES)

    @field_validator("payload")
    @classmethod
    def must_be_json(cls, value: str) -> str:
        try:
            json.loads(value)
        except ValueError as exc:
            raise ValueError("payload must be a JSON string") from exc
        return value


class SignalOut(ResponseModel):
    id: int
    sender_id: int
    kind: str
    payload: str
