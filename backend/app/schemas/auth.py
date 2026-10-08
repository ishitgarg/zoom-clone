import re
from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import ApiModel, ResponseModel, SingleLineText
from app.schemas.user import UserOut

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


def _normalize_email(value: str) -> str:
    value = value.strip().lower()
    if not _EMAIL_PATTERN.match(value):
        raise ValueError("Please enter a valid email address")
    return value


class SignupRequest(ApiModel):
    name: SingleLineText = Field(max_length=80)
    email: str = Field(max_length=255)
    password: str = Field(max_length=128)

    @field_validator("name")
    @classmethod
    def name_required(cls, value: str) -> str:
        if not value:
            raise ValueError("Please enter your name")
        return value

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        return _normalize_email(value)

    @field_validator("password")
    @classmethod
    def strong_enough(cls, value: str) -> str:
        if len(value) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
        if not (re.search(r"[A-Za-z]", value) and re.search(r"\d", value)):
            raise ValueError("Password must contain at least one letter and one number")
        return value


class LoginRequest(ApiModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=128)

    @field_validator("email")
    @classmethod
    def normalize(cls, value: str) -> str:
        return value.strip().lower()


class AuthResponse(ResponseModel):
    user: UserOut
    token: str
    expires_at: datetime
