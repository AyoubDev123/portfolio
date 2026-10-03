from unittest.mock import patch

PAYLOAD = {
    "name": "Camille Dupont",
    "email": "camille@example.com",
    "subject": "Proposition",
    "message": "Bonjour Ayoub, votre profil nous intéresse beaucoup.",
}


def test_contact_stored_and_visible_to_admin(client, auth_headers):
    r = client.post("/api/contact", json=PAYLOAD)
    assert r.status_code == 201
    assert r.json() == {"ok": True}
    msgs = client.get("/api/admin/messages", headers=auth_headers).json()
    assert len(msgs) == 1 and msgs[0]["email"] == "camille@example.com"


def test_contact_triggers_email_task(client):
    with patch("app.routers.contact.send_contact_email") as send:
        assert client.post("/api/contact", json=PAYLOAD).status_code == 201
    send.assert_called_once()
    assert send.call_args.kwargs["email"] == "camille@example.com"


def test_honeypot_is_silently_dropped(client, auth_headers):
    r = client.post("/api/contact", json={**PAYLOAD, "website": "http://spam.example"})
    assert r.status_code == 201  # le bot ne doit pas savoir
    assert client.get("/api/admin/messages", headers=auth_headers).json() == []


def test_contact_validation(client):
    assert client.post("/api/contact", json={**PAYLOAD, "email": "pas-un-mail"}).status_code == 422
    assert client.post("/api/contact", json={**PAYLOAD, "message": "court"}).status_code == 422
    assert client.post("/api/contact", json={**PAYLOAD, "subject": "a\r\nBcc: x@y.z"}).status_code == 422


def test_contact_rate_limit(client):
    codes = [client.post("/api/contact", json=PAYLOAD).status_code for _ in range(5)]
    assert codes == [201, 201, 201, 429, 429]  # limite = 3 dans la fixture settings
