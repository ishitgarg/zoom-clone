"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends, Header, Path
from sqlalchemy.orm import Session

from app.core.errors import InvalidAuthTokenError
from app.database.session import get_db
from app.models import Meeting, Participant, User
from app.services import auth_service, meeting_service, participant_service, user_service

DbSession = Annotated[Session, Depends(get_db)]


def get_bearer_token(authorization: Annotated[str | None, Header(max_length=512)] = None) -> str | None:
    """The token from an `Authorization: Bearer <token>` header, if one was sent."""
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise InvalidAuthTokenError("Your session has expired. Please sign in again.")
    return token.strip()


BearerToken = Annotated[str | None, Depends(get_bearer_token)]


def get_signed_in_user(db: DbSession, token: BearerToken) -> User | None:
    """The user who signed in, or None if no sign-in token was sent."""
    return auth_service.user_for_token(db, token) if token else None


SignedInUser = Annotated[User | None, Depends(get_signed_in_user)]


def get_current_user(db: DbSession, signed_in: SignedInUser) -> User:
    # The brief says to assume a logged-in user, so without a sign-in we use the default user.
    return signed_in or user_service.ensure_default_user(db)


def get_meeting(db: DbSession, meeting_id: Annotated[str, Path(max_length=64)]) -> Meeting:
    """Resolve and validate the {meeting_id} path parameter (404 / 422 on bad input)."""
    return meeting_service.get_meeting_by_code(db, meeting_id)


CurrentUser = Annotated[User, Depends(get_current_user)]
MeetingFromPath = Annotated[Meeting, Depends(get_meeting)]


def get_acting_participant(
    db: DbSession,
    meeting: MeetingFromPath,
    x_participant_token: Annotated[str | None, Header(max_length=128)] = None,
) -> Participant:
    """The participant making the request, proven by the X-Participant-Token header."""
    return participant_service.authenticate_participant(db, meeting, x_participant_token)


ActingParticipant = Annotated[Participant, Depends(get_acting_participant)]
