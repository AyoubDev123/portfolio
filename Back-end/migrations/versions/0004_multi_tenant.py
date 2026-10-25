"""Multi-tenant : un compte = un portfolio publié sur /<slug>.

admin_user devient user_account (e-mail, slug public, drapeau établissement) et
chaque table de contenu porte un user_id. Le contenu existant est rattaché au
premier compte, donc une base déjà remplie reste intacte.

La contrainte singleton du profil disparaît — c'était la ligne qui disait
« ce logiciel sert une seule personne ». Les slugs de projets et d'expériences
deviennent uniques par utilisateur : deux étudiants peuvent chacun avoir un
projet « portfolio ».

Revision ID: 0004
Revises: 0003
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

# Tables de contenu rattachées à un compte, et la table des messages reçus.
_OWNED = (
    "profile",
    "experience",
    "project",
    "skill_group",
    "education",
    "certification",
    "interest",
    "contact_message",
)


def _slugify(value: str) -> str:
    out = "".join(c if c.isalnum() else "-" for c in value.lower())
    return "-".join(p for p in out.split("-") if p) or "portfolio"


def upgrade() -> None:
    bind = op.get_bind()

    # --- 1. Le compte ----------------------------------------------------------
    op.rename_table("admin_user", "user_account")
    with op.batch_alter_table("user_account") as b:
        b.add_column(sa.Column("email", sa.String(200), nullable=False, server_default=""))
        b.add_column(sa.Column("slug", sa.String(80), nullable=True))
        b.add_column(sa.Column("is_staff", sa.Boolean(), nullable=False, server_default="0"))
        b.add_column(sa.Column("published", sa.Boolean(), nullable=False, server_default="0"))
        b.add_column(
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))"),
            )
        )

    # Le slug public part du nom du compte ; l'utilisateur pourra le changer.
    for uid, username in bind.execute(sa.text("SELECT id, username FROM user_account")).fetchall():
        bind.execute(
            sa.text("UPDATE user_account SET slug = :s WHERE id = :i"),
            {"s": _slugify(username), "i": uid},
        )

    with op.batch_alter_table("user_account") as b:
        b.alter_column("slug", existing_type=sa.String(80), nullable=False)
        b.create_unique_constraint("uq_user_account_email", ["email"])
        b.create_unique_constraint("uq_user_account_slug", ["slug"])
    op.create_index("ix_user_account_slug", "user_account", ["slug"])
    op.create_index("ix_user_account_email", "user_account", ["email"])

    # --- 2. Rattachement du contenu existant -----------------------------------
    owner = bind.execute(sa.text("SELECT id FROM user_account ORDER BY id LIMIT 1")).scalar()

    for table in _OWNED:
        with op.batch_alter_table(table) as b:
            b.add_column(sa.Column("user_id", sa.Integer(), nullable=True))

        if owner is not None:
            bind.execute(sa.text(f"UPDATE {table} SET user_id = :o WHERE user_id IS NULL"), {"o": owner})
        else:
            # Aucun compte : du contenu orphelin n'a pas de propriétaire possible.
            bind.execute(sa.text(f"DELETE FROM {table}"))

        with op.batch_alter_table(table) as b:
            b.alter_column("user_id", existing_type=sa.Integer(), nullable=False)
            b.create_foreign_key(f"fk_{table}_user", "user_account", ["user_id"], ["id"], ondelete="CASCADE")
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])

    # --- 3. Le profil n'est plus un singleton global ---------------------------
    with op.batch_alter_table("profile") as b:
        b.drop_constraint("uq_profile_singleton", type_="unique")
        b.drop_constraint("ck_profile_singleton", type_="check")
        b.drop_column("_singleton")
        b.create_unique_constraint("uq_profile_user", ["user_id"])

    # --- 4. Les slugs deviennent uniques par utilisateur -----------------------
    # batch_alter_table recrée la table : l'ancienne contrainte UNIQUE(slug)
    # posée en ligne à la création disparaît avec elle.
    for table in ("experience", "project"):
        with op.batch_alter_table(table) as b:
            b.create_unique_constraint(f"uq_{table}_user_slug", ["user_id", "slug"])


def downgrade() -> None:
    for table in ("project", "experience"):
        with op.batch_alter_table(table) as b:
            b.drop_constraint(f"uq_{table}_user_slug", type_="unique")

    with op.batch_alter_table("profile") as b:
        b.drop_constraint("uq_profile_user", type_="unique")
        b.add_column(sa.Column("_singleton", sa.Integer(), nullable=False, server_default="1"))
        b.create_unique_constraint("uq_profile_singleton", ["_singleton"])
        b.create_check_constraint("ck_profile_singleton", "_singleton = 1")

    for table in _OWNED:
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        with op.batch_alter_table(table) as b:
            b.drop_constraint(f"fk_{table}_user", type_="foreignkey")
            b.drop_column("user_id")

    op.drop_index("ix_user_account_email", table_name="user_account")
    op.drop_index("ix_user_account_slug", table_name="user_account")
    with op.batch_alter_table("user_account") as b:
        b.drop_constraint("uq_user_account_slug", type_="unique")
        b.drop_constraint("uq_user_account_email", type_="unique")
        b.drop_column("created_at")
        b.drop_column("published")
        b.drop_column("is_staff")
        b.drop_column("slug")
        b.drop_column("email")
    op.rename_table("user_account", "admin_user")
