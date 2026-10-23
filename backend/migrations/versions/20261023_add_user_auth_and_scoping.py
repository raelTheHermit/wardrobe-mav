import hashlib
import json
import os
import secrets
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, session
from marshmallow import INCLUDE, Schema, ValidationError, fields
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from . import db
from .models import Garment, OutfitHistory, Preferences, User, UserProfile

api = Blueprint('api', __name__)
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'avif'}


def error(message, code='invalid_request', status=400, details=None):
    payload = {'code': code, 'message': message}
    if details:
        payload['details'] = details
    return jsonify(error=payload), status


def isoformat(value):
    return value.isoformat() if value else None


def current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(User, user_id)


def ensure_user_session(user):
    session.clear()
    session['user_id'] = user.id
    session['csrf_token'] = secrets.token_urlsafe(32)


def get_profile_for_user(user):
    profile = UserProfile.query.filter_by(user_id=user.id).first()
    if profile is None:
        profile = UserProfile(user_id=user.id)
        db.session.add(profile)
        db.session.commit()
    return profile


def get_preferences_for_user(user):
    prefs = Preferences.query.filter_by(user_id=user.id).first()
    if prefs is None:
        prefs = Preferences(user_id=user.id, data={})
        db.session.add(prefs)
        db.session.commit()
    return prefs


def garment_record(g):
    payload = {k: getattr(g, k) for k in ('id', 'name', 'category', 'type', 'subtype', 'color', 'pattern', 'material', 'fit', 'silhouette', 'formality', 'status', 'image_path', 'thumbnail_path', 'source_filename', 'source_hash', 'review_status', 'confidence') if getattr(g, k, None) is not None}
    payload['attributes'] = dict(g.attributes or {})
    payload['createdAt'] = isoformat(g.created_at)
    payload['updatedAt'] = isoformat(g.updated_at)
    payload['deleted_at'] = isoformat(g.deleted_at)
    return payload


class GarmentSchema(Schema):
    id = fields.String()
    name = fields.String(required=True)
    category = fields.String(required=True)
    type = fields.String(allow_none=True)
    subtype = fields.String(allow_none=True)
    color = fields.String(allow_none=True)
    pattern = fields.String(allow_none=True)
    material = fields.String(allow_none=True)
    fit = fields.String(allow_none=True)
    silhouette = fields.String(allow_none=True)
    formality = fields.Float(allow_none=True)
    status = fields.String(allow_none=True)
    attributes = fields.Dict(allow_none=True)


def validate_payload(data, partial=False):
    try:
        schema = GarmentSchema(partial=partial, unknown=INCLUDE)
        clean = schema.load(data or {})
        if clean.get('category') and clean['category'] not in {'top', 'bottom', 'outerwear', 'accessory', 'footwear', 'shoe'}:
            return None, {'category': ['Choose a supported garment category.']}
        if clean.get('status') and clean['status'] not in {'available', 'unavailable'}:
            return None, {'status': ['Must be available or unavailable.']}
        if clean.get('formality') is not None and not 0 <= clean['formality'] <= 5:
            return None, {'formality': ['Must be between 0 and 5.']}
        return clean, None
    except ValidationError as exc:
        return None, exc.messages


def apply_garment(g, data):
    known = set(GarmentSchema().fields) - {'attributes'}
    extra = {key: value for key, value in data.items() if key not in known and key != 'attributes'}
    for key, value in data.items():
        if key in known:
            setattr(g, key, value)
    if 'attributes' in data or extra:
        g.attributes = {**(g.attributes or {}), **(data.get('attributes') or {}), **extra}
    if 'status' not in data and not g.status:
        g.status = 'available'


@api.before_request
def require_api_login():
    if request.path in {'/api/health', '/api/auth/register', '/api/auth/login', '/api/auth/logout', '/api/auth/me'}:
        return
    if not request.path.startswith('/api/'):
        return
    if not session.get('user_id'):
        return error('Authentication required.', 'unauthorized', 401)


@api.get('/health')
def health():
    return jsonify(status='ok')


@api.post('/auth/register')
def register_user():
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))

    if not name:
        return error('Name is required.', 'validation_error', 400)
    if not email or '@' not in email:
        return error('A valid email is required.', 'validation_error', 400)
    if len(password) < 8:
        return error('Password must be at least 8 characters.', 'validation_error', 400)
    if User.query.filter_by(email=email).first():
        return error('Email is already registered.', 'conflict', 409)

    user = User(name=name, email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    ensure_user_session(user)
    return jsonify(user=user.to_dict()), 201


@api.post('/auth/login')
def login_user():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))

    if not email or not password:
        return error('Email and password are required.', 'validation_error', 400)

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return error('Invalid email or password.', 'auth_error', 401)

    ensure_user_session(user)
    return jsonify(user=user.to_dict())


@api.post('/auth/logout')
def logout_user():
    session.clear()
    return jsonify(ok=True)


@api.get('/auth/me')
def me_user():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)
    return jsonify(user=user.to_dict())


@api.get('/sync')
def sync_user_data():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    since = request.args.get('since')
    since_dt = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace('Z', '+00:00'))
        except ValueError:
            since_dt = None

    def filter_since(model, query):
        if since_dt is None:
            return query
        return query.filter(model.updated_at >= since_dt)

    garments = filter_since(Garment, Garment.query.filter_by(user_id=user.id)).order_by(Garment.updated_at.desc()).all()
    payload_garments = []
    for garment in garments:
        row = garment_record(garment)
        if garment.deleted_at is not None:
            row['deleted_at'] = isoformat(garment.deleted_at)
        payload_garments.append(row)

    profile = get_profile_for_user(user)
    preferences = get_preferences_for_user(user)
    history = OutfitHistory.query.filter_by(user_id=user.id).order_by(OutfitHistory.created_at.desc()).all()

    return jsonify({
        'garments': payload_garments,
        'profile': {
            'height': profile.height,
            'heightUnit': profile.height_unit,
            'weight': profile.weight,
            'weightUnit': profile.weight_unit,
            'measurements': profile.measurements or {},
            'fitPreferences': profile.fit_preferences or {},
            'notes': profile.notes,
            **(profile.extra or {}),
        },
        'preferences': preferences.data or {},
        'history': [
            {
                'id': row.id,
                'garmentIds': row.garment_ids or [],
                'context': row.context,
                'mode': row.mode,
                'score': row.score,
                'createdAt': isoformat(row.created_at),
            }
            for row in history
        ],
    })


@api.get('/wardrobe')
def list_garments():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    query = Garment.query.filter_by(user_id=user.id, deleted_at=None)
    for key in ('category', 'color', 'status'):
        value = request.args.get(key)
        if value:
            query = query.filter(getattr(Garment, key) == value)
    search = request.args.get('search')
    if search:
        query = query.filter(Garment.name.ilike(f'%{search}%'))
    return jsonify(items=[garment_record(item) for item in query.order_by(Garment.created_at.desc()).all()])


@api.get('/wardrobe/<string:garment_id>')
def get_garment(garment_id):
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    garment = Garment.query.filter_by(id=garment_id, user_id=user.id).first()
    if not garment or garment.deleted_at is not None:
        return error('Garment not found.', 'not_found', 404)
    return jsonify(item=garment_record(garment))


@api.post('/wardrobe')
def create_garment():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    clean, problems = validate_payload(request.get_json(silent=True) or {})
    if problems:
        return error('Garment data is invalid.', 'validation_error', 400, details=problems)

    garment_id = clean.get('id') or str(uuid.uuid4())
    if db.session.get(Garment, garment_id):
        return error('Garment ID already exists.', 'conflict', 409)

    garment = Garment(id=garment_id, name=clean['name'], category=clean['category'], user_id=user.id, deleted_at=None)
    apply_garment(garment, clean)
    db.session.add(garment)
    db.session.commit()
    return jsonify(item=garment_record(garment)), 201


@api.patch('/wardrobe/<string:garment_id>')
def patch_garment(garment_id):
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    garment = Garment.query.filter_by(id=garment_id, user_id=user.id).first()
    if not garment:
        return error('Garment not found.', 'not_found', 404)

    clean, problems = validate_payload(request.get_json(silent=True) or {}, partial=True)
    if problems:
        return error('Garment data is invalid.', 'validation_error', 400, details=problems)

    apply_garment(garment, clean)
    db.session.commit()
    return jsonify(item=garment_record(garment))


@api.delete('/wardrobe/<string:garment_id>')
def delete_garment(garment_id):
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    garment = Garment.query.filter_by(id=garment_id, user_id=user.id).first()
    if not garment:
        return error('Garment not found.', 'not_found', 404)

    garment.deleted_at = datetime.now(timezone.utc)
    garment.status = 'unavailable'
    db.session.commit()
    return '', 204


@api.post('/wardrobe/<string:garment_id>/image')
def upload_image(garment_id):
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    garment = Garment.query.filter_by(id=garment_id, user_id=user.id).first()
    if not garment:
        return error('Garment not found.', 'not_found', 404)

    image = request.files.get('image')
    if not image or not image.filename or '.' not in image.filename:
        return error('Choose an image file.', 'validation_error', 400)

    ext = image.filename.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return error('Use JPG, PNG, WEBP, or AVIF.', 'validation_error', 400)

    try:
        from PIL import Image

        image.stream.seek(0)
        checked = Image.open(image.stream)
        checked.verify()
        image.stream.seek(0)
        expected = {'jpg': 'JPEG', 'jpeg': 'JPEG', 'png': 'PNG', 'webp': 'WEBP', 'avif': 'AVIF'}[ext]
        if checked.format != expected:
            raise ValueError('Image extension does not match file content.')
    except Exception:
        return error('The uploaded file is not a valid supported image.', 'validation_error', 400)

    user_dir = Path(current_app.config['MEDIA_DIR']) / user.id
    user_dir.mkdir(parents=True, exist_ok=True)

    safe = f'{uuid.uuid4().hex}.{ext}'
    image.save(user_dir / safe)
    relative = f'/media/{user.id}/{safe}'
    garment.image_path = relative
    garment.source_filename = secure_filename(image.filename)
    garment.source_hash = hashlib.sha256((user_dir / safe).read_bytes()).hexdigest()
    db.session.commit()
    return jsonify(item=garment_record(garment))


@api.get('/profile')
def get_profile():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    profile = get_profile_for_user(user)
    return jsonify(profile={
        'height': profile.height,
        'heightUnit': profile.height_unit,
        'weight': profile.weight,
        'weightUnit': profile.weight_unit,
        'measurements': profile.measurements or {},
        'fitPreferences': profile.fit_preferences or {},
        'notes': profile.notes,
        **(profile.extra or {}),
    })


@api.put('/profile')
def put_profile():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error('Profile must be a JSON object.', 'validation_error', 400)

    profile = get_profile_for_user(user)
    profile.height = data.get('height')
    profile.height_unit = data.get('heightUnit', 'cm')
    profile.weight = data.get('weight')
    profile.weight_unit = data.get('weightUnit', 'kg')
    profile.measurements = data.get('measurements') or {}
    profile.fit_preferences = data.get('fitPreferences') or {}
    profile.notes = data.get('notes')
    profile.extra = {k: v for k, v in data.items() if k not in {'height', 'heightUnit', 'weight', 'weightUnit', 'measurements', 'fitPreferences', 'notes'}}
    db.session.add(profile)
    db.session.commit()
    return get_profile()


@api.get('/preferences')
def get_preferences():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    prefs = get_preferences_for_user(user)
    return jsonify(preferences=prefs.data or {})


@api.put('/preferences')
def put_preferences():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error('Preferences must be a JSON object.', 'validation_error', 400)

    prefs = get_preferences_for_user(user)
    prefs.data = data
    db.session.add(prefs)
    db.session.commit()
    return jsonify(preferences=prefs.data)


@api.post('/recommendations')
def recommendations():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    data = request.get_json(silent=True) or {}
    garments = [garment_record(g) for g in Garment.query.filter_by(user_id=user.id, status='available', deleted_at=None).all()]
    profile = get_profile_for_user(user)
    profile_payload = {
        'height': profile.height,
        'heightUnit': profile.height_unit,
        'weight': profile.weight,
        'weightUnit': profile.weight_unit,
        'measurements': profile.measurements or {},
        'fitPreferences': profile.fit_preferences or {},
        'notes': profile.notes,
        **(profile.extra or {}),
    }
    preferences = {**(get_preferences_for_user(user).data or {}), **(data.get('preferences') or {})}
    history = [{'items': row.garment_ids, 'timestamp': row.created_at.timestamp() * 1000} for row in OutfitHistory.query.filter_by(user_id=user.id).order_by(OutfitHistory.created_at.desc()).limit(40).all()]
    payload = {
        'garments': garments,
        'context': data.get('context', 'casual'),
        'preferences': preferences,
        'history': history,
        'profile': profile_payload,
        'limit': data.get('limit', 6),
    }
    script = Path(__file__).resolve().parents[1] / 'recommendations.mjs'
    try:
        result = subprocess.run(['node', str(script)], input=json.dumps(payload), text=True, capture_output=True, timeout=10, check=True)
        return jsonify(outfits=json.loads(result.stdout))
    except Exception:
        current_app.logger.exception('Recommendation engine failed')
        return error('Unable to generate recommendations.', 'recommendation_error', 500)


@api.get('/history')
def get_history():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    rows = OutfitHistory.query.filter_by(user_id=user.id).order_by(OutfitHistory.created_at.desc()).limit(100).all()
    return jsonify(items=[{
        'id': row.id,
        'garmentIds': row.garment_ids,
        'context': row.context,
        'mode': row.mode,
        'score': row.score,
        'scoreComponents': row.score_components,
        'feedback': row.feedback,
        'createdAt': isoformat(row.created_at),
    } for row in rows])


@api.post('/history')
def add_history():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    data = request.get_json(silent=True) or {}
    if not isinstance(data.get('garmentIds'), list):
        return error('garmentIds must be an array.', 'validation_error', 400)

    row = OutfitHistory(
        id=data.get('id') or str(uuid.uuid4()),
        user_id=user.id,
        garment_ids=data['garmentIds'],
        context=data.get('context'),
        mode=data.get('mode'),
        score=data.get('score'),
        score_components=data.get('scoreComponents') or {},
        feedback=data.get('feedback'),
    )
    row.garments = Garment.query.filter(Garment.id.in_(data['garmentIds']), Garment.user_id == user.id).all() if data['garmentIds'] else []
    db.session.add(row)
    db.session.commit()
    return jsonify(id=row.id), 201


@api.post('/import')
def import_items():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    data = request.get_json(silent=True) or {}
    items = data.get('items', [])
    if not isinstance(items, list):
        return error('items must be an array.', 'validation_error', 400)

    report = {'created': [], 'skipped': [], 'failed': []}
    for item in items:
        clean, problems = validate_payload(item)
        if problems:
            report['failed'].append({'id': item.get('id'), 'errors': problems})
            continue
        source_hash = item.get('source_hash') or (item.get('attributes') or {}).get('sourceHash')
        if (clean.get('id') and db.session.get(Garment, clean['id'])) or (source_hash and Garment.query.filter_by(source_hash=source_hash, user_id=user.id).first()):
            report['skipped'].append(clean.get('id'))
            continue

        clean['id'] = clean.get('id') or str(uuid.uuid4())
        garment = Garment(id=clean['id'], name=clean['name'], category=clean['category'], user_id=user.id, source_filename=item.get('source_filename'), source_hash=source_hash, review_status=item.get('review_status', 'needs_review'))
        apply_garment(garment, clean)
        db.session.add(garment)
        report['created'].append(garment.id)

    db.session.commit()
    return jsonify(report), 207 if report['failed'] else 200


@api.get('/accounts')
def list_accounts():
    user = current_user()
    if not user:
        return error('Authentication required.', 'unauthorized', 401)

    return jsonify(accounts=[{
        'id': user.id,
        'username': user.email,
        'displayName': user.name,
        'isDemo': False,
        'createdAt': isoformat(user.created_at),
    }])


@api.post('/accounts')
def create_account():
    return register_user()


@api.post('/login')
def legacy_login():
    return login_user()


