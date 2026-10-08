from datetime import UTC, datetime, timedelta

from app.core.meeting_codes import normalize_meeting_code
from tests.conftest import join


def _future(**delta) -> str:
    return (datetime.now(UTC) + timedelta(**delta)).isoformat()


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_current_user_is_default_user(client):
    me = client.get("/api/users/me").json()
    assert me["name"] == "Alex Morgan"


def test_instant_meeting_is_created_live_with_invite_link(client):
    response = client.post("/api/meetings/instant")
    assert response.status_code == 201
    meeting = response.json()
    assert len(meeting["meeting_id"]) == 10 and meeting["meeting_id"].isdigit()
    assert meeting["status"] == "live"
    assert meeting["meeting_type"] == "instant"
    assert meeting["title"] == "Alex Morgan's Zoom Meeting"
    assert meeting["invite_url"] == f"http://testserver-frontend/meeting/{meeting['meeting_id']}"
    # The meeting is persisted and can be fetched back.
    assert client.get(f"/api/meetings/{meeting['meeting_id']}").json()["meeting_id"] == meeting["meeting_id"]


def test_meeting_ids_are_unique(client):
    ids = {client.post("/api/meetings/instant").json()["meeting_id"] for _ in range(30)}
    assert len(ids) == 30


def test_code_collision_is_retried(client, monkeypatch):
    first = client.post("/api/meetings/instant").json()["meeting_id"]
    codes = iter([first, first, "5550001112"])
    monkeypatch.setattr("app.services.meeting_service.generate_meeting_code", lambda: next(codes))
    assert client.post("/api/meetings/instant").json()["meeting_id"] == "5550001112"


def test_unknown_meeting_returns_404_with_friendly_message(client):
    response = client.get("/api/meetings/1234567890")
    assert response.status_code == 404
    assert response.json()["detail"] == "Meeting not found. Please check the meeting ID and try again."


def test_malformed_meeting_id_is_rejected(client):
    for bad in ["abc", "12", "123456789012345"]:
        assert client.get(f"/api/meetings/{bad}").status_code == 422


def test_meeting_id_normalisation():
    assert normalize_meeting_code("812 345 6789") == "8123456789"
    assert normalize_meeting_code("812-345-6789") == "8123456789"
    assert normalize_meeting_code("https://zoom.example.com/meeting/8123456789?x=1") == "8123456789"
    assert normalize_meeting_code("hello") is None


def test_schedule_meeting_and_list_upcoming(client):
    response = client.post(
        "/api/meetings",
        json={
            "title": "  Design   Review ",
            "description": "Agenda",
            "start_time": _future(days=1),
            "duration_minutes": 45,
        },
    )
    assert response.status_code == 201, response.text
    meeting = response.json()
    assert meeting["title"] == "Design Review"
    assert meeting["status"] == "scheduled"
    assert meeting["scheduled_start"].endswith("Z") or "+00:00" in meeting["scheduled_start"]
    assert meeting["invite_url"].endswith(meeting["meeting_id"])

    upcoming = client.get("/api/meetings/upcoming").json()
    assert [m["meeting_id"] for m in upcoming] == [meeting["meeting_id"]]


def test_upcoming_is_sorted_and_excludes_finished(client):
    later = client.post(
        "/api/meetings", json={"title": "Later", "start_time": _future(days=3), "duration_minutes": 30}
    ).json()
    sooner = client.post(
        "/api/meetings", json={"title": "Sooner", "start_time": _future(hours=1), "duration_minutes": 30}
    ).json()
    ids = [m["meeting_id"] for m in client.get("/api/meetings/upcoming").json()]
    assert ids == [sooner["meeting_id"], later["meeting_id"]]


def test_schedule_validation_errors(client):
    cases = [
        ({"title": "", "start_time": _future(days=1), "duration_minutes": 30}, "topic"),
        ({"title": "X", "start_time": _future(days=-1), "duration_minutes": 30}, "future"),
        ({"title": "X", "start_time": "2030-01-01T10:00:00", "duration_minutes": 30}, "timezone"),
        ({"title": "X", "start_time": _future(days=1), "duration_minutes": 5}, "Duration"),
        ({"title": "X", "start_time": _future(days=1), "duration_minutes": 30, "extra": 1}, "Extra"),
        ({"title": "X" * 201, "start_time": _future(days=1), "duration_minutes": 30}, "Title"),
    ]
    for payload, expected in cases:
        response = client.post("/api/meetings", json=payload)
        assert response.status_code == 422, payload
        assert expected.lower() in response.json()["detail"].lower(), response.json()


def test_cancel_scheduled_meeting(client):
    meeting = client.post(
        "/api/meetings", json={"title": "Temp", "start_time": _future(days=1), "duration_minutes": 30}
    ).json()
    assert client.delete(f"/api/meetings/{meeting['meeting_id']}").status_code == 204
    assert client.get("/api/meetings/upcoming").json() == []
    # A cancelled meeting can't be joined.
    response = client.post(f"/api/meetings/{meeting['meeting_id']}/participants", json={"display_name": "Bo"})
    assert response.status_code == 410


def test_recent_meetings_include_started_meetings_newest_first(client):
    first = client.post("/api/meetings/instant").json()
    second = client.post("/api/meetings/instant").json()
    scheduled = client.post(
        "/api/meetings", json={"title": "Not yet", "start_time": _future(days=1), "duration_minutes": 30}
    ).json()
    recent_ids = [m["meeting_id"] for m in client.get("/api/meetings/recent").json()]
    assert recent_ids[:2] == [second["meeting_id"], first["meeting_id"]]
    assert scheduled["meeting_id"] not in recent_ids


def test_joining_scheduled_meeting_makes_it_live_and_recent(client):
    meeting = client.post(
        "/api/meetings", json={"title": "Kickoff", "start_time": _future(hours=1), "duration_minutes": 30}
    ).json()
    join(client, meeting["meeting_id"], "Alex Morgan", as_host=True)
    assert client.get(f"/api/meetings/{meeting['meeting_id']}").json()["status"] == "live"
    assert meeting["meeting_id"] in [m["meeting_id"] for m in client.get("/api/meetings/recent").json()]
