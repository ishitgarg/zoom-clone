from fastapi import APIRouter, Response, status

from app.api.deps import ActingParticipant, CurrentUser, DbSession, MeetingFromPath, SignedInUser
from app.schemas.participant import (
    HeartbeatResponse,
    JoinMeetingRequest,
    JoinMeetingResponse,
    ParticipantOut,
    ParticipantUpdate,
)
from app.services import meeting_service, participant_service

router = APIRouter(prefix="/meetings/{meeting_id}/participants", tags=["participants"])


@router.post("", response_model=JoinMeetingResponse, status_code=status.HTTP_201_CREATED)
def join_meeting(
    db: DbSession, user: CurrentUser, signed_in: SignedInUser, meeting: MeetingFromPath, body: JoinMeetingRequest
) -> JoinMeetingResponse:
    participant = participant_service.join_meeting(db, meeting, user, body, signed_in=signed_in is not None)
    return JoinMeetingResponse(
        meeting=meeting_service.to_meeting_out(db, meeting),
        participant=ParticipantOut.model_validate(participant),
        session_token=participant.session_token,
    )


@router.get("", response_model=list[ParticipantOut])
def list_participants(db: DbSession, meeting: MeetingFromPath) -> list[ParticipantOut]:
    """Participants currently in the meeting (host first, then by join time)."""
    participants = participant_service.list_active_participants(db, meeting)
    return [ParticipantOut.model_validate(p) for p in participants]


# ----- actions on "me" (the participant identified by X-Participant-Token)


@router.post("/me/heartbeat", response_model=HeartbeatResponse)
def heartbeat(db: DbSession, meeting: MeetingFromPath, me: ActingParticipant) -> HeartbeatResponse:
    """Keep-alive sent every few seconds; returns my state, the meeting status and the roster."""
    roster = participant_service.heartbeat(db, meeting, me)
    db.refresh(me)
    return HeartbeatResponse(
        participant=ParticipantOut.model_validate(me),
        meeting_status=meeting.status,
        participants=[ParticipantOut.model_validate(p) for p in roster],
    )


@router.patch("/me", response_model=ParticipantOut)
def update_me(db: DbSession, me: ActingParticipant, body: ParticipantUpdate) -> ParticipantOut:
    return ParticipantOut.model_validate(participant_service.update_own_state(db, me, body))


@router.post("/me/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave(db: DbSession, meeting: MeetingFromPath, me: ActingParticipant) -> Response:
    participant_service.leave_meeting(db, meeting, me)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----- host controls


@router.post("/mute-all", response_model=dict[str, int])
def mute_all(db: DbSession, meeting: MeetingFromPath, me: ActingParticipant) -> dict[str, int]:
    return {"muted": participant_service.mute_all(db, meeting, me)}


@router.post("/{participant_id}/mute", response_model=ParticipantOut)
def mute_participant(
    db: DbSession, meeting: MeetingFromPath, me: ActingParticipant, participant_id: int
) -> ParticipantOut:
    return ParticipantOut.model_validate(participant_service.mute_participant(db, meeting, me, participant_id))


@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_participant(db: DbSession, meeting: MeetingFromPath, me: ActingParticipant, participant_id: int) -> Response:
    participant_service.remove_participant(db, meeting, me, participant_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
