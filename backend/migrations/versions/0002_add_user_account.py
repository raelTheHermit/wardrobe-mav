"""Add the missing user account table and ownership links.

Revision ID: 0002_add_user_account
Revises: 0001_initial
Create Date: 2026-10-22
"""

from alembic import op
import sqlalchemy as sa


revision = '0002_add_user_account'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table('user_account'):
        op.create_table(
            'user_account',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('username', sa.String(length=80), nullable=False),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('display_name', sa.String(length=120), nullable=False, server_default='Fitzii User'),
            sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index(op.f('ix_user_account_username'), 'user_account', ['username'], unique=True)

    garment_columns = {column['name'] for column in inspector.get_columns('garment')}
    if 'account_id' not in garment_columns:
        op.add_column('garment', sa.Column('account_id', sa.Integer(), nullable=True))
        op.create_index(op.f('ix_garment_account_id'), 'garment', ['account_id'])
        op.create_foreign_key('fk_garment_account_id_user_account', 'garment', 'user_account', ['account_id'], ['id'])

    profile_columns = {column['name'] for column in inspector.get_columns('user_profile')}
    if 'account_id' not in profile_columns:
        op.add_column('user_profile', sa.Column('account_id', sa.Integer(), nullable=True))
        op.create_index(op.f('ix_user_profile_account_id'), 'user_profile', ['account_id'])
        op.create_foreign_key('fk_user_profile_account_id_user_account', 'user_profile', 'user_account', ['account_id'], ['id'])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table('user_profile'):
        profile_columns = {column['name'] for column in inspector.get_columns('user_profile')}
        if 'account_id' in profile_columns:
            op.drop_constraint('fk_user_profile_account_id_user_account', 'user_profile', type_='foreignkey')
            op.drop_index(op.f('ix_user_profile_account_id'), table_name='user_profile')
            op.drop_column('user_profile', 'account_id')

    if inspector.has_table('garment'):
        garment_columns = {column['name'] for column in inspector.get_columns('garment')}
        if 'account_id' in garment_columns:
            op.drop_constraint('fk_garment_account_id_user_account', 'garment', type_='foreignkey')
            op.drop_index(op.f('ix_garment_account_id'), table_name='garment')
            op.drop_column('garment', 'account_id')

    if inspector.has_table('user_account'):
        op.drop_index(op.f('ix_user_account_username'), table_name='user_account')
        op.drop_table('user_account')
