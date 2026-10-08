"""Sign up, sign in and sign out. Signing in is optional: without it the default user is used."""

from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AuthenticationError, ConflictError, InvalidAuthTokenError
from app.core.security import generate_session_token, hash_password, hash_token, verify_password
from app.core.time import utcnow
from app.models import AuthSession, User
from app.schemas.auth import LoginRequest, SignupRequest

EMAIL_TAKEN_MESSAGE = "An account with this email already exists. Please sign in instead."
BAD_CREDENTIALS_MESSAGE = "Incorrect email or password."


def _start_session(db: Session, user: User) -> tuple[str, AuthSession]:
    token = generate_session_token()
    session = AuthSession(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=utcnow() + timedelta(days=get_settings().auth_session_days),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return token, session


def sign_up(db: Session, data: SignupRequest) -> tuple[User, str, AuthSession]:
    if db.scalar(select(User.id).where(User.email == data.email)) is not None:
        raise ConflictError(EMAIL_TAKEN_MESSAGE)
    user = User(name=data.name, email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:  # two sign-ups with the same email at the same moment
        db.rollback()
        raise ConflictError(EMAIL_TAKEN_MESSAGE) from exc
    db.refresh(user)
    token, session = _start_session(db, user)
    return user, token, session


def sign_in(db: Session, data: LoginRequest) -> tuple[User, str, AuthSession]:
    user = db.scalar(select(User).where(User.email == data.email))
    # Same message whether the email or the password is wrong, so emails can't be probed.
    if user is None or not verify_password(data.password, user.password_hash):
        raise AuthenticationError(BAD_CREDENTIALS_MESSAGE)
    token, session = _start_session(db, user)
    return user, token, session


def user_for_token(db: Session, token: str) -> User:
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    if session is None or session.expires_at <= utcnow():
        raise InvalidAuthTokenError("Your session has expired. Please sign in again.")
    user = db.get(User, session.user_id)
    if user is None:
        raise InvalidAuthTokenError("Your session has expired. Please sign in again.")
    return user


def sign_out(db: Session, token: str) -> None:
    db.execute(delete(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    db.commit()
