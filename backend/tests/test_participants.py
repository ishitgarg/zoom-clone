from datetime import timedelta

from app.core.time import utcnow
from app.database.session import SessionLocal
from app.models import Participant
from tests.conftest import join


def test_join_by_meeting_id_and_invite_link(client, instant_meeting):
    participant, _ = join(client, instant_meeting["meeting_id"], "Priya")
    assert participant["role"] == "attendee"
    assert participant["is_active"] is True
    # Formatted IDs are accepted too.
    code = instant_meeting["meeting_id"]
    participant, _ = join(client, f"{code[:3]} {code[3:6]} {code[6:]}", "Daniel")
    assert participant["display_name"] == "Daniel"


def test_join_requires_display_name(client, instant_meeting):
    for name in ["", "   "]:
        response = client.post(
            f"/api/meetings/{instant_meeting['meeting_id']}/participants", json={"display_name": name}
        )
        assert response.status_code == 422
        assert response.json()["detail"] == "Please enter your name"
    response = client.post(
        f"/api/meetings/{instant_meeting['meeting_id']}/participants", json={"display_name": "x" * 51}
    )
    assert response.status_code == 422


def test_join_unknown_meeting_is_rejected(client):
    response = client.post("/api/meetings/9999999999/participants", json={"display_name": "Bo"})
    assert response.status_code == 404


def test_host_role_and_participant_list(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    host, _ = join(client, code, "Alex Morgan", as_host=True)
    join(client, code, "Guest One", is_muted=True, is_video_on=False)
    assert host["role"] == "host"
    roster = client.get(f"/api/meetings/{code}/participants").json()
    assert [p["display_name"] for p in roster] == ["Alex Morgan", "Guest One"]
    assert roster[1]["is_muted"] is True and roster[1]["is_video_on"] is False
    assert client.get(f"/api/meetings/{code}").json()["active_participant_count"] == 2


def test_update_own_state_and_heartbeat(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    _, headers = join(client, code, "Sam")
    response = client.patch(
        f"/api/meetings/{code}/participants/me", json={"is_muted": True, "hand_raised": True}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["is_muted"] is True and response.json()["hand_raised"] is True

    beat = client.post(f"/api/meetings/{code}/participants/me/heartbeat", headers=headers).json()
    assert beat["meeting_status"] == "live"
    assert beat["participant"]["display_name"] == "Sam"
    assert len(beat["participants"]) == 1


def test_invalid_reaction_and_empty_update_rejected(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    _, headers = join(client, code, "Sam")
    assert (
        client.patch(f"/api/meetings/{code}/participants/me", json={"reaction": "💣"}, headers=headers).status_code
        == 422
    )
    assert client.patch(f"/api/meetings/{code}/participants/me", json={}, headers=headers).status_code == 422


def test_actions_require_valid_token(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    join(client, code, "Sam")
    for headers in [{}, {"X-Participant-Token": "nope"}]:
        response = client.patch(f"/api/meetings/{code}/participants/me", json={"is_muted": True}, headers=headers)
        assert response.status_code == 401


def test_token_is_scoped_to_its_meeting(client):
    a = client.post("/api/meetings/instant").json()["meeting_id"]
    b = client.post("/api/meetings/instant").json()["meeting_id"]
    _, headers = join(client, a, "Sam")
    assert client.post(f"/api/meetings/{b}/participants/me/heartbeat", headers=headers).status_code == 401


def test_last_person_leaving_ends_meeting(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    _, headers = join(client, code, "Sam")
    assert client.post(f"/api/meetings/{code}/participants/me/leave", headers=headers).status_code == 204
    meeting = client.get(f"/api/meetings/{code}").json()
    assert meeting["status"] == "ended" and meeting["ended_at"] is not None
    # Leaving twice is harmless.
    assert client.post(f"/api/meetings/{code}/participants/me/leave", headers=headers).status_code == 204


def test_host_leaving_hands_host_role_to_next_participant(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    _, host_headers = join(client, code, "Alex", as_host=True)
    join(client, code, "Priya")
    client.post(f"/api/meetings/{code}/participants/me/leave", headers=host_headers)
    roster = client.get(f"/api/meetings/{code}/participants").json()
    assert [(p["display_name"], p["role"]) for p in roster] == [("Priya", "host")]


def test_host_controls(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    _, host_headers = join(client, code, "Alex", as_host=True)
    guest, guest_headers = join(client, code, "Guest")
    other, _ = join(client, code, "Other")

    # Attendees can't use host controls.
    assert client.post(f"/api/meetings/{code}/participants/mute-all", headers=guest_headers).status_code == 403
    assert client.delete(f"/api/meetings/{code}/participants/{other['id']}", headers=guest_headers).status_code == 403

    assert client.post(f"/api/meetings/{code}/participants/mute-all", headers=host_headers).json() == {"muted": 2}
    roster = client.get(f"/api/meetings/{code}/participants").json()
    assert {p["display_name"]: p["is_muted"] for p in roster} == {"Alex": False, "Guest": True, "Other": True}

    assert client.delete(f"/api/meetings/{code}/participants/{guest['id']}", headers=host_headers).status_code == 204
    beat = client.post(f"/api/meetings/{code}/participants/me/heartbeat", headers=guest_headers).json()
    assert beat["participant"]["left_reason"] == "removed"
    # A removed participant can no longer act.
    assert (
        client.patch(
            f"/api/meetings/{code}/participants/me", json={"is_muted": False}, headers=guest_headers
        ).status_code
        == 410
    )


def test_host_ends_meeting_for_all(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    _, host_headers = join(client, code, "Alex", as_host=True)
    _, guest_headers = join(client, code, "Guest")
    assert client.post(f"/api/meetings/{code}/end", headers=guest_headers).status_code == 403
    assert client.post(f"/api/meetings/{code}/end", headers=host_headers).status_code == 204
    beat = client.post(f"/api/meetings/{code}/participants/me/heartbeat", headers=guest_headers).json()
    assert beat["meeting_status"] == "ended"
    assert beat["participant"]["left_reason"] == "meeting_ended"


def test_stale_participants_time_out(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    stale, _ = join(client, code, "Ghost")
    _, headers = join(client, code, "Alive")
    with SessionLocal() as db:
        db.get(Participant, stale["id"]).last_seen_at = utcnow() - timedelta(minutes=5)
        db.commit()
    roster = client.post(f"/api/meetings/{code}/participants/me/heartbeat", headers=headers).json()["participants"]
    assert [p["display_name"] for p in roster] == ["Alive"]


def test_chat(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    _, alice = join(client, code, "Alice")
    _, bob = join(client, code, "Bob")
    sent = client.post(f"/api/meetings/{code}/messages", json={"body": "Hello!"}, headers=alice)
    assert sent.status_code == 201
    assert client.post(f"/api/meetings/{code}/messages", json={"body": "   "}, headers=alice).status_code == 422
    messages = client.get(f"/api/meetings/{code}/messages", headers=bob).json()
    assert [(m["sender_name"], m["body"]) for m in messages] == [("Alice", "Hello!")]
    assert client.get(f"/api/meetings/{code}/messages?after_id={sent.json()['id']}", headers=bob).json() == []
    assert client.get(f"/api/meetings/{code}/messages").status_code == 401


def test_owner_reclaims_host_role_on_rejoin(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    _, host_headers = join(client, code, "Alex", as_host=True)
    join(client, code, "Priya")
    client.post(f"/api/meetings/{code}/participants/me/leave", headers=host_headers)
    join(client, code, "Alex", as_host=True)
    roles = {p["display_name"]: p["role"] for p in client.get(f"/api/meetings/{code}/participants").json()}
    assert roles == {"Priya": "attendee", "Alex": "host"}
