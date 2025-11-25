### backend/alembic/versions/5f219b9f7023_add_scope_to_activity_data.py
"""add_scope_to_activity_data

Revision ID: 5f219b9f7023
Revises: c519807e88b7
Create Date: 2025-10-19 19:27:52.865157

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '5f219b9f7023'
down_revision: Union[str, Sequence[str], None] = 'c519807e88b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add scope column to activity_data table with GHG Protocol compliance."""
    # 1. ScopeType enum'unu oluştur
    scope_type = sa.Enum('scope_1', 'scope_2', 'scope_3', name='scopetype')
    scope_type.create(op.get_bind(), checkfirst=True)
    
    # 2. scope column'unu ekle (önce nullable olarak)
    op.add_column('activity_data', 
        sa.Column('scope', sa.Enum('scope_1', 'scope_2', 'scope_3', name='scopetype'), nullable=True)
    )
    
    # 3. Mevcut verilere scope değeri ata
    # electricity -> scope_2 (satın alınan enerji)
    # natural_gas, diesel_fuel -> scope_1 (doğrudan emisyonlar)
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE activity_data 
        SET scope = CASE 
            WHEN activity_type = 'electricity' THEN 'scope_2'::scopetype
            WHEN activity_type IN ('natural_gas', 'diesel_fuel') THEN 'scope_1'::scopetype
            ELSE 'scope_1'::scopetype
        END
        WHERE scope IS NULL
    """))
    
    # 4. scope column'unu nullable=False yap
    op.alter_column('activity_data', 'scope', nullable=False)


def downgrade() -> None:
    """Remove scope column from activity_data table."""
    # 1. scope column'unu kaldır
    op.drop_column('activity_data', 'scope')
    
    # 2. ScopeType enum'unu kaldır
    scope_type = sa.Enum('scope_1', 'scope_2', 'scope_3', name='scopetype')
    scope_type.drop(op.get_bind(), checkfirst=True)
