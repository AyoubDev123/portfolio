from app import models
from app.database import make_engine, make_session_factory
from app.security import hash_password, verify_password
from app.seed import is_seeded, seed


def _db():
    engine = make_engine("sqlite://")
    models.Base.metadata.create_all(engine)
    return make_session_factory(engine)()


def test_seed_is_idempotent():
    with _db() as db:
        assert is_seeded(db) is False
        assert seed(db) is True
        assert seed(db) is False  # 2e appel : rien n'est dupliqué
        assert db.query(models.Project).count() == 6


def test_seed_reset_reloads():
    with _db() as db:
        seed(db)
        db.query(models.Project).filter_by(slug="portfolio").delete()
        db.commit()
        assert seed(db, reset=True) is True
        assert db.query(models.Project).filter_by(slug="portfolio").count() == 1


def test_password_hashing():
    h = hash_password("motdepasse")
    assert h != "motdepasse" and verify_password("motdepasse", h)
    assert not verify_password("autre", h)
    assert not verify_password("x", "pas-un-hash")


def test_production_config_guards():
    import pytest

    from app.config import Settings

    with pytest.raises(RuntimeError):
        Settings(environment="production", _env_file=None).validate_for_production()
    with pytest.raises(RuntimeError):
        Settings(
            environment="production", secret_key="x" * 40, admin_username="a", admin_password="court", _env_file=None
        ).validate_for_production()
    Settings(environment="production", secret_key="x" * 40, _env_file=None).validate_for_production()


def test_postgres_url_is_normalized():
    from app.database import normalize_url

    assert normalize_url("postgres://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert normalize_url("postgresql://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert normalize_url("postgresql+psycopg://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert normalize_url("sqlite:///./x.db") == "sqlite:///./x.db"
