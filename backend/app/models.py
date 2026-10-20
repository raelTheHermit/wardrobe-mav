from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import JSONB
from . import db

outfit_garments = db.Table('outfit_garment',
    db.Column('outfit_id',db.String(100),db.ForeignKey('outfit_history.id',ondelete='CASCADE'),primary_key=True),
    db.Column('garment_id',db.String(100),db.ForeignKey('garment.id',ondelete='CASCADE'),primary_key=True),
)

def now_utc():
    return datetime.now(timezone.utc)

class Garment(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    category = db.Column(db.String(40), nullable=False, index=True)
    type = db.Column(db.String(80))
    subtype = db.Column(db.String(80))
    color = db.Column(db.String(80), index=True)
    pattern = db.Column(db.String(40))
    material = db.Column(db.String(100))
    fit = db.Column(db.String(60))
    silhouette = db.Column(db.String(80))
    formality = db.Column(db.Float)
    visual_weight = db.Column(db.String(30))
    status = db.Column(db.String(20), nullable=False, default='available', index=True)
    image_path = db.Column(db.String(500))
    thumbnail_path = db.Column(db.String(500))
    source_filename = db.Column(db.String(255))
    source_hash = db.Column(db.String(64), index=True)
    review_status = db.Column(db.String(30), nullable=False, default='confirmed', index=True)
    confidence = db.Column(db.Float)
    attributes = db.Column(JSONB, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc, onupdate=now_utc)
    outfit_history = db.relationship('OutfitHistory',secondary=outfit_garments,back_populates='garments',passive_deletes=True)

class UserProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True, default=1)
    height = db.Column(db.Float)
    height_unit = db.Column(db.String(8), default='cm')
    weight = db.Column(db.Float)
    weight_unit = db.Column(db.String(8))
    measurements = db.Column(JSONB, nullable=False, default=dict)
    fit_preferences = db.Column(JSONB, nullable=False, default=dict)
    notes = db.Column(db.Text)
    extra = db.Column(JSONB, nullable=False, default=dict)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc, onupdate=now_utc)

class Preferences(db.Model):
    id = db.Column(db.Integer, primary_key=True, default=1)
    data = db.Column(JSONB, nullable=False, default=dict)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc, onupdate=now_utc)

class OutfitHistory(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    garment_ids = db.Column(JSONB, nullable=False, default=list)
    context = db.Column(db.String(100))
    mode = db.Column(db.String(40))
    score = db.Column(db.Float)
    score_components = db.Column(JSONB, nullable=False, default=dict)
    feedback = db.Column(db.String(30))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc)
    garments = db.relationship('Garment',secondary=outfit_garments,back_populates='outfit_history',passive_deletes=True)
