"""Application configuration loaded from environment variables (or a local .env file)."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Zoom Clone API"
    environment: str = "development"

    # SQLite file location. Use an absolute path on hosts with a persistent disk,
    # e.g. sqlite:////var/data/zoom_clone.db
    database_url: str = "sqlite:///./zoom_clone.db"

    # Public URL of the Next.js app. Used to build shareable invite links.
    frontend_url: str = "http://localhost:3000"

    # Comma separated list of origins allowed to call the API from a browser.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Seed sample data on startup when the database has no meetings (useful on
    # hosts with an ephemeral filesystem).
    seed_on_startup: bool = False

    # The assignment assumes a single logged-in user; this is that user's identity.
    default_user_name: str = "Alex Morgan"
    default_user_email: str = "alex.morgan@example.com"
    # Password for the default and seeded demo accounts, so they can also be used on the Sign In page.
    demo_password: str = "zoomdemo123"

    # How long a sign-in lasts.
    auth_session_days: int = 30

    # A participant that has not sent a heartbeat for this long is considered gone.
    participant_timeout_seconds: int = 20

    @field_validator("frontend_url")
    @classmethod
    def strip_trailing_slash(cls, value: str) -> str:
        return value.rstrip("/")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
