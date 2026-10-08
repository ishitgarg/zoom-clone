from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models import User


def ensure_default_user(db: Session) -> User:
    """Return the assignment's 'always logged in' user, creating it on first run."""
    settings = get_settings()
    user = db.scalar(select(User).where(User.email == settings.default_user_email))
    if user is None:
        user = User(
            name=settings.default_user_name,
            email=settings.default_user_email,
            password_hash=hash_password(settings.demo_password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
