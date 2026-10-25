import hashlib
import json
import os
import subprocess
import uuid
from pathlib import Path
from flask import Blueprint, current_app, jsonify, make_response, request, session
from marshmallow import Schema, fields, ValidationError, INCLUDE
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from . import db
from .models import Garment, OutfitHistory, Preferences, UserAccount, UserProfile

try:
    import cloudinary
    import cloudinary.uploader
except Exception:  # pragma: no cover - optional dependency until installed
    cloudinary = None
    cloudinary_uploader = None

api = Blueprint('api', __name__)
ALLOWED = {'jpg', 'jpeg', 'png', 'webp', 'avif'}

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
    status = fields.String()
    attributes = fields.Dict()

def record(g):
    result = dict(g.attributes or {})
    result.update({k: getattr(g, k) for k in ('id','name','category','type','subtype','color','pattern','material','fit','silhouette','formality','status','image_path','thumbnail_path','source_filename','review_status','confidence')})
    result['status'] = g.status or 'available'
    return result

def error(message, code='invalid_request', status=400, details=None):
    payload = {'code': code, 'message': message}
    if details: payload['details'] = details
    return jsonify(error=payload), status

def validate_payload(data, partial=False):
    try:
        schema = GarmentSchema(partial=partial, unknown=INCLUDE)
        clean = schema.load(data)
        if clean.get('category') and clean['category'] not in {'top','bottom','outerwear','accessory','footwear','shoe'}:
            return None, {'category': ['Choose a supported garment category.']}
        if clean.get('status') and clean['status'] not in {'available','unavailable'}:
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
        if key in known: setattr(g, key, value)
    if 'attributes' in data or extra: g.attributes = {**(g.attributes or {}), **(data.get('attributes') or {}), **extra}
    if 'status' not in data and not g.status: g.status = 'available'

@api.get('/health')
def health(): return jsonify(status='ok')

@api.get('/wardrobe')
def list_garments():
    query = Garment.query
    for key in ('category','color','status'):
        value = request.args.get(key)
        if value: query = query.filter(getattr(Garment, key) == value)
    style = request.args.get('style')
    if style: query = query.filter(Garment.attributes['style'].astext == style)
    search = request.args.get('search')
    if search: query = query.filter(Garment.name.ilike(f'%{search}%'))
    return jsonify(items=[record(x) for x in query.order_by(Garment.created_at).all()])

@api.get('/wardrobe/<string:garment_id>')
def get_garment(garment_id):
    g = db.session.get(Garment, garment_id)
    return (jsonify(item=record(g)), 200) if g else error('Garment not found.', 'not_found', 404)

@api.post('/wardrobe')
def create_garment():
    data, problems = validate_payload(request.get_json(silent=True) or {})
    if problems: return error('Garment data is invalid.', details=problems)
    data['id'] = data.get('id') or str(uuid.uuid4())
    if db.session.get(Garment, data['id']): return error('Garment ID already exists.', 'conflict', 409)
    g = Garment(id=data['id'], name=data['name'], category=data['category'])
    apply_garment(g, data)
    db.session.add(g); db.session.commit()
    return jsonify(item=record(g)), 201

@api.patch('/wardrobe/<string:garment_id>')
def patch_garment(garment_id):
    g = db.session.get(Garment, garment_id)
    if not g: return error('Garment not found.', 'not_found', 404)
    data, problems = validate_payload(request.get_json(silent=True) or {}, partial=True)
    if problems: return error('Garment data is invalid.', details=problems)
    apply_garment(g, data); db.session.commit()
    return jsonify(item=record(g))

@api.delete('/wardrobe/<string:garment_id>')
def delete_garment(garment_id):
    g = db.session.get(Garment, garment_id)
    if not g: return error('Garment not found.', 'not_found', 404)
    db.session.delete(g); db.session.commit()
    return '', 204

def _save_uploaded_image(image, garment_id):
    if not image or not image.filename or '.' not in image.filename:
        raise ValueError('Choose an image file.')

    ext = image.filename.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED:
        raise ValueError('Use JPG, PNG, WEBP, or AVIF.')

    try:
        from PIL import Image
        image.stream.seek(0)
        checked = Image.open(image.stream)
        checked.verify()
        image.stream.seek(0)
        expected = {'jpg': 'JPEG', 'jpeg': 'JPEG', 'png': 'PNG', 'webp': 'WEBP', 'avif': 'AVIF'}[ext]
        if checked.format != expected:
            raise ValueError('Image extension does not match its content')
    except Exception as exc:  # pragma: no cover - validation is exercised as part of request handling
        raise ValueError('The uploaded file is not a valid supported image.') from exc

    payload = image.read()
    image_hash = hashlib.sha256(payload).hexdigest()

    if current_app.config.get('USE_CLOUDINARY') and cloudinary is not None and cloudinary_uploader is not None:
        result = cloudinary_uploader.upload(
            payload,
            folder='fitzii/garments',
            public_id=f'{garment_id}-{uuid.uuid4().hex}',
            resource_type='image',
        )
        image_url = result.get('secure_url') or result.get('url')
        if not image_url:
            raise ValueError('Cloudinary upload failed. Please check your credentials.')
        return image_url, image_url, image_hash

    safe = f'{uuid.uuid4().hex}.{ext}'
    target = Path(current_app.config['MEDIA_DIR']) / safe
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('wb') as saved:
        saved.write(payload)
    return f'/media/{safe}', f'/media/{safe}', image_hash


@api.post('/wardrobe/<string:garment_id>/image')
def upload_image(garment_id):
    g = db.session.get(Garment, garment_id)
    image = request.files.get('image')
    if not g: return error('Garment not found.', 'not_found', 404)
    try:
        image_path, thumbnail_path, image_hash = _save_uploaded_image(image, garment_id)
    except ValueError as exc:
        return error(str(exc))

    g.image_path = image_path
    g.thumbnail_path = thumbnail_path
    g.source_filename = secure_filename((image.filename or 'upload').split('/')[-1])
    g.source_hash = image_hash
    db.session.commit()
    return jsonify(item=record(g))

@api.get('/accounts')
def list_accounts():
    accounts = UserAccount.query.order_by(UserAccount.created_at.asc()).all()
    return jsonify(accounts=[{
        'id': account.id,
        'username': account.username,
        'displayName': account.display_name,
        'isDemo': account.is_demo,
        'createdAt': account.created_at.isoformat() if account.created_at else None,
    } for account in accounts])


def serialize_user(account):
    return {
        'id': account.id,
        'username': account.username,
        'displayName': account.display_name,
        'name': account.display_name,
        'isDemo': account.is_demo,
    }


def current_user():
    user_id = session.get('user_id')
    if not user_id:
        return None
    return db.session.get(UserAccount, user_id)


@api.post('/auth/register')
def auth_register():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username', '')).strip()
    password = str(data.get('password', ''))
    display_name = str(data.get('displayName') or data.get('name') or username).strip() or 'Fitzii User'

    if not username:
        return error('Username is required.', 'validation_error', 400)
    if len(password) < 6:
        return error('Password must be at least 6 characters.', 'validation_error', 400)
    if UserAccount.query.filter_by(username=username).first():
        return error('Username already exists.', 'conflict', 409)

    account = UserAccount(
        username=username,
        password_hash=generate_password_hash(password),
        display_name=display_name,
        is_demo=False,
    )
    db.session.add(account)
    db.session.commit()
    session['user_id'] = account.id

    response = make_response(jsonify(user=serialize_user(account)))
    response.set_cookie('csrf_access_token', uuid.uuid4().hex, samesite='Lax', secure=False)
    return response, 201


@api.post('/auth/login')
def auth_login():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username', '')).strip()
    password = str(data.get('password', ''))

    if not username or not password:
        return error('Username and password are required.', 'validation_error', 400)

    account = UserAccount.query.filter_by(username=username).first()
    if not account or not check_password_hash(account.password_hash, password):
        return error('Invalid username or password.', 'auth_error', 401)

    session['user_id'] = account.id
    response = make_response(jsonify(user=serialize_user(account)))
    response.set_cookie('csrf_access_token', uuid.uuid4().hex, samesite='Lax', secure=False)
    return response


@api.post('/auth/logout')
def auth_logout():
    session.clear()
    response = make_response(jsonify(ok=True))
    response.delete_cookie('csrf_access_token')
    return response


@api.get('/auth/me')
def auth_me():
    account = current_user()
    if not account:
        return error('Not authenticated.', 'auth_error', 401)
    return jsonify(user=serialize_user(account))


@api.get('/sync')
def sync_user_state():
    account = current_user()
    if not account:
        return error('Authentication required.', 'auth_error', 401)

    wardrobe = [record(g) for g in Garment.query.filter_by(account_id=account.id).order_by(Garment.created_at).all()]
    profile = db.session.query(UserProfile).filter_by(account_id=account.id).first()
    if profile:
        profile_data = {
            **(profile.extra or {}),
            'height': profile.height,
            'heightUnit': profile.height_unit,
            'weight': profile.weight,
            'weightUnit': profile.weight_unit,
            'measurements': profile.measurements,
            'fitPreferences': profile.fit_preferences,
            'notes': profile.notes,
        }
    else:
        profile_data = {}

    prefs = Preferences.query.order_by(Preferences.id.asc()).first()
    history = [
        {'id': row.id, 'garmentIds': row.garment_ids, 'context': row.context, 'mode': row.mode, 'score': row.score, 'scoreComponents': row.score_components, 'feedback': row.feedback, 'createdAt': row.created_at.isoformat()}
        for row in OutfitHistory.query.order_by(OutfitHistory.created_at.desc()).limit(100).all()
    ]

    return jsonify({
        'user': serialize_user(account),
        'wardrobe': wardrobe,
        'profile': profile_data,
        'preferences': prefs.data if prefs else {},
        'history': history,
    })


@api.post('/accounts')
def create_account():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username', '')).strip()
    password = str(data.get('password', ''))
    display_name = str(data.get('displayName') or data.get('name') or username).strip() or 'Fitzii User'

    if not username:
        return error('Username is required.', 'validation_error', 400)
    if len(password) < 6:
        return error('Password must be at least 6 characters.', 'validation_error', 400)
    if UserAccount.query.filter_by(username=username).first():
        return error('Username already exists.', 'conflict', 409)

    account = UserAccount(
        username=username,
        password_hash=generate_password_hash(password),
        display_name=display_name,
        is_demo=False,
    )
    db.session.add(account)
    db.session.commit()
    session['user_id'] = account.id
    return jsonify(account=serialize_user(account)), 201


@api.post('/login')
def login_account():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username', '')).strip()
    password = str(data.get('password', ''))

    if not username or not password:
        return error('Username and password are required.', 'validation_error', 400)

    account = UserAccount.query.filter_by(username=username).first()
    if not account or not check_password_hash(account.password_hash, password):
        return error('Invalid username or password.', 'auth_error', 401)

    session['user_id'] = account.id
    return jsonify(account=serialize_user(account))


@api.get('/profile')
def get_profile():
    p = db.session.get(UserProfile, 1)
    return jsonify(profile={**(p.extra or {}),'height':p.height,'heightUnit':p.height_unit,'weight':p.weight,'weightUnit':p.weight_unit,'measurements':p.measurements,'fitPreferences':p.fit_preferences,'notes':p.notes} if p else {})

@api.put('/profile')
def put_profile():
    data = request.get_json(silent=True)
    if not isinstance(data, dict): return error('Profile must be a JSON object.')
    for key in ('height','weight'):
        if data.get(key) is not None and (not isinstance(data[key], (int,float)) or data[key] <= 0): return error(f'{key} must be a positive number.')
    if data.get('heightUnit','cm') not in {'cm','in'}: return error('heightUnit must be cm or in.')
    if data.get('weightUnit') and data['weightUnit'] not in {'kg','lb'}: return error('weightUnit must be kg or lb.')
    measurements=data.get('measurements') or []
    if not isinstance(measurements,(list,dict)): return error('measurements must be an array or object.')
    if isinstance(measurements,list):
        for measurement in measurements:
            if not isinstance(measurement,dict): return error('Each measurement must be an object.')
            value=measurement.get('value')
            if value is not None and (not isinstance(value,(int,float)) or value <= 0): return error('Measurement values must be positive numbers.')
            if value is not None and measurement.get('unit') not in {'cm','in','kg','lb'}: return error('Each measurement must include a supported unit.')
    p = db.session.get(UserProfile, 1) or UserProfile(id=1)
    p.height=data.get('height'); p.height_unit=data.get('heightUnit','cm'); p.weight=data.get('weight'); p.weight_unit=data.get('weightUnit')
    p.measurements=data.get('measurements') or {}; p.fit_preferences=data.get('fitPreferences') or {}; p.notes=data.get('notes')
    p.extra={k:v for k,v in data.items() if k not in {'height','heightUnit','weight','weightUnit','measurements','fitPreferences','notes'}}
    db.session.add(p); db.session.commit(); return get_profile()

@api.get('/preferences')
def get_preferences():
    p=db.session.get(Preferences,1); return jsonify(preferences=p.data if p else {})

@api.put('/preferences')
def put_preferences():
    data=request.get_json(silent=True)
    if not isinstance(data,dict): return error('Preferences must be a JSON object.')
    p=db.session.get(Preferences,1) or Preferences(id=1,data=data); p.data=data; db.session.add(p); db.session.commit()
    return jsonify(preferences=p.data)

@api.post('/recommendations')
def recommendations():
    data=request.get_json(silent=True) or {}
    garments=[record(g) for g in Garment.query.filter_by(status='available').all()]
    p=db.session.get(UserProfile,1)
    profile=({**(p.extra or {}),'height':p.height,'heightUnit':p.height_unit,'weight':p.weight,'weightUnit':p.weight_unit,'measurements':p.measurements,'fitPreferences':p.fit_preferences,'notes':p.notes} if p else None)
    preferences=data.get('preferences') or {}
    saved=db.session.get(Preferences,1)
    if saved: preferences={**saved.data,**preferences}
    history=[{'items': h.garment_ids, 'timestamp': h.created_at.timestamp()*1000} for h in OutfitHistory.query.order_by(OutfitHistory.created_at.desc()).limit(40).all()]
    payload={'garments':garments,'context':data.get('context','casual'),'preferences':preferences,'history':history,'profile':profile,'limit':data.get('limit',6),'template':data.get('template')}
    script=Path(__file__).resolve().parents[1] / 'recommendations.mjs'
    try:
        result=subprocess.run(['node',str(script)],input=json.dumps(payload),text=True,capture_output=True,timeout=10,check=True)
        return jsonify(outfits=json.loads(result.stdout))
    except Exception:
        current_app.logger.exception('Recommendation engine failed')
        return error('Unable to generate recommendations.', 'recommendation_error', 500)

@api.get('/history')
def get_history():
    rows=OutfitHistory.query.order_by(OutfitHistory.created_at.desc()).limit(100).all()
    return jsonify(items=[{'id':r.id,'garmentIds':r.garment_ids,'context':r.context,'mode':r.mode,'score':r.score,'scoreComponents':r.score_components,'feedback':r.feedback,'createdAt':r.created_at.isoformat()} for r in rows])

@api.post('/history')
def add_history():
    data=request.get_json(silent=True) or {}
    if not isinstance(data.get('garmentIds'),list): return error('garmentIds must be an array.')
    row=OutfitHistory(id=data.get('id') or str(uuid.uuid4()),garment_ids=data['garmentIds'],context=data.get('context'),mode=data.get('mode'),score=data.get('score'),score_components=data.get('scoreComponents') or {},feedback=data.get('feedback'))
    row.garments=Garment.query.filter(Garment.id.in_(data['garmentIds'])).all() if data['garmentIds'] else []
    db.session.add(row); db.session.commit(); return jsonify(id=row.id),201

@api.post('/import')
def import_items():
    data=request.get_json(silent=True) or {}
    items=data.get('items',[])
    if not isinstance(items,list): return error('items must be an array.')
    report={'created':[],'skipped':[],'failed':[]}
    for item in items:
        clean, problems=validate_payload(item)
        if problems: report['failed'].append({'id':item.get('id'),'errors':problems}); continue
        source_hash=item.get('source_hash') or (item.get('attributes') or {}).get('sourceHash')
        if (clean.get('id') and db.session.get(Garment,clean['id'])) or (source_hash and Garment.query.filter_by(source_hash=source_hash).first()):
            report['skipped'].append(clean.get('id')); continue
        clean['id']=clean.get('id') or str(uuid.uuid4())
        g=Garment(id=clean['id'],name=clean['name'],category=clean['category'],source_filename=item.get('source_filename'),source_hash=source_hash,review_status=item.get('review_status','needs_review'),confidence=item.get('confidence'))
        apply_garment(g,clean); db.session.add(g); report['created'].append(g.id)
    db.session.commit()
    return jsonify(report), 207 if report['failed'] else 200
