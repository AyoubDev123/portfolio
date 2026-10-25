from unittest.mock import patch

from conftest import SLUG
from fastapi.testclient import TestClient

PAYLOAD = {
    "name": "Camille Dupont",
    "email": "camille@example.com",
    "subject": "Proposition",
    "message": "Bonjour Ayoub, votre profil nous intéresse beaucoup.",
}


def test_contact_stored_and_visible_to_admin(auth_client: TestClient):
    r = auth_client.post("/api/p/" + SLUG + "/contact", json=PAYLOAD)
    assert r.status_code == 201
    assert r.json() == {"ok": True}
    msgs = auth_client.get("/api/admin/messages").json()
    assert len(msgs) == 1
    assert msgs[0]["email"] == "camille@example.com"
    assert msgs[0]["is_read"] is False


def test_contact_triggers_email_task(client: TestClient):
    with patch("app.routers.contact.send_contact_email") as send:
        assert client.post("/api/p/" + SLUG + "/contact", json=PAYLOAD).status_code == 201
    send.assert_called_once()
    assert send.call_args.kwargs["email"] == "camille@example.com"


def test_honeypot_is_silently_dropped(auth_client: TestClient):
    r = auth_client.post("/api/p/" + SLUG + "/contact", json={**PAYLOAD, "website": "http://spam.example"})
    assert r.status_code == 201  # le bot ne doit pas savoir
    assert auth_client.get("/api/admin/messages").json() == []


def test_contact_validation(client: TestClient):
    assert client.post("/api/p/" + SLUG + "/contact", json={**PAYLOAD, "email": "pas-un-mail"}).status_code == 422
    assert client.post("/api/p/" + SLUG + "/contact", json={**PAYLOAD, "message": "court"}).status_code == 422
    assert client.post("/api/p/" + SLUG + "/contact", json={**PAYLOAD, "subject": "a\r\nBcc: x@y.z"}).status_code == 422


def test_contact_rate_limit(client: TestClient):
    codes = [client.post("/api/p/" + SLUG + "/contact", json=PAYLOAD).status_code for _ in range(5)]
    assert codes == [201, 201, 201, 429, 429]  # limite = 3 dans la fixture settings
