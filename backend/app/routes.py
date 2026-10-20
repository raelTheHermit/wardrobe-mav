import hashlib
import json
import os
import subprocess
import uuid
from pathlib import Path
from flask import Blueprint, current_app, jsonify, request
from marshmallow import Schema, fields, ValidationError, INCLUDE
from werkzeug.utils import secure_filename
from . import db
from .models import Garment, OutfitHistory, Preferences, UserProfile

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

@api.post('/wardrobe/<string:garment_id>/image')
def upload_image(garment_id):
    g = db.session.get(Garment, garment_id)
    image = request.files.get('image')
    if not g: return error('Garment not found.', 'not_found', 404)
    if not image or not image.filename or '.' not in image.filename: return error('Choose an image file.')
    ext = image.filename.rsplit('.',1)[1].lower()
    if ext not in ALLOWED: return error('Use JPG, PNG, WEBP, or AVIF.')
    # Validate actual content with Pillow before storing.
    try:
        from PIL import Image
        image.stream.seek(0); checked = Image.open(image.stream); checked.verify(); image.stream.seek(0)
        expected = {'jpg':'JPEG','jpeg':'JPEG','png':'PNG','webp':'WEBP','avif':'AVIF'}[ext]
        if checked.format != expected: raise ValueError('Image extension does not match its content')
    except Exception: return error('The uploaded file is not a valid supported image.')
    safe = f'{uuid.uuid4().hex}.{ext}'
    image.save(Path(current_app.config['MEDIA_DIR']) / safe)
    g.image_path = f'/media/{safe}'; g.source_filename = secure_filename(image.filename)
    g.source_hash = hashlib.sha256((Path(current_app.config['MEDIA_DIR']) / safe).read_bytes()).hexdigest()
    db.session.commit()
    return jsonify(item=record(g))

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
    payload={'garments':garments,'context':data.get('context','casual'),'preferences':preferences,'history':history,'profile':profile,'limit':data.get('limit',6)}
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
