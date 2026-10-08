from app.schemas.common import ResponseModel


class UserOut(ResponseModel):
    id: int
    name: str
    email: str


class CurrentUserOut(UserOut):
    # False when nobody has signed in and the app is using the default demo user.
    is_authenticated: bool


class HostOut(ResponseModel):
    id: int
    name: str
