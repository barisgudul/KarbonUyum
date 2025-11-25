### backend/alembic/versions/a07f6e171643_create_suggestion_parameters_table.py
"""create_suggestion_parameters_table

Revision ID: a07f6e171643
Revises: 8c5c5773dd1d
Create Date: 2025-10-19 20:34:18.950422

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy import Float, String
from sqlalchemy.sql import column, table

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a07f6e171643'
down_revision: Union[str, Sequence[str], None] = '8c5c5773dd1d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create suggestion_parameters table with city-specific factors."""
    # Create table
    op.create_table('suggestion_parameters',
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('key')
    )
    
    # Seed data: Default factors + city-specific factors
    suggestion_params_table = table('suggestion_parameters',
        column('key', String),
        column('value', Float),
        column('description', String)
    )
    
    op.bulk_insert(suggestion_params_table,
        [
            # Default factors
            {'key': 'ges_kwh_generation_per_kwp_annual', 'value': 1350.0, 'description': '1 kWp GES yıllık ortalama üretimi (kWh)'},
            {'key': 'ges_estimated_cost_per_kwp', 'value': 25000.0, 'description': '1 kWp GES kurulum maliyeti (TL)'},
            {'key': 'ges_annual_savings_factor', 'value': 0.90, 'description': 'GES ile sağlanacak yıllık maliyet tasarruf oranı'},
            {'key': 'ges_max_roi_years', 'value': 10.0, 'description': 'Maksimum kabul edilebilir yatırım geri dönüş süresi (Yıl)'},
            {'key': 'insulation_avg_cost_per_m2', 'value': 1500.0, 'description': 'Ortalama yalıtım maliyeti (TL/m2)'},
            {'key': 'insulation_gas_savings_per_m2_annual', 'value': 8.0, 'description': 'Yalıtım ile m2 başına yıllık doğal gaz tasarrufu (m3)'},
            {'key': 'insulation_max_roi_years', 'value': 12.0, 'description': 'Yalıtım için maksimum kabul edilebilir geri dönüş süresi (Yıl)'},
            
            # City-specific GES factors (solar irradiance approximation)
            {'key': 'city_ges_istanbul', 'value': 4.5, 'description': 'İstanbul GES verimliliği faktörü'},
            {'key': 'city_ges_ankara', 'value': 4.2, 'description': 'Ankara GES verimliliği faktörü'},
            {'key': 'city_ges_izmir', 'value': 4.8, 'description': 'İzmir GES verimliliği faktörü'},
            {'key': 'city_ges_bursa', 'value': 4.3, 'description': 'Bursa GES verimliliği faktörü'},
            {'key': 'city_ges_gaziantep', 'value': 4.1, 'description': 'Gaziantep GES verimliliği faktörü'},
            
            # City-specific heating efficiency factors
            {'key': 'city_heating_istanbul', 'value': 0.92, 'description': 'İstanbul yalıtım tasarruf faktörü'},
            {'key': 'city_heating_ankara', 'value': 0.88, 'description': 'Ankara yalıtım tasarruf faktörü'},
            {'key': 'city_heating_izmir', 'value': 0.95, 'description': 'İzmir yalıtım tasarruf faktörü'},
            {'key': 'city_heating_bursa', 'value': 0.90, 'description': 'Bursa yalıtım tasarruf faktörü'},
            {'key': 'city_heating_gaziantep', 'value': 0.85, 'description': 'Gaziantep yalıtım tasarruf faktörü'},
        ]
    )


def downgrade() -> None:
    """Drop suggestion_parameters table."""
    op.drop_table('suggestion_parameters')
