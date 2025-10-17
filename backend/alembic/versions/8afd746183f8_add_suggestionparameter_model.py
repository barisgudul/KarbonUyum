### backend/alembic/versions/8afd746183f8_add_suggestionparameter_model.py
"""Add SuggestionParameter model

Revision ID: <senin_revision_id>
Revises: <onceki_revision_id>
Create Date: <tarih>

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# YENİ: Gerekli importları ekle
from sqlalchemy.sql import table, column
from sqlalchemy import String, Float


# revision identifiers, used by Alembic.
revision: str = '8afd746183f8'
down_revision: Union[str, Sequence[str], None] = 'ac3cf1f3800d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### Mevcut create_table komutların ###
    op.create_table('suggestion_parameters',
    sa.Column('key', sa.String(), nullable=False),
    sa.Column('value', sa.Float(), nullable=False),
    sa.Column('description', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('key')
    )
    # ### end Alembic commands ###

    # YENİ: Başlangıç verilerini (seed data) migration içine ekle
    suggestion_params_table = table('suggestion_parameters',
        column('key', String),
        column('value', Float),
        column('description', String)
    )

    op.bulk_insert(suggestion_params_table,
        [
            {'key': 'ges_kwh_generation_per_kwp_annual', 'value': 1350.0, 'description': '1 kWp GESin yıllık ortalama üretimi (kWh)'},
            {'key': 'ges_estimated_cost_per_kwp', 'value': 25000.0, 'description': '1 kWp GESin kurulum maliyeti (TL)'},
            {'key': 'ges_annual_savings_factor', 'value': 0.90, 'description': 'GES ile sağlanacak yıllık maliyet tasarruf oranı'},
            {'key': 'ges_max_roi_years', 'value': 10.0, 'description': 'Maksimum kabul edilebilir yatırım geri dönüş süresi (Yıl)'},
            {'key': 'insulation_avg_cost_per_m2', 'value': 1500.0, 'description': 'Ortalama yalıtım maliyeti (TL/m2)'},
            {'key': 'insulation_gas_savings_per_m2_annual', 'value': 8.0, 'description': 'Yalıtım ile m2 başına yıllık ortalama doğal gaz tasarrufu (m3)'},
            {'key': 'insulation_max_roi_years', 'value': 12.0, 'description': 'Yalıtım için maksimum kabul edilebilir geri dönüş süresi (Yıl)'},
            {'key': 'city_factor_ankara', 'value': 1.2, 'description': 'Ankara için yalıtım tasarruf faktörü'},
            {'key': 'city_factor_erzurum', 'value': 1.5, 'description': 'Erzurum için yalıtım tasarruf faktörü'},
            {'key': 'city_factor_istanbul', 'value': 1.0, 'description': 'İstanbul için yalıtım tasarruf faktörü'},
            {'key': 'city_factor_izmir', 'value': 0.7, 'description': 'İzmir için yalıtım tasarruf faktörü'},
            {'key': 'city_factor_antalya', 'value': 0.5, 'description': 'Antalya için yalıtım tasarruf faktörü'},
        ]
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Downgrade fonksiyonu aynı kalacak, sadece tabloyu silecek
    op.drop_table('suggestion_parameters')