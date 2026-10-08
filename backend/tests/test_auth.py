from datetime import timedelta

from app.core.security import hash_password, verify_password
from app.core.time import utcnow
from app.database.session import SessionLocal
from app.models import AuthSession
from tests.conftest import join

SIGNUP = {"name": "Riya Kapoor", "email": "Riya@Example.com ", "password": "secret123"}


def _signup(client, **overrides):
    return client.post("/api/auth/signup", json={**SIGNUP, **overrides})


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_password_hashing():
    stored = hash_password("secret123", iterations=1000)
    assert stored.startswith("pbkdf2_sha256$1000$")
    assert "secret123" not in stored
    assert verify_password("secret123", stored)
    assert not verify_password("wrong", stored)
    assert not verify_password("secret123", None)
    assert not verify_password("secret123", "garbage")


def test_without_sign_in_the_default_user_is_used(client):
    me = client.get("/api/users/me").json()
    assert me["name"] == "Alex Morgan" and me["is_authenticated"] is False


def test_signup_signs_in_and_normalizes_email(client):
    response = _signup(client)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["user"]["email"] == "riya@example.com"
    me = client.get("/api/users/me", headers=_auth(body["token"])).json()
    assert me == {**body["user"], "is_authenticated": True}


def test_signup_validation(client):
    cases = [
        ({"name": "  "}, "name"),
        ({"email": "not-an-email"}, "valid email"),
        ({"password": "short1"}, "at least 8"),
        ({"password": "lettersonly"}, "letter and one number"),
    ]
    for override, expected in cases:
        response = _signup(client, **override)
        assert response.status_code == 422
        assert expected in response.json()["detail"], response.json()


def test_duplicate_email_rejected(client):
    _signup(client)
    response = _signup(client, email="riya@example.com")
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_login_and_logout(client):
    _signup(client)
    bad = client.post("/api/auth/login", json={"email": "riya@example.com", "password": "nope12345"})
    assert bad.status_code == 401 and bad.json()["detail"] == "Incorrect email or password."
    unknown = client.post("/api/auth/login", json={"email": "who@example.com", "password": "secret123"})
    assert unknown.status_code == 401 and unknown.json()["detail"] == "Incorrect email or password."

    token = client.post("/api/auth/login", json={"email": " RIYA@example.com", "password": "secret123"}).json()["token"]
    assert client.get("/api/users/me", headers=_auth(token)).json()["is_authenticated"] is True
    assert client.post("/api/auth/logout", headers=_auth(token)).status_code == 204
    assert client.get("/api/users/me", headers=_auth(token)).status_code == 401


def test_default_user_can_sign_in_with_demo_password(client):
    response = client.post("/api/auth/login", json={"email": "alex.morgan@example.com", "password": "zoomdemo123"})
    assert response.status_code == 200


def test_invalid_or_expired_token_is_rejected(client):
    assert client.get("/api/users/me", headers=_auth("bogus")).status_code == 401
    assert client.get("/api/users/me", headers={"Authorization": "Basic abc"}).status_code == 401
    token = _signup(client).json()["token"]
    with SessionLocal() as db:
        session = db.query(AuthSession).one()
        session.expires_at = utcnow() - timedelta(minutes=1)
        db.commit()
    response = client.get("/api/users/me", headers=_auth(token))
    assert response.status_code == 401 and response.json()["code"] == "invalid_auth_token"


def test_signed_in_users_have_their_own_meetings(client):
    token = _signup(client).json()["token"]
    mine = client.post("/api/meetings/instant", headers=_auth(token)).json()
    assert mine["host"]["name"] == "Riya Kapoor"
    assert mine["title"] == "Riya Kapoor's Zoom Meeting"
    # The default user doesn't see Riya's meeting, Riya does.
    assert mine["meeting_id"] not in [m["meeting_id"] for m in client.get("/api/meetings/recent").json()]
    assert [m["meeting_id"] for m in client.get("/api/meetings/recent", headers=_auth(token)).json()] == [
        mine["meeting_id"]
    ]
    # Only the owner can start it as host.
    denied = client.post(
        f"/api/meetings/{mine['meeting_id']}/participants", json={"display_name": "Alex", "as_host": True}
    )
    assert denied.status_code == 403


def test_signed_in_attendee_gets_meeting_in_recent(client):
    hosted = client.post("/api/meetings/instant").json()  # hosted by the default user
    token = _signup(client).json()["token"]
    response = client.post(
        f"/api/meetings/{hosted['meeting_id']}/participants", json={"display_name": "Riya"}, headers=_auth(token)
    )
    assert response.status_code == 201
    recent = client.get("/api/meetings/recent", headers=_auth(token)).json()
    assert [m["meeting_id"] for m in recent] == [hosted["meeting_id"]]
    # A guest (no sign-in) is not linked to any account.
    join(client, hosted["meeting_id"], "Guest")
