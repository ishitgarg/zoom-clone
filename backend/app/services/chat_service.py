from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ChatMessage, Meeting, Participant
from app.schemas.chat import ChatMessageCreate
from app.services.participant_service import require_active

MAX_MESSAGES_PER_PAGE = 200


def list_messages(db: Session, meeting: Meeting, viewer: Participant, after_id: int = 0) -> list[ChatMessage]:
    """Messages newer than `after_id`, so clients can poll for just what they haven't seen.

    Like Zoom, a participant only sees chat sent after they joined.
    """
    return list(
        db.scalars(
            select(ChatMessage)
            .where(
                ChatMessage.meeting_id == meeting.id,
                ChatMessage.id > after_id,
                ChatMessage.created_at >= viewer.joined_at,
            )
            .order_by(ChatMessage.id)
            .limit(MAX_MESSAGES_PER_PAGE)
        ).all()
    )


def send_message(db: Session, meeting: Meeting, sender: Participant, data: ChatMessageCreate) -> ChatMessage:
    require_active(sender)
    message = ChatMessage(
        meeting_id=meeting.id,
        participant_id=sender.id,
        sender_name=sender.display_name,
        body=data.body,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message
