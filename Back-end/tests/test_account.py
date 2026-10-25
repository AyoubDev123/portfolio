"""Vérification d'e-mail, mot de passe oublié, export et suppression (RGPD)."""

from fastapi.testclient import TestClient

from app.config import Settings
from app.security import create_purpose_token

NEW = {
    "username": "lea-marchand",
    "email": "lea@exemple.fr",
    "password": "motdepasse1",
    "first_name": "Léa",
    "last_name": "Marchand",
}


def _signup(client: TestClient) -> None:
    assert client.post("/api/auth/signup", json=NEW).status_code == 201


def _account_id(client: TestClient) -> int:
    from sqlalchemy import select

    from app import models

    username = client.get("/api/auth/me").json()["username"]
    with client.app.state.session_factory() as db:
        return db.scalars(select(models.User.id).where(models.User.username == username)).one()


def test_email_starts_unverified_and_can_be_confirmed(client: TestClient, settings: Settings):
    _signup(client)
    assert client.get("/api/auth/me").json()["email_verified"] is False

    token = create_purpose_token(_account_id(client), "verify", settings.secret_key, 60)
    assert client.post(f"/api/auth/verify/{token}").status_code == 200
    assert client.get("/api/auth/me").json()["email_verified"] is True


def test_verification_rejects_bad_token(client: TestClient, settings: Settings):
    _signup(client)
    assert client.post("/api/auth/verify/pas-un-jeton").status_code == 400
    # Un jeton valide mais pour un autre usage ne doit pas passer.
    wrong = create_purpose_token(1, "reset", settings.secret_key, 60)
    assert client.post(f"/api/auth/verify/{wrong}").status_code == 400


def test_forgot_password_never_reveals_whether_the_account_exists(client: TestClient):
    _signup(client)
    known = client.post("/api/auth/password/forgot", json={"email": NEW["email"]})
    unknown = client.post("/api/auth/password/forgot", json={"email": "personne@exemple.fr"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()


def test_reset_link_works_once(client: TestClient, settings: Settings):
    _signup(client)
    # Le jeton porte l'empreinte du mot de passe courant.
    from app import models

    with client.app.state.session_factory() as db:
        user = db.get(models.User, _account_id(client))
        token = create_purpose_token(user.id, "reset", settings.secret_key, 60, fingerprint=user.password_hash)

    first = client.post("/api/auth/password/reset", json={"token": token, "password": "nouveau-mdp-1"})
    assert first.status_code == 200
    # Rejouer le même lien échoue : l'empreinte a changé avec le mot de passe.
    again = client.post("/api/auth/password/reset", json={"token": token, "password": "encore-un-autre"})
    assert again.status_code == 400

    client.post("/api/auth/logout")
    assert (
        client.post("/api/auth/login", json={"username": NEW["username"], "password": "nouveau-mdp-1"}).status_code
        == 200
    )


def test_export_returns_everything_the_account_owns(client: TestClient):
    _signup(client)
    client.post("/api/admin/projects", json={"slug": "un-projet", "title": "Un projet"})
    data = client.get("/api/auth/export").json()
    assert data["compte"]["email"] == NEW["email"]
    assert [p["slug"] for p in data["portfolio"]["projects"]] == ["un-projet"]
    assert data["messages_recus"] == []


def test_account_deletion_requires_the_password_and_removes_the_content(client: TestClient):
    _signup(client)
    client.post("/api/admin/projects", json={"slug": "un-projet", "title": "Un projet"})

    assert client.post("/api/auth/account/delete", json={"password": "mauvais"}).status_code == 403
    assert client.post("/api/auth/account/delete", json={"password": NEW["password"]}).status_code == 204

    # Le compte et son contenu ont disparu.
    assert (
        client.post("/api/auth/login", json={"username": NEW["username"], "password": NEW["password"]}).status_code
        == 401
    )
    assert client.get(f"/api/p/{NEW['username']}").status_code == 404
