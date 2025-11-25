### backend/alembic/versions/fd3a751071b7_add_industry_template_and_simulation_.py
"""add_industry_template_and_simulation_fields

Revision ID: fd3a751071b7
Revises: 55ee04a8a6c7
Create Date: 2025-10-28 20:09:48.290245

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'fd3a751071b7'
down_revision: Union[str, Sequence[str], None] = '55ee04a8a6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create IndustryTemplate table
    op.create_table('industry_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('industry_name', sa.String(), nullable=False, unique=True, index=True),
        sa.Column('industry_type', sa.Enum('manufacturing', 'services', 'retail', 'other', name='industrytype'), nullable=False, index=True),
        sa.Column('typical_electricity_kwh_per_employee', sa.Float(), nullable=False),
        sa.Column('typical_gas_m3_per_employee', sa.Float(), nullable=False),
        sa.Column('typical_fuel_liters_per_vehicle', sa.Float(), nullable=False),
        sa.Column('typical_electricity_cost_ratio', sa.Float(), server_default='0.03'),
        sa.Column('typical_gas_cost_ratio', sa.Float(), server_default='0.02'),
        sa.Column('best_in_class_electricity_kwh', sa.Float(), nullable=True),
        sa.Column('average_electricity_kwh', sa.Float(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.Date(), server_default=sa.func.current_date()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add is_simulation column to activity_data table
    op.add_column('activity_data', sa.Column('is_simulation', sa.Boolean(), nullable=False, server_default='false'))
    op.create_index(op.f('ix_activity_data_is_simulation'), 'activity_data', ['is_simulation'], unique=False)
    
    # Insert initial industry templates with realistic Turkish market data
    op.execute("""
        INSERT INTO industry_templates (
            industry_name, industry_type, 
            typical_electricity_kwh_per_employee, typical_gas_m3_per_employee, typical_fuel_liters_per_vehicle,
            typical_electricity_cost_ratio, typical_gas_cost_ratio,
            best_in_class_electricity_kwh, average_electricity_kwh, description
        ) VALUES
        ('Tekstil ve Konfeksiyon', 'manufacturing', 8500, 1200, 2500, 0.035, 0.025, 6800, 8500, 'Tekstil üretim tesisleri için tipik değerler'),
        ('Metal İşleme', 'manufacturing', 12000, 1800, 3000, 0.04, 0.03, 9600, 12000, 'Metal işleme ve döküm tesisleri için tipik değerler'),
        ('Gıda ve İçecek', 'manufacturing', 6500, 900, 2000, 0.03, 0.02, 5200, 6500, 'Gıda üretim tesisleri için tipik değerler'),
        ('Plastik ve Kauçuk', 'manufacturing', 10000, 1500, 2800, 0.038, 0.028, 8000, 10000, 'Plastik enjeksiyon ve ekstrüzyon tesisleri'),
        ('Kimya ve İlaç', 'manufacturing', 15000, 2200, 3500, 0.045, 0.035, 12000, 15000, 'Kimyasal üretim ve ilaç tesisleri'),
        ('Otomotiv Yan Sanayi', 'manufacturing', 9000, 1400, 2600, 0.036, 0.026, 7200, 9000, 'Otomotiv parça üreticileri'),
        ('Yazılım ve BT', 'services', 2500, 300, 800, 0.015, 0.008, 2000, 2500, 'Yazılım geliştirme ve BT hizmetleri'),
        ('Lojistik ve Depolama', 'services', 3500, 500, 5000, 0.02, 0.012, 2800, 3500, 'Lojistik ve kargo şirketleri'),
        ('Perakende Mağaza', 'retail', 4000, 600, 1500, 0.025, 0.015, 3200, 4000, 'Perakende mağaza zincirleri'),
        ('E-ticaret', 'retail', 2000, 250, 3000, 0.012, 0.007, 1600, 2000, 'E-ticaret ve online satış şirketleri'),
        ('Otel ve Konaklama', 'services', 5500, 800, 1800, 0.028, 0.018, 4400, 5500, 'Otel ve konaklama tesisleri'),
        ('Sağlık Hizmetleri', 'services', 7000, 1000, 2200, 0.032, 0.022, 5600, 7000, 'Hastane ve sağlık merkezleri'),
        ('Eğitim Kurumları', 'services', 3000, 450, 1200, 0.018, 0.01, 2400, 3000, 'Özel okullar ve eğitim kurumları'),
        ('İnşaat ve Yapı', 'other', 2800, 400, 4500, 0.016, 0.009, 2240, 2800, 'İnşaat şirketleri ve müteahhitler'),
        ('Tarım ve Hayvancılık', 'other', 4500, 200, 3800, 0.022, 0.005, 3600, 4500, 'Tarımsal üretim ve hayvancılık işletmeleri')
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove is_simulation column from activity_data table
    op.drop_index(op.f('ix_activity_data_is_simulation'), table_name='activity_data')
    op.drop_column('activity_data', 'is_simulation')
    
    # Drop IndustryTemplate table
    op.drop_table('industry_templates')
