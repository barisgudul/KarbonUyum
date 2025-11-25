"""Add Member model for granular facility-level access control

Revision ID: add_member_model
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = 'add_member_model'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create members table
    op.create_table(
        'members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.Enum('owner', 'admin', 'data_entry', 'viewer', name='companymemberrole'), nullable=False),
        sa.Column('facility_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_members_company_id', 'company_id'),
        sa.Index('ix_members_facility_id', 'facility_id'),
        sa.Index('ix_members_role', 'role'),
        sa.Index('ix_members_user_id', 'user_id')
    )


def downgrade() -> None:
    op.drop_table('members')
