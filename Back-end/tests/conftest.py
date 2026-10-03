import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

ADMIN_USER = "admin"
ADMIN_PASS = "s3cret-pass-for-tests"


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
def client(settings: Settings):
    app = create_app(settings)
    with TestClient(app) as c:  # le `with` déclenche le lifespan (création + seed)
        yield c


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    r = client.post("/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
