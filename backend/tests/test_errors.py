from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.main import app


def test_database_errors_return_safe_500(client, monkeypatch, caplog):
    def broken(*_args, **_kwargs):
        raise OperationalError("SELECT 1", {}, Exception("disk I/O error"))

    monkeypatch.setattr("app.services.meeting_service.list_upcoming_meetings", broken)
    with TestClient(app, raise_server_exceptions=False) as safe_client:
        response = safe_client.get("/api/meetings/upcoming")
    assert response.status_code == 500
    assert response.json() == {"detail": "A database error occurred. Please try again.", "code": "database_error"}
    assert "disk I/O error" not in response.text  # internals are logged, not leaked
    assert any("Database error" in record.message for record in caplog.records)


def test_unexpected_errors_return_safe_500(client, monkeypatch):
    def broken(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("app.services.meeting_service.list_recent_meetings", broken)
    with TestClient(app, raise_server_exceptions=False) as safe_client:
        response = safe_client.get("/api/meetings/recent")
    assert response.status_code == 500
    assert "boom" not in response.text
