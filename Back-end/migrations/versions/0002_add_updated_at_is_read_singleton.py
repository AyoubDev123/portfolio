"""Add updated_at, is_read, profile singleton guard

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-03
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TIMESTAMP_DEFAULT = sa.text("(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
_CONTENT_TABLES = ("experience", "project", "skill_group", "education", "certification", "interest")


def upgrade() -> None:
    # --- updated_at sur toutes les tables de contenu ---------------------------
    for table in ("profile", *_CONTENT_TABLES):
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(
                sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=_TIMESTAMP_DEFAULT)
            )
        # Backfille les lignes existantes.
        op.execute(f"UPDATE {table} SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE updated_at IS NULL")

    # --- Colonne singleton + contraintes sur profile ---------------------------
    with op.batch_alter_table("profile") as batch_op:
        batch_op.add_column(sa.Column("_singleton", sa.Integer(), nullable=True, server_default="1"))
    op.execute("UPDATE profile SET _singleton = 1 WHERE _singleton IS NULL")
    # Ajoute UNIQUE + CHECK via batch (SQLite ne supporte pas ALTER TABLE ADD CONSTRAINT).
    with op.batch_alter_table("profile") as batch_op:
        batch_op.create_unique_constraint("uq_profile_singleton", ["_singleton"])
        batch_op.create_check_constraint("ck_profile_singleton", "_singleton = 1")

    # --- is_read sur contact_message -------------------------------------------
    with op.batch_alter_table("contact_message") as batch_op:
        batch_op.add_column(
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default="0")
        )


def downgrade() -> None:
    with op.batch_alter_table("contact_message") as batch_op:
        batch_op.drop_column("is_read")

    with op.batch_alter_table("profile") as batch_op:
        batch_op.drop_constraint("uq_profile_singleton", type_="unique")
        batch_op.drop_constraint("ck_profile_singleton", type_="check")
        batch_op.drop_column("_singleton")

    for table in ("profile", *_CONTENT_TABLES):
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_column("updated_at")
