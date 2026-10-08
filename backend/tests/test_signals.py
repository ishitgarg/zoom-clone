import json

from tests.conftest import join


def test_signals_are_relayed_only_to_recipient(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    alice, alice_headers = join(client, code, "Alice")
    bob, bob_headers = join(client, code, "Bob")

    payload = json.dumps({"type": "offer", "sdp": "v=0"})
    sent = client.post(
        f"/api/meetings/{code}/signals",
        json={"recipient_id": bob["id"], "kind": "offer", "payload": payload},
        headers=alice_headers,
    )
    assert sent.status_code == 201

    assert client.get(f"/api/meetings/{code}/signals", headers=alice_headers).json() == []
    received = client.get(f"/api/meetings/{code}/signals", headers=bob_headers).json()
    assert [(s["sender_id"], s["kind"], s["payload"]) for s in received] == [(alice["id"], "offer", payload)]
    # Acknowledged signals are pruned and not returned again.
    after = received[-1]["id"]
    assert client.get(f"/api/meetings/{code}/signals?after_id={after}", headers=bob_headers).json() == []


def test_signal_validation(client, instant_meeting):
    code = instant_meeting["meeting_id"]
    _, headers = join(client, code, "Alice")
    bob, _ = join(client, code, "Bob")
    bad_kind = {"recipient_id": bob["id"], "kind": "hack", "payload": "{}"}
    bad_json = {"recipient_id": bob["id"], "kind": "offer", "payload": "not json"}
    missing = {"recipient_id": 999, "kind": "offer", "payload": "{}"}
    assert client.post(f"/api/meetings/{code}/signals", json=bad_kind, headers=headers).status_code == 422
    assert client.post(f"/api/meetings/{code}/signals", json=bad_json, headers=headers).status_code == 422
    assert client.post(f"/api/meetings/{code}/signals", json=missing, headers=headers).status_code == 404
