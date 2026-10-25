import json
from pathlib import Path

import pytest
from conftest import SLUG

from app.export_static import DEFAULT_OUT, render_static_json
from app.seed import load_content


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_portfolio_shape(client):
    r = client.get("/api/p/" + SLUG)
    assert r.status_code == 200
    assert r.headers["cache-control"] == "public, max-age=60"
    data = r.json()
    assert set(data) == {
        "profile",
        "experiences",
        "projects",
        "skill_groups",
        "education",
        "certifications",
        "interests",
    }
    assert data["profile"]["last_name"] == "EL ABBASSI"
    assert [e["slug"] for e in data["experiences"]] == ["safran", "renault", "inventiv-it"]


def test_current_experience_flag(client):
    exps = {e["slug"]: e for e in client.get("/api/p/" + SLUG).json()["experiences"]}
    assert exps["safran"]["current"] is True
    assert exps["renault"]["current"] is False


def test_projects_linked_to_experiences(client, auth_client):
    inventiv = next(e for e in auth_client.get("/api/admin/experiences").json() if e["slug"] == "inventiv-it")
    created = auth_client.post(
        "/api/admin/projects",
        json={"slug": "lien-test", "title": "Lien test", "experience_id": inventiv["id"]},
    )
    assert created.status_code == 201

    data = client.get("/api/p/" + SLUG).json()
    by_slug = {p["slug"]: p for p in data["projects"]}
    assert by_slug["lien-test"]["experience_slug"] == "inventiv-it"
    assert by_slug["valeur-fonciere"]["experience_slug"] is None
    inventiv_out = next(e for e in data["experiences"] if e["slug"] == "inventiv-it")
    assert inventiv_out["project_slugs"] == ["lien-test"]


def test_get_project_and_404(client):
    ok = client.get("/api/p/" + SLUG + "/projects/valeur-fonciere")
    assert ok.status_code == 200
    assert ok.json()["title"].startswith("Land Value")
    assert client.get("/api/p/" + SLUG + "/projects/inconnu").status_code == 404


def test_security_headers(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"


def test_seed_content_is_consistent():
    content = load_content()
    slugs = [p["slug"] for p in content["projects"]]
    assert len(slugs) == len(set(slugs)), "slugs de projets dupliqués"
    exp_slugs = {e["slug"] for e in content["experiences"]}
    for p in content["projects"]:
        assert p["experience"] is None or p["experience"] in exp_slugs
        for img in p["images"]:
            assert img["alt"], f"alt manquant dans {p['slug']}"


def _strip_ids(value):
    """Retire les id (artefacts d'auto-increment qui divergent après des suppressions) avant comparaison."""
    if isinstance(value, dict):
        return {k: _strip_ids(v) for k, v in value.items() if k != "id"}
    if isinstance(value, list):
        return [_strip_ids(v) for v in value]
    return value


@pytest.mark.skipif(not Path(DEFAULT_OUT).parent.exists(), reason="Front-end absent (build Docker back-end seul)")
def test_static_export_is_in_sync():
    """Si ce test échoue : `python -m app.export_static` puis commit."""
    committed = json.loads(Path(DEFAULT_OUT).read_text(encoding="utf-8"))
    assert _strip_ids(committed) == _strip_ids(json.loads(render_static_json()))
