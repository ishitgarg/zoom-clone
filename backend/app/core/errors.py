"""Domain errors raised by the service layer and translated to HTTP responses in main.py.

Services never import FastAPI; they raise these errors and the API layer decides the status code.
"""


class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class InvalidInputError(AppError):
    status_code = 422
    code = "invalid_input"


class PermissionDeniedError(AppError):
    status_code = 403
    code = "forbidden"


class InvalidTokenError(AppError):
    status_code = 401
    code = "invalid_participant_token"


class AuthenticationError(AppError):
    status_code = 401
    code = "authentication_failed"


class InvalidAuthTokenError(AppError):
    """The Authorization header was sent but is invalid or expired."""

    status_code = 401
    code = "invalid_auth_token"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class MeetingUnavailableError(AppError):
    status_code = 410
    code = "meeting_unavailable"


MEETING_NOT_FOUND_MESSAGE = "Meeting not found. Please check the meeting ID and try again."
