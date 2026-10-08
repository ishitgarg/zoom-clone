"""Meeting ID generation and parsing.

Meeting IDs are 10-digit numbers (like Zoom's) generated with a CSPRNG on the server.
"""

import re
import secrets

MEETING_CODE_LENGTH = 10
_MEETING_CODE_PATTERN = re.compile(r"^\d{9,11}$")
_INVITE_PATH_PATTERN = re.compile(r"/meeting/([\d\s-]+)")


def generate_meeting_code() -> str:
    """Return a random 10-digit numeric string that never starts with 0."""
    lowest = 10 ** (MEETING_CODE_LENGTH - 1)
    return str(lowest + secrets.randbelow(9 * lowest))


def normalize_meeting_code(raw: str) -> str | None:
    """Accept a meeting ID (optionally formatted as '123 456 7890' / '123-456-7890') or an
    invite link containing '/meeting/<id>', and return the bare digits.

    Returns None when the input cannot be a valid meeting ID.
    """
    if not raw:
        return None
    candidate = raw.strip()
    link_match = _INVITE_PATH_PATTERN.search(candidate)
    if link_match:
        candidate = link_match.group(1)
    candidate = re.sub(r"[\s-]", "", candidate)
    return candidate if _MEETING_CODE_PATTERN.match(candidate) else None
