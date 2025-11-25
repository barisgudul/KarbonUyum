"""Add Badge and Leaderboard models for gamification

Revision ID: add_badge_leaderboard
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = 'add_badge_leaderboard'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create badges table
    op.create_table(
        'badges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('badge_name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('icon_emoji', sa.String(), nullable=True),
        sa.Column('unlock_condition', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_badges_badge_name', 'badge_name', unique=True),
        sa.Index('ix_badges_category', 'category'),
        sa.Index('ix_badges_is_active', 'is_active')
    )

    # Create user_badges table
    op.create_table(
        'user_badges',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('badge_id', sa.Integer(), nullable=False),
        sa.Column('earned_at', sa.DateTime(), nullable=False),
        sa.Column('displayed', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['badge_id'], ['badges.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_user_badges_badge_id', 'badge_id'),
        sa.Index('ix_user_badges_user_id', 'user_id')
    )

    # Create leaderboard_entries table
    op.create_table(
        'leaderboard_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('industry_type', sa.Enum('manufacturing', 'services', 'retail', 'other', name='industrytype'), nullable=False),
        sa.Column('region', sa.String(), nullable=True),
        sa.Column('rank', sa.Integer(), nullable=False),
        sa.Column('efficiency_score', sa.Float(), nullable=False),
        sa.Column('emissions_per_employee_kwh', sa.Float(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_leaderboard_entries_company_id', 'company_id'),
        sa.Index('ix_leaderboard_entries_industry_type', 'industry_type'),
        sa.Index('ix_leaderboard_entries_region', 'region')
    )


def downgrade() -> None:
    op.drop_table('leaderboard_entries')
    op.drop_table('user_badges')
    op.drop_table('badges')
