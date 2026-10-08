from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import ActingParticipant, DbSession, MeetingFromPath
from app.schemas.signal import SignalCreate, SignalOut
from app.services import signal_service

router = APIRouter(prefix="/meetings/{meeting_id}/signals", tags=["webrtc signalling"])


@router.post("", response_model=SignalOut, status_code=status.HTTP_201_CREATED)
def send_signal(db: DbSession, meeting: MeetingFromPath, me: ActingParticipant, body: SignalCreate) -> SignalOut:
    return SignalOut.model_validate(signal_service.send_signal(db, meeting, me, body))


@router.get("", response_model=list[SignalOut])
def receive_signals(db: DbSession, me: ActingParticipant, after_id: Annotated[int, Query(ge=0)] = 0) -> list[SignalOut]:
    return [SignalOut.model_validate(s) for s in signal_service.receive_signals(db, me, after_id)]
