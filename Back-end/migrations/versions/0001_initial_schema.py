"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-03

Cette migration est idempotente : elle ne crée chaque table que si elle n'existe
pas déjà. Pour une base existante d'avant l'ajout d'Alembic, il suffit de lancer
`alembic stamp 0001` pour la marquer comme déjà appliquée, puis `alembic upgrade head`
pour appliquer les migrations suivantes.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(inspect(bind).get_table_names())

    if "profile" not in existing:
        op.create_table(
            "profile",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("first_name", sa.String(80), nullable=False),
            sa.Column("last_name", sa.String(80), nullable=False),
            sa.Column("headline", sa.String(200), nullable=False),
            sa.Column("tagline", sa.Text(), nullable=False),
            sa.Column("about", sa.JSON(), nullable=False),
            sa.Column("status_label", sa.String(200), nullable=False, server_default=""),
            sa.Column("email", sa.String(200), nullable=False),
            sa.Column("city", sa.String(120), nullable=False, server_default=""),
            sa.Column("linkedin", sa.String(300), nullable=False, server_default=""),
            sa.Column("github", sa.String(300), nullable=False, server_default=""),
            sa.Column("photo", sa.String(300), nullable=False, server_default=""),
            sa.Column("cv_url", sa.String(300), nullable=False, server_default=""),
            sa.Column("languages", sa.JSON(), nullable=False),
            sa.Column("metrics", sa.JSON(), nullable=False),
        )

    if "experience" not in existing:
        op.create_table(
            "experience",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("slug", sa.String(80), nullable=False, unique=True),
            sa.Column("company", sa.String(120), nullable=False),
            sa.Column("role", sa.String(160), nullable=False),
            sa.Column("contract", sa.String(60), nullable=False),
            sa.Column("location", sa.String(120), nullable=False, server_default=""),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=True),
            sa.Column("summary", sa.Text(), nullable=False, server_default=""),
            sa.Column("highlights", sa.JSON(), nullable=False),
            sa.Column("stack", sa.JSON(), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_experience_slug", "experience", ["slug"])

    if "project" not in existing:
        op.create_table(
            "project",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("slug", sa.String(80), nullable=False, unique=True),
            sa.Column("title", sa.String(160), nullable=False),
            sa.Column("subtitle", sa.String(240), nullable=False, server_default=""),
            sa.Column("period", sa.String(80), nullable=False, server_default=""),
            sa.Column("context", sa.String(160), nullable=False, server_default=""),
            sa.Column("summary", sa.Text(), nullable=False, server_default=""),
            sa.Column("description", sa.JSON(), nullable=False),
            sa.Column("highlights", sa.JSON(), nullable=False),
            sa.Column("stack", sa.JSON(), nullable=False),
            sa.Column("tags", sa.JSON(), nullable=False),
            sa.Column("images", sa.JSON(), nullable=False),
            sa.Column("links", sa.JSON(), nullable=False),
            sa.Column("featured", sa.Boolean(), nullable=False, server_default="0"),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "experience_id", sa.Integer(), sa.ForeignKey("experience.id", ondelete="SET NULL"), nullable=True
            ),
        )
        op.create_index("ix_project_slug", "project", ["slug"])

    if "skill_group" not in existing:
        op.create_table(
            "skill_group",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(120), nullable=False),
            sa.Column("items", sa.JSON(), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        )

    if "education" not in existing:
        op.create_table(
            "education",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("school", sa.String(160), nullable=False),
            sa.Column("degree", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("start_year", sa.Integer(), nullable=False),
            sa.Column("end_year", sa.Integer(), nullable=False),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        )

    if "certification" not in existing:
        op.create_table(
            "certification",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("issuer", sa.String(160), nullable=False),
            sa.Column("date_label", sa.String(60), nullable=False),
            sa.Column("kind", sa.String(20), nullable=False, server_default="certification"),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        )

    if "interest" not in existing:
        op.create_table(
            "interest",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("title", sa.String(120), nullable=False),
            sa.Column("description", sa.String(300), nullable=False, server_default=""),
            sa.Column("icon", sa.String(40), nullable=False, server_default="sparkles"),
            sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        )

    if "contact_message" not in existing:
        op.create_table(
            "contact_message",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(120), nullable=False),
            sa.Column("email", sa.String(200), nullable=False),
            sa.Column("subject", sa.String(200), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if "admin_user" not in existing:
        op.create_table(
            "admin_user",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("username", sa.String(80), nullable=False, unique=True),
            sa.Column("password_hash", sa.String(200), nullable=False),
        )

    if "token_blocklist" not in existing:
        op.create_table(
            "token_blocklist",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("jti", sa.String(36), nullable=False, unique=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_token_blocklist_jti", "token_blocklist", ["jti"])


def downgrade() -> None:
    op.drop_table("token_blocklist")
    op.drop_table("admin_user")
    op.drop_table("contact_message")
    op.drop_table("interest")
    op.drop_table("certification")
    op.drop_table("education")
    op.drop_table("skill_group")
    op.drop_table("project")
    op.drop_table("experience")
    op.drop_table("profile")
