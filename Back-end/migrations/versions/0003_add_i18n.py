"""Colonne i18n sur les tables de contenu (site bilingue EN/FR).

Les colonnes existantes portent l'anglais (langue canonique) ; `i18n` stocke les
traductions sous la forme {"fr": {"<champ>": <valeur>}} et ne contient que les
champs réellement traduits.

Revision ID: 0003
Revises: 0002
"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

_CONTENT_TABLES = (
    "profile",
    "experience",
    "project",
    "skill_group",
    "education",
    "certification",
    "interest",
)


def upgrade() -> None:
    for table in _CONTENT_TABLES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(sa.Column("i18n", sa.JSON(), nullable=False, server_default="{}"))


def downgrade() -> None:
    for table in _CONTENT_TABLES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_column("i18n")
