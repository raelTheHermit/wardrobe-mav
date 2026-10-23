from datetime import datetime, timezone
import uuid

from sqlalchemy.dialects.postgresql import JSONB

from . import db

outfit_garments = db.Table(
    'outfit_garment',
    db.Column('outfit_id', db.String(100), db.ForeignKey('outfit_history.id', ondelete='CASCADE'), primary_key=True),
    db.Column('garment_id', db.String(100), db.ForeignKey('garment.id', ondelete='CASCADE'), primary_key=True),
)


def now_utc():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc)

    garments = db.relationship('Garment', backref='user', lazy='dynamic')
    profiles = db.relationship('UserProfile', back_populates='user', uselist=False, lazy='select')
    preferences = db.relationship('Preferences', back_populates='user', uselist=False, lazy='select')
    history = db.relationship('OutfitHistory', back_populates='user', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email.lower(),
            'name': self.name,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }


class UserAccount(db.Model):
    __tablename__ = 'user_account'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(120), nullable=False, default='Fitzii User')
    is_demo = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc, onupdate=now_utc)
    garments = db.relationship('Garment', backref='owner_account', lazy='dynamic')
    profiles = db.relationship('UserProfile', back_populates='account', uselist=False)


class Garment(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey('user_account.id'), nullable=True, index=True, default=1)
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
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True, index=True)
    outfit_history = db.relationship('OutfitHistory', secondary=outfit_garments, back_populates='garments', passive_deletes=True)


class UserProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True, default=1)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey('user_account.id'), nullable=True, index=True)
    height = db.Column(db.Float)
    height_unit = db.Column(db.String(8), default='cm')
    weight = db.Column(db.Float)
    weight_unit = db.Column(db.String(8))
    measurements = db.Column(JSONB, nullable=False, default=dict)
    fit_preferences = db.Column(JSONB, nullable=False, default=dict)
    notes = db.Column(db.Text)
    extra = db.Column(JSONB, nullable=False, default=dict)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc, onupdate=now_utc)
    account = db.relationship('UserAccount', back_populates='profiles')
    user = db.relationship('User', back_populates='profiles')


class Preferences(db.Model):
    id = db.Column(db.Integer, primary_key=True, default=1)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True, index=True)
    data = db.Column(JSONB, nullable=False, default=dict)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc, onupdate=now_utc)
    user = db.relationship('User', back_populates='preferences')


class OutfitHistory(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True, index=True)
    garment_ids = db.Column(JSONB, nullable=False, default=list)
    context = db.Column(db.String(100))
    mode = db.Column(db.String(40))
    score = db.Column(db.Float)
    score_components = db.Column(JSONB, nullable=False, default=dict)
    feedback = db.Column(db.String(30))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=now_utc)
    garments = db.relationship('Garment', secondary=outfit_garments, back_populates='outfit_history', passive_deletes=True)
    user = db.relationship('User', back_populates='history')


