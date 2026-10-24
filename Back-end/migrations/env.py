"""Configuration de l'environnement Alembic.

Lit DATABASE_URL depuis l'env (même variable que l'app) pour que les migrations
s'appliquent sur la même DB que FastAPI — en dev comme en prod Docker.
"""

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Importe les métadonnées pour que --autogenerate détecte les modèles.
from app.models import Base  # noqa: F401

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Surcharge sqlalchemy.url avec DATABASE_URL si défini.
db_url = os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url") or "")
# set_main_option passe la valeur à configparser, qui interprète « % ». Sans
# échappement, un mot de passe PostgreSQL contenant % ou un chemin Windows
# encodé (C%3A/...) fait échouer toutes les migrations.
config.set_main_option("sqlalchemy.url", db_url.replace("%", "%%"))


def run_migrations_offline() -> None:
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # requis pour SQLite (ALTER TABLE simulé)
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # requis pour SQLite
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
