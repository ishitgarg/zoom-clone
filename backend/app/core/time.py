"""Time helpers. All timestamps are handled as timezone-aware UTC inside the app."""

from datetime import UTC, datetime

from sqlalchemy.types import DateTime, TypeDecorator


def utcnow() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator):
    """Stores datetimes as naive UTC in SQLite and returns timezone-aware UTC datetimes.

    SQLite has no native timezone support, so we normalise everything to UTC on the
    way in and re-attach the UTC tzinfo on the way out.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Naive datetimes are not allowed; pass a timezone-aware value")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect):
        if value is None:
            return None
        return value.replace(tzinfo=UTC)
