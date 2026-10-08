from app.database.session import SessionLocal
from app.seed.seed import seed_if_empty


def test_seed_populates_dashboard(client):
    with SessionLocal() as db:
        assert seed_if_empty(db) is True
        assert seed_if_empty(db) is False  # idempotent
    upcoming = client.get("/api/meetings/upcoming").json()
    recent = client.get("/api/meetings/recent").json()
    assert len(upcoming) == 5
    assert len(recent) == 5
    assert "Offsite Planning (cancelled)" not in [m["title"] for m in upcoming]
    # Includes a meeting hosted by someone else that the default user attended.
    assert any(m["host"]["name"] == "Priya Sharma" for m in recent)
