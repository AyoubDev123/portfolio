"""Configuration de l'application (12-factor : tout vient de l'environnement)."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET = "change-me-in-production-change-me!"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Portfolio API"
    environment: str = "development"  # development | production

    # Base de données (SQLite par défaut, PostgreSQL possible via DATABASE_URL)
    database_url: str = "sqlite:///./portfolio.db"
    seed_on_startup: bool = True

    # CORS : liste séparée par des virgules
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    # Auth admin
    secret_key: str = Field(default=DEFAULT_SECRET, min_length=32)
    access_token_minutes: int = 30  # TTL court : réduit la fenêtre d'un token intercepté
    admin_username: str = ""
    admin_password: str = ""  # si les deux sont définis, le compte est créé au 1er démarrage

    # Snapshot statique : chemin du JSON régénéré après chaque mutation admin.
    # En production Docker, pointer vers le volume partagé avec Nginx (/data/snapshot.json).
    # Laisser vide pour désactiver (ex. hébergement statique sans volume).
    static_snapshot_path: str = ""

    # Formulaire de contact (SMTP optionnel : sans SMTP, le message est seulement stocké)
    contact_to: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # Rate limiting (fenêtre glissante, en mémoire)
    contact_rate_limit: int = 5  # messages
    contact_rate_window_s: int = 3600
    login_rate_limit: int = 10  # tentatives
    login_rate_window_s: int = 600

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    def validate_for_production(self) -> None:
        if not self.is_production:
            return
        if self.secret_key == DEFAULT_SECRET:
            raise RuntimeError("SECRET_KEY doit être défini en production.")
        if self.admin_password and len(self.admin_password) < 12:
            raise RuntimeError("ADMIN_PASSWORD doit faire au moins 12 caractères en production.")


@lru_cache
def get_settings() -> Settings:
    return Settings()
