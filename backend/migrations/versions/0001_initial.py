"""Initial wardrobe persistence schema.

Revision ID: 0001_initial
Revises:
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None
JSON = postgresql.JSONB(astext_type=sa.Text())

def upgrade():
    op.create_table('user_account',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('username', sa.String(length=80), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('display_name', sa.String(length=120), nullable=False, server_default='Fitzii User'),
        sa.Column('is_demo', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index(op.f('ix_user_account_username'), 'user_account', ['username'], unique=True)

    op.create_table('garment',
        sa.Column('id',sa.String(100),primary_key=True), sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('name',sa.String(160),nullable=False), sa.Column('category',sa.String(40),nullable=False),
        sa.Column('type',sa.String(80)),sa.Column('subtype',sa.String(80)), sa.Column('color',sa.String(80)),
        sa.Column('pattern',sa.String(40)),sa.Column('material',sa.String(100)), sa.Column('fit',sa.String(60)),
        sa.Column('silhouette',sa.String(80)),sa.Column('formality',sa.Float()), sa.Column('visual_weight',sa.String(30)),
        sa.Column('status',sa.String(20),nullable=False), sa.Column('image_path',sa.String(500)),sa.Column('thumbnail_path',sa.String(500)),
        sa.Column('source_filename',sa.String(255)),sa.Column('source_hash',sa.String(64)),sa.Column('review_status',sa.String(30),nullable=False),sa.Column('confidence',sa.Float()),
        sa.Column('attributes',JSON,nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False))
    op.create_index('ix_garment_category','garment',['category']); op.create_index('ix_garment_color','garment',['color'])
    op.create_index('ix_garment_status','garment',['status']); op.create_index('ix_garment_source_hash','garment',['source_hash'])
    op.create_index('ix_garment_review_status','garment',['review_status']); op.create_index(op.f('ix_garment_account_id'),'garment',['account_id'])
    op.create_foreign_key('fk_garment_account_id_user_account','garment','user_account',['account_id'],['id'])

    op.create_table('user_profile',sa.Column('id',sa.Integer,primary_key=True),sa.Column('account_id',sa.Integer(),nullable=True),
        sa.Column('height',sa.Float()), sa.Column('height_unit',sa.String(8)),sa.Column('weight',sa.Float()),sa.Column('weight_unit',sa.String(8)),
        sa.Column('measurements',JSON,nullable=False),sa.Column('fit_preferences',JSON,nullable=False),sa.Column('notes',sa.Text()),
        sa.Column('extra',JSON,nullable=False),sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False))
    op.create_index(op.f('ix_user_profile_account_id'),'user_profile',['account_id'])
    op.create_foreign_key('fk_user_profile_account_id_user_account','user_profile','user_account',['account_id'],['id'])

    op.create_table('preferences',sa.Column('id',sa.Integer,primary_key=True),sa.Column('data',JSON,nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False))
    op.create_table('outfit_history',sa.Column('id',sa.String(100),primary_key=True),sa.Column('garment_ids',JSON,nullable=False),
        sa.Column('context',sa.String(100)),sa.Column('mode',sa.String(40)),sa.Column('score',sa.Float()),
        sa.Column('score_components',JSON,nullable=False),sa.Column('feedback',sa.String(30)),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False))
    op.create_table('outfit_garment',sa.Column('outfit_id',sa.String(100),sa.ForeignKey('outfit_history.id',ondelete='CASCADE'),primary_key=True),
        sa.Column('garment_id',sa.String(100),sa.ForeignKey('garment.id',ondelete='CASCADE'),primary_key=True))

    op.execute("UPDATE garment SET account_id = 1 WHERE account_id IS NULL")
    op.execute("UPDATE user_profile SET account_id = 1 WHERE account_id IS NULL")

def downgrade():
    op.drop_table('outfit_garment'); op.drop_table('outfit_history'); op.drop_table('preferences'); op.drop_table('user_profile')
    op.drop_index('ix_garment_review_status',table_name='garment'); op.drop_index('ix_garment_source_hash',table_name='garment')
    op.drop_index('ix_garment_status',table_name='garment'); op.drop_index('ix_garment_color',table_name='garment')
    op.drop_index('ix_garment_category',table_name='garment'); op.drop_index('ix_garment_account_id',table_name='garment')
    op.drop_table('garment'); op.drop_index('ix_user_account_username',table_name='user_account'); op.drop_table('user_account')
