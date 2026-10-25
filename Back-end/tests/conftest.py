import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

ADMIN_USER = "prof-test"
SLUG = "prof-test"  # bootstrap_admin dérive le slug du nom de compte
ADMIN_PASS = "s3cret-pass-for-tests"

PAYLOAD = {
    "name": "Camille Dupont",
    "email": "camille@example.com",
    "subject": "Proposition",
    "message": "Bonjour Ayoub, votre profil nous intéresse beaucoup.",
}


@pytest.fixture
def settings() -> Settings:
    return Settings(
        database_url="sqlite://",
        secret_key="test-secret-key-0123456789-abcdefghij",
        admin_username=ADMIN_USER,
        admin_password=ADMIN_PASS,
        cors_origins="http://localhost:5173",
        contact_rate_limit=3,
        login_rate_limit=4,
        _env_file=None,
    )


@pytest.fixture
def slug() -> str:
    return SLUG


@pytest.fixture
def client(settings: Settings):
    app = create_app(settings)
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture
def auth_client(client: TestClient) -> TestClient:
    """Client déjà connecté : le cookie HttpOnly access_token est positionné."""
    r = client.post("/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    # Le TestClient (requests.Session) stocke le cookie Set-Cookie automatiquement.
    # Toutes les requêtes suivantes depuis ce client incluront le cookie.
    return client
