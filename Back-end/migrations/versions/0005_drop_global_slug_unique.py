"""Supprime la contrainte UNIQUE(slug) globale sur experience et project.

La migration 0004 a ajouté UNIQUE(user_id, slug) en comptant sur batch_alter_table
pour reconstruire la table sans l'ancienne contrainte. Ce n'est pas ce qu'il fait :
le mode batch reflète la table existante et recopie ses contraintes, donc
UNIQUE(slug) a survécu. Résultat, le second étudiant qui importe un CV mentionnant
une entreprise déjà présente chez quelqu'un d'autre reçoit une erreur 500.

Ici on passe `copy_from` avec le schéma voulu, qui est ce qui force la
reconstruction réelle.

Revision ID: 0005
Revises: 0004
"""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

_COMMON = (
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("user_id", sa.Integer(), sa.ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False),
    sa.Column("slug", sa.String(80), nullable=False),
    sa.Column("i18n", sa.JSON(), nullable=False, server_default="{}"),
    sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
)

_TABLES = {
    "experience": (
        sa.Column("company", sa.String(120), nullable=False),
        sa.Column("role", sa.String(160), nullable=False),
        sa.Column("contract", sa.String(60), nullable=False),
        sa.Column("location", sa.String(120), nullable=False, server_default=""),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("highlights", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("stack", sa.JSON(), nullable=False, server_default="[]"),
    ),
    "project": (
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("subtitle", sa.String(240), nullable=False, server_default=""),
        sa.Column("period", sa.String(80), nullable=False, server_default=""),
        sa.Column("context", sa.String(160), nullable=False, server_default=""),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("description", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("highlights", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("stack", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("tags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("images", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("links", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column(
            "experience_id",
            sa.Integer(),
            sa.ForeignKey("experience.id", ondelete="SET NULL"),
            nullable=True,
        ),
    ),
}


def _rebuild(table: str, unique_cols: list[str]) -> None:
    meta = sa.MetaData()
    target = sa.Table(
        table,
        meta,
        *[c.copy() for c in _COMMON],
        *[c.copy() for c in _TABLES[table]],
        sa.UniqueConstraint(*unique_cols, name=f"uq_{table}_user_slug")
        if unique_cols == ["user_id", "slug"]
        else sa.UniqueConstraint("slug", name=f"uq_{table}_slug"),
    )
    # recreate="always" : sans opération dans le bloc, le mode "auto" ne
    # reconstruit rien et l'ancienne contrainte reste en place.
    with op.batch_alter_table(table, copy_from=target, recreate="always"):
        pass


def upgrade() -> None:
    for table in ("project", "experience"):
        _rebuild(table, ["user_id", "slug"])


def downgrade() -> None:
    for table in ("experience", "project"):
        _rebuild(table, ["slug"])
