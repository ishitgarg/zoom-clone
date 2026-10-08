from fastapi import APIRouter, Response, status

from app.api.deps import ActingParticipant, CurrentUser, DbSession, MeetingFromPath
from app.schemas.meeting import InstantMeetingCreate, MeetingOut, ScheduledMeetingCreate
from app.services import meeting_service, participant_service

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("/instant", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def create_instant_meeting(db: DbSession, user: CurrentUser, body: InstantMeetingCreate | None = None) -> MeetingOut:
    meeting = meeting_service.create_instant_meeting(db, user, body or InstantMeetingCreate())
    return meeting_service.to_meeting_out(db, meeting)


@router.post("", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
def schedule_meeting(db: DbSession, user: CurrentUser, body: ScheduledMeetingCreate) -> MeetingOut:
    meeting = meeting_service.create_scheduled_meeting(db, user, body)
    return meeting_service.to_meeting_out(db, meeting)


@router.get("/upcoming", response_model=list[MeetingOut])
def list_upcoming(db: DbSession, user: CurrentUser) -> list[MeetingOut]:
    return meeting_service.to_meeting_out_list(db, meeting_service.list_upcoming_meetings(db, user))


@router.get("/recent", response_model=list[MeetingOut])
def list_recent(db: DbSession, user: CurrentUser) -> list[MeetingOut]:
    return meeting_service.to_meeting_out_list(db, meeting_service.list_recent_meetings(db, user))


@router.get("/{meeting_id}", response_model=MeetingOut)
def get_meeting(db: DbSession, meeting: MeetingFromPath) -> MeetingOut:
    """Validate that a meeting exists (used before showing the join screen)."""
    return meeting_service.to_meeting_out(db, meeting)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(db: DbSession, user: CurrentUser, meeting: MeetingFromPath) -> Response:
    """Cancel a scheduled meeting that hasn't started (soft delete: status -> cancelled)."""
    meeting_service.cancel_meeting(db, user, meeting)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{meeting_id}/end", status_code=status.HTTP_204_NO_CONTENT)
def end_meeting(db: DbSession, meeting: MeetingFromPath, actor: ActingParticipant) -> Response:
    """Host only: end the meeting for everyone."""
    participant_service.end_meeting_for_all(db, meeting, actor)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
