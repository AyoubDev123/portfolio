"""Drapeau de vérification d'e-mail sur le compte.

Revision ID: 0006
Revises: 0005
"""

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("user_account") as b:
        b.add_column(sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="0"))
    # Les comptes déjà créés avant la vérification ne sont pas invalidés.
    # TRUE et non 1 : PostgreSQL refuse un entier pour une colonne booléenne.
    op.execute("UPDATE user_account SET email_verified = TRUE")


def downgrade() -> None:
    with op.batch_alter_table("user_account") as b:
        b.drop_column("email_verified")
