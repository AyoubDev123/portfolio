from conftest import ADMIN_PASS, ADMIN_USER

NEW_PROJECT = {"slug": "nouveau-projet", "title": "Nouveau projet", "stack": ["Python"], "tags": ["Test"]}


# --- Auth ----------------------------------------------------------------------------
def test_login_ok_and_me(client):
    r = client.post("/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json() == {"username": ADMIN_USER}


def test_login_wrong_password_and_unknown_user(client):
    assert client.post("/api/auth/login", json={"username": ADMIN_USER, "password": "x"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "ghost", "password": "x"}).status_code == 401


def test_login_rate_limited(client):
    codes = [
        client.post("/api/auth/login", json={"username": ADMIN_USER, "password": "bad"}).status_code for _ in range(6)
    ]
    assert codes[:4] == [401] * 4 and codes[4:] == [429, 429]  # limite = 4 dans la fixture settings


def test_admin_requires_token(client):
    assert client.get("/api/admin/projects").status_code == 401
    assert client.post("/api/admin/projects", json=NEW_PROJECT).status_code == 401
    bad = {"Authorization": "Bearer not-a-jwt"}
    assert client.get("/api/admin/projects", headers=bad).status_code == 401


def test_token_signed_with_other_secret_rejected(client):
    from app.security import create_access_token

    forged, _ = create_access_token(ADMIN_USER, "another-secret-value-0123456789-abcdef", 5)
    r = client.get("/api/admin/projects", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 401


# --- CRUD ----------------------------------------------------------------------------
def test_project_crud_cycle(client, auth_headers):
    created = client.post("/api/admin/projects", json=NEW_PROJECT, headers=auth_headers)
    assert created.status_code == 201
    pid = created.json()["id"]

    # visible côté public
    slugs = [p["slug"] for p in client.get("/api/portfolio").json()["projects"]]
    assert "nouveau-projet" in slugs

    updated = client.put(
        f"/api/admin/projects/{pid}", json={**NEW_PROJECT, "title": "Titre modifié"}, headers=auth_headers
    )
    assert updated.status_code == 200 and updated.json()["title"] == "Titre modifié"

    assert client.delete(f"/api/admin/projects/{pid}", headers=auth_headers).status_code == 204
    assert client.get(f"/api/admin/projects/{pid}", headers=auth_headers).status_code == 404


def test_duplicate_slug_conflict(client, auth_headers):
    r = client.post("/api/admin/projects", json={**NEW_PROJECT, "slug": "valeur-fonciere"}, headers=auth_headers)
    assert r.status_code == 409


def test_slug_validation(client, auth_headers):
    r = client.post("/api/admin/projects", json={**NEW_PROJECT, "slug": "Pas Valide!"}, headers=auth_headers)
    assert r.status_code == 422


def test_project_with_unknown_experience_is_conflict(client, auth_headers):
    r = client.post("/api/admin/projects", json={**NEW_PROJECT, "experience_id": 9999}, headers=auth_headers)
    assert r.status_code == 409


def test_experience_dates_validated(client, auth_headers):
    body = {
        "slug": "x",
        "company": "X",
        "role": "Y",
        "contract": "Stage",
        "start_date": "2026-05-01",
        "end_date": "2026-01-01",
    }
    assert client.post("/api/admin/experiences", json=body, headers=auth_headers).status_code == 422


def test_deleting_experience_keeps_projects(client, auth_headers):
    exps = client.get("/api/admin/experiences", headers=auth_headers).json()
    inventiv = next(e for e in exps if e["slug"] == "inventiv-it")
    assert client.delete(f"/api/admin/experiences/{inventiv['id']}", headers=auth_headers).status_code == 204
    proj = client.get("/api/projects/rag-juridique").json()
    assert proj["experience_slug"] is None  # ON DELETE SET NULL


def test_profile_update(client, auth_headers):
    profile = client.get("/api/admin/profile", headers=auth_headers).json()
    profile.pop("id")
    profile["status_label"] = "Disponible"
    r = client.put("/api/admin/profile", json=profile, headers=auth_headers)
    assert r.status_code == 200
    assert client.get("/api/portfolio").json()["profile"]["status_label"] == "Disponible"


def test_other_entities_crud(client, auth_headers):
    for path, body in {
        "skill-groups": {"name": "Cloud", "items": ["GCP"]},
        "education": {"school": "École", "degree": "Diplôme", "start_year": 2020, "end_year": 2022},
        "certifications": {"name": "Cert", "issuer": "Org", "date_label": "2026"},
        "interests": {"title": "Musique"},
    }.items():
        r = client.post(f"/api/admin/{path}", json=body, headers=auth_headers)
        assert r.status_code == 201, (path, r.text)
        assert client.delete(f"/api/admin/{path}/{r.json()['id']}", headers=auth_headers).status_code == 204


def test_invalid_certification_kind(client, auth_headers):
    body = {"name": "Cert", "issuer": "Org", "date_label": "2026", "kind": "autre"}
    assert client.post("/api/admin/certifications", json=body, headers=auth_headers).status_code == 422
