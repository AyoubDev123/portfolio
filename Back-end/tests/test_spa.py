"""Service du site par l'API : une seule origine, et pas de fuite de fichiers."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import main

SPA_BUILT = main.SPA_DIR.is_dir()
pytestmark = pytest.mark.skipif(not SPA_BUILT, reason="front non construit (npm run build)")


def test_spa_routes_fall_back_to_index(client: TestClient):
    """Une adresse de portfolio doit marcher au rafraîchissement, pas seulement en navigation."""
    for path in ("/", "/signup", "/un-etudiant", "/un-etudiant/projects/un-projet"):
        r = client.get(path)
        assert r.status_code == 200, path
        assert '<div id="root">' in r.text, path


def test_api_is_not_shadowed_by_the_spa(client: TestClient):
    assert client.get("/api/health").json() == {"status": "ok"}
    # Une route d'API inexistante reste une 404 d'API, pas la page d'accueil.
    assert client.get("/api/inconnu").status_code == 404


def test_path_traversal_cannot_reach_the_source(client: TestClient):
    """Le handler construit un chemin depuis l'URL : il doit rester sous static/."""
    for attack in (
        "/../app/main.py",
        "/%2e%2e/app/main.py",
        "/..%2f..%2fapp/config.py",
        "/static/../app/main.py",
    ):
        r = client.get(attack)
        assert "def create_app" not in r.text, attack
        assert "SECRET_KEY" not in r.text, attack
        assert Path("app/main.py").read_text(encoding="utf-8")[:40] not in r.text, attack
