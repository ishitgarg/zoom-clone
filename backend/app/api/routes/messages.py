from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import ActingParticipant, DbSession, MeetingFromPath
from app.schemas.chat import ChatMessageCreate, ChatMessageOut
from app.services import chat_service

router = APIRouter(prefix="/meetings/{meeting_id}/messages", tags=["chat"])


@router.get("", response_model=list[ChatMessageOut])
def list_messages(
    db: DbSession, meeting: MeetingFromPath, me: ActingParticipant, after_id: Annotated[int, Query(ge=0)] = 0
) -> list[ChatMessageOut]:
    """Chat visible to me (messages sent since I joined), newer than `after_id`."""
    messages = chat_service.list_messages(db, meeting, me, after_id)
    return [ChatMessageOut.model_validate(m) for m in messages]


@router.post("", response_model=ChatMessageOut, status_code=status.HTTP_201_CREATED)
def send_message(
    db: DbSession, meeting: MeetingFromPath, me: ActingParticipant, body: ChatMessageCreate
) -> ChatMessageOut:
    return ChatMessageOut.model_validate(chat_service.send_message(db, meeting, me, body))
