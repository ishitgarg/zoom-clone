from fastapi import APIRouter, Response, status

from app.api.deps import BearerToken, DbSession
from app.schemas.auth import AuthResponse, LoginRequest, SignupRequest
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def sign_up(db: DbSession, body: SignupRequest) -> AuthResponse:
    user, token, session = auth_service.sign_up(db, body)
    return AuthResponse(user=UserOut.model_validate(user), token=token, expires_at=session.expires_at)


@router.post("/login", response_model=AuthResponse)
def sign_in(db: DbSession, body: LoginRequest) -> AuthResponse:
    user, token, session = auth_service.sign_in(db, body)
    return AuthResponse(user=UserOut.model_validate(user), token=token, expires_at=session.expires_at)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def sign_out(db: DbSession, token: BearerToken) -> Response:
    if token:
        auth_service.sign_out(db, token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
