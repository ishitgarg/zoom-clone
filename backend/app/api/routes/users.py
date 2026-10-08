from fastapi import APIRouter

from app.api.deps import CurrentUser, SignedInUser
from app.schemas.user import CurrentUserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=CurrentUserOut)
def get_me(user: CurrentUser, signed_in: SignedInUser) -> CurrentUserOut:
    return CurrentUserOut(id=user.id, name=user.name, email=user.email, is_authenticated=signed_in is not None)
