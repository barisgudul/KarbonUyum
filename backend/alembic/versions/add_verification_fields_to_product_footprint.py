# alembic/versions/add_verification_fields_to_product_footprint.py
"""Add verification fields to ProductFootprint

Revision ID: add_verification_fields
Revises: add_badge_leaderboard
Create Date: 2025-10-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_verification_fields'
down_revision = 'add_badge_leaderboard'
branch_labels = None
depends_on = None


def upgrade():
    # Önce enum tipini oluştur
    verification_level_enum = postgresql.ENUM(
        'self_declared', 
        'document_backed', 
        'audited',
        name='verificationlevel',
        create_type=False
    )
    verification_level_enum.create(op.get_bind(), checkfirst=True)
    
    # Yeni doğrulama alanlarını ekle
    op.add_column('product_footprints', sa.Column('verification_level', 
        sa.Enum('self_declared', 'document_backed', 'audited', name='verificationlevel'),
        nullable=False,
        server_default='self_declared'
    ))
    
    op.add_column('product_footprints', sa.Column('verification_document_url', 
        sa.String(), 
        nullable=True
    ))
    
    op.add_column('product_footprints', sa.Column('verified_at', 
        sa.DateTime(), 
        nullable=True
    ))
    
    op.add_column('product_footprints', sa.Column('verified_by_user_id', 
        sa.Integer(), 
        nullable=True
    ))
    
    # Foreign key ekle
    op.create_foreign_key(
        'fk_product_footprints_verified_by_user_id',
        'product_footprints', 
        'users',
        ['verified_by_user_id'], 
        ['id']
    )


def downgrade():
    # Foreign key'i kaldır
    op.drop_constraint('fk_product_footprints_verified_by_user_id', 'product_footprints', type_='foreignkey')
    
    # Kolonları kaldır
    op.drop_column('product_footprints', 'verified_by_user_id')
    op.drop_column('product_footprints', 'verified_at')
    op.drop_column('product_footprints', 'verification_document_url')
    op.drop_column('product_footprints', 'verification_level')
    
    # Enum tipini kaldır
    verification_level_enum = postgresql.ENUM(
        'self_declared', 
        'document_backed', 
        'audited',
        name='verificationlevel'
    )
    verification_level_enum.drop(op.get_bind(), checkfirst=True)

