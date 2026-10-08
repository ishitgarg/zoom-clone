import os
import tempfile

import pytest

# Point the app at a throwaway database *before* the app modules are imported.
_tmp_dir = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_dir}/test.db"
os.environ["FRONTEND_URL"] = "http://testserver-frontend"
os.environ["SEED_ON_STARTUP"] = "false"

from fastapi.testclient import TestClient  # noqa: E402

from app.database.base import Base  # noqa: E402
from app.database.session import engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as test_client:  # runs the lifespan (creates tables + default user)
        yield test_client


@pytest.fixture()
def instant_meeting(client):
    return client.post("/api/meetings/instant").json()


def join(client, meeting_id: str, name: str = "Guest", **extra):
    response = client.post(f"/api/meetings/{meeting_id}/participants", json={"display_name": name, **extra})
    assert response.status_code == 201, response.text
    body = response.json()
    return body["participant"], {"X-Participant-Token": body["session_token"]}
