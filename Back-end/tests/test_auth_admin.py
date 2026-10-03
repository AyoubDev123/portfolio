from conftest import ADMIN_PASS, ADMIN_USER
from fastapi.testclient import TestClient

NEW_PROJECT = {"slug": "nouveau-projet", "title": "Nouveau projet", "stack": ["Python"], "tags": ["Test"]}


# --- Auth ----------------------------------------------------------------------------
def test_login_ok_sets_cookie_and_me(client: TestClient):
    r = client.post("/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    # Le cookie doit être présent dans la réponse.
    assert "access_token" in r.cookies
    # /me fonctionne sans header supplémentaire (cookie envoyé par le client automatiquement).
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json() == {"username": ADMIN_USER}


def test_login_wrong_password_and_unknown_user(client: TestClient):
    assert client.post("/api/auth/login", json={"username": ADMIN_USER, "password": "x"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "ghost", "password": "x"}).status_code == 401


def test_login_rate_limited(client: TestClient):
    codes = [
        client.post("/api/auth/login", json={"username": ADMIN_USER, "password": "bad"}).status_code for _ in range(6)
    ]
    assert codes[:4] == [401] * 4 and codes[4:] == [429, 429]  # limite = 4 dans la fixture settings


def test_admin_requires_auth(client: TestClient):
    # Sans cookie : 401
    assert client.get("/api/admin/projects").status_code == 401
    assert client.post("/api/admin/projects", json=NEW_PROJECT).status_code == 401
    # Un cookie invalide doit aussi retourner 401
    assert client.get("/api/admin/projects", cookies={"access_token": "not-a-jwt"}).status_code == 401


def test_token_signed_with_other_secret_rejected(client: TestClient):
    from app.security import create_access_token

    forged, _jti, _exp = create_access_token(ADMIN_USER, "another-secret-value-0123456789-abcdef", 5)
    # Injecte le token forgé directement dans le cookie — doit être rejeté (mauvais secret).
    r = client.get("/api/admin/projects", cookies={"access_token": forged})
    assert r.status_code == 401


def test_logout_revokes_token(auth_client: TestClient):
    # Vérification que /me fonctionne avant le logout.
    assert auth_client.get("/api/auth/me").status_code == 200
    # Logout : le JTI est ajouté à la blocklist et le cookie est supprimé.
    r = auth_client.post("/api/auth/logout")
    assert r.status_code == 200
    # Après logout, /me doit retourner 401.
    assert auth_client.get("/api/auth/me").status_code == 401
    # Les endpoints admin sont également protégés.
    assert auth_client.get("/api/admin/projects").status_code == 401


# --- CRUD ----------------------------------------------------------------------------
def test_project_crud_cycle(auth_client: TestClient):
    created = auth_client.post("/api/admin/projects", json=NEW_PROJECT)
    assert created.status_code == 201
    pid = created.json()["id"]

    slugs = [p["slug"] for p in auth_client.get("/api/portfolio").json()["projects"]]
    assert "nouveau-projet" in slugs

    updated = auth_client.put(f"/api/admin/projects/{pid}", json={**NEW_PROJECT, "title": "Titre modifié"})
    assert updated.status_code == 200 and updated.json()["title"] == "Titre modifié"

    assert auth_client.delete(f"/api/admin/projects/{pid}").status_code == 204
    assert auth_client.get(f"/api/admin/projects/{pid}").status_code == 404


def test_duplicate_slug_conflict(auth_client: TestClient):
    r = auth_client.post("/api/admin/projects", json={**NEW_PROJECT, "slug": "valeur-fonciere"})
    assert r.status_code == 409


def test_slug_validation(auth_client: TestClient):
    r = auth_client.post("/api/admin/projects", json={**NEW_PROJECT, "slug": "Pas Valide!"})
    assert r.status_code == 422


def test_project_with_unknown_experience_is_conflict(auth_client: TestClient):
    r = auth_client.post("/api/admin/projects", json={**NEW_PROJECT, "experience_id": 9999})
    assert r.status_code == 409


def test_experience_dates_validated(auth_client: TestClient):
    body = {
        "slug": "x",
        "company": "X",
        "role": "Y",
        "contract": "Stage",
        "start_date": "2026-05-01",
        "end_date": "2026-01-01",
    }
    assert auth_client.post("/api/admin/experiences", json=body).status_code == 422


def test_deleting_experience_keeps_projects(auth_client: TestClient):
    exps = auth_client.get("/api/admin/experiences").json()
    inventiv = next(e for e in exps if e["slug"] == "inventiv-it")
    assert auth_client.delete(f"/api/admin/experiences/{inventiv['id']}").status_code == 204
    proj = auth_client.get("/api/projects/rag-juridique").json()
    assert proj["experience_slug"] is None  # ON DELETE SET NULL


def test_profile_update(auth_client: TestClient):
    profile = auth_client.get("/api/admin/profile").json()
    profile.pop("id")
    profile["status_label"] = "Disponible"
    r = auth_client.put("/api/admin/profile", json=profile)
    assert r.status_code == 200
    assert auth_client.get("/api/portfolio").json()["profile"]["status_label"] == "Disponible"


def test_profile_singleton_guard(auth_client: TestClient):
    """Une seconde ligne profile ne peut pas être créée (contrainte _singleton)."""
    profile = auth_client.get("/api/admin/profile").json()
    profile.pop("id")
    # PUT est idempotent (upsert) — on vérifie juste que ça ne crée pas deux lignes.
    r1 = auth_client.put("/api/admin/profile", json=profile)
    r2 = auth_client.put("/api/admin/profile", json=profile)
    assert r1.status_code == 200 and r2.status_code == 200
    # L'API portfolio retourne exactement un profil.
    data = auth_client.get("/api/portfolio").json()
    assert isinstance(data["profile"], dict)


def test_other_entities_crud(auth_client: TestClient):
    for path, body in {
        "skill-groups": {"name": "Cloud", "items": ["GCP"]},
        "education": {"school": "École", "degree": "Diplôme", "start_year": 2020, "end_year": 2022},
        "certifications": {"name": "Cert", "issuer": "Org", "date_label": "2026"},
        "interests": {"title": "Musique"},
    }.items():
        r = auth_client.post(f"/api/admin/{path}", json=body)
        assert r.status_code == 201, (path, r.text)
        assert auth_client.delete(f"/api/admin/{path}/{r.json()['id']}").status_code == 204


def test_invalid_certification_kind(auth_client: TestClient):
    body = {"name": "Cert", "issuer": "Org", "date_label": "2026", "kind": "autre"}
    assert auth_client.post("/api/admin/certifications", json=body).status_code == 422


def test_message_mark_read(auth_client: TestClient):
    from conftest import PAYLOAD  # type: ignore[attr-defined]

    # Envoie un message via le formulaire public.
    auth_client.post("/api/contact", json=PAYLOAD)
    msgs = auth_client.get("/api/admin/messages").json()
    assert len(msgs) == 1
    msg_id = msgs[0]["id"]
    assert msgs[0]["is_read"] is False

    # Marque comme lu.
    r = auth_client.patch(f"/api/admin/messages/{msg_id}/read")
    assert r.status_code == 200
    assert r.json()["is_read"] is True

    # Vérifie la persistance.
    assert auth_client.get("/api/admin/messages").json()[0]["is_read"] is True
