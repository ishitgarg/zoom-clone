import re
import unicodedata
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict

_WHITESPACE = re.compile(r"\s+")


def _clean_text(value: str) -> str:
    """Collapse whitespace and reject control characters."""
    if any(unicodedata.category(ch) == "Cc" and ch not in "\n\t" for ch in value):
        raise ValueError("contains invalid characters")
    return value.strip()


def _clean_single_line(value: str) -> str:
    return _WHITESPACE.sub(" ", _clean_text(value))


def _display_name(value: str) -> str:
    value = _clean_single_line(value)
    if not value:
        raise ValueError("Please enter your name")
    if len(value) > 50:
        raise ValueError("Name must be 50 characters or fewer")
    return value


DisplayName = Annotated[str, AfterValidator(_display_name)]
SingleLineText = Annotated[str, AfterValidator(_clean_single_line)]
MultiLineText = Annotated[str, AfterValidator(_clean_text)]


class ApiModel(BaseModel):
    """Base for request bodies: unknown fields are rejected rather than silently ignored."""

    model_config = ConfigDict(extra="forbid")


class ResponseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
