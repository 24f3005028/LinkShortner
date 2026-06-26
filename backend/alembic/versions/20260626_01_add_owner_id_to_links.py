"""add owner_id to links

Revision ID: 20260626_01_add_owner_id_to_links
Revises:
Create Date: 2026-06-26 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260626_01_owner_id_to_links"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("links", sa.Column("owner_id", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_links_owner_id"), "links", ["owner_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_links_owner_id"), table_name="links")
    op.drop_column("links", "owner_id")
