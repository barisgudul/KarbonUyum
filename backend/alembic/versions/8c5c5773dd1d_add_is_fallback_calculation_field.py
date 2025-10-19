### backend/alembic/versions/8c5c5773dd1d_add_is_fallback_calculation_field.py
"""add_is_fallback_calculation_field

Revision ID: 8c5c5773dd1d
Revises: 5f219b9f7023
Create Date: 2025-10-19 20:15:56.704886

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c5c5773dd1d'
down_revision: Union[str, Sequence[str], None] = '5f219b9f7023'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add is_fallback_calculation field for legal transparency."""
    # is_fallback_calculation column'unu ekle (varsayılan False)
    op.add_column('activity_data', 
        sa.Column('is_fallback_calculation', sa.Boolean(), nullable=False, server_default='false')
    )


def downgrade() -> None:
    """Remove is_fallback_calculation field."""
    op.drop_column('activity_data', 'is_fallback_calculation')
