import os
from pathlib import Path

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv


db = SQLAlchemy()
migrate = Migrate()


def create_app(test_config=None):
    load_dotenv(Path(__file__).resolve().parents[1] / '.env')
    app = Flask(__name__)
    db_url = os.getenv('DATABASE_URL')
    if not db_url and not test_config:
        raise RuntimeError('DATABASE_URL is required. Copy backend/.env.example to backend/.env and configure PostgreSQL.')

    app.config.update(
        SQLALCHEMY_DATABASE_URI=db_url or 'sqlite:///:memory:',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SECRET_KEY=os.getenv('FLASK_SECRET_KEY', 'development-only'),
        MEDIA_DIR=os.getenv('MEDIA_DIR', str(Path(__file__).resolve().parents[1] / 'media')),
        MAX_CONTENT_LENGTH=int(os.getenv('MAX_UPLOAD_BYTES', 10 * 1024 * 1024)),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE=os.getenv('SESSION_COOKIE_SAMESITE', 'Lax'),
        SESSION_COOKIE_SECURE=str(os.getenv('SESSION_COOKIE_SECURE', 'false')).lower() == 'true',
    )
    if test_config:
        app.config.update(test_config)

    allowed_origins = [
        origin.strip()
        for origin in os.getenv(
            'FRONTEND_ORIGIN',
            'http://localhost:5173,https://fitzii.vercel.app,https://www.fitzii.vercel.app,https://app-nu-seven-87.vercel.app',
        ).split(',')
        if origin.strip()
    ]

    CORS(
        app,
        resources={r'/api/*': {'origins': allowed_origins}},
        supports_credentials=True,
        allow_headers=['Content-Type', 'Authorization', 'X-CSRF-TOKEN'],
        methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    )

    db.init_app(app)
    migrate.init_app(app, db)
    Path(app.config['MEDIA_DIR']).mkdir(parents=True, exist_ok=True)

    from . import models  # noqa: F401
    from .routes import api

    with app.app_context():
        if app.config.get('TESTING') or str(app.config.get('SQLALCHEMY_DATABASE_URI', '')).startswith('sqlite'):
            db.create_all()

    app.register_blueprint(api, url_prefix='/api')

    @app.before_request
    def enforce_auth():
        if request.path.startswith('/api/auth/') or request.path == '/api/health':
            return
        if not request.path.startswith('/api/'):
            return
        if not session.get('user_id'):
            return jsonify(error={'code': 'unauthorized', 'message': 'Authentication required.'}), 401

        if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
            if session.get('csrf_token') and request.headers.get('X-CSRF-TOKEN') != session.get('csrf_token'):
                return jsonify(error={'code': 'csrf_error', 'message': 'Invalid CSRF token.'}), 403

    @app.get('/media/<path:filename>')
    def media(filename):
        from flask import send_from_directory
        return send_from_directory(app.config['MEDIA_DIR'], filename)

    @app.get('/media/<user_id>/<path:filename>')
    def media_for_user(user_id, filename):
        if session.get('user_id') != user_id:
            return jsonify(error={'code': 'forbidden', 'message': 'Not allowed.'}), 403
        from flask import send_from_directory
        return send_from_directory(str(Path(app.config['MEDIA_DIR']) / user_id), filename)

    @app.errorhandler(413)
    def too_large(_):
        return jsonify(error={'code': 'file_too_large', 'message': 'Image must be 10 MB or smaller.'}), 413

    @app.errorhandler(SQLAlchemyError)
    def database_error(_):
        db.session.rollback()
        app.logger.exception('Database request failed')
        return jsonify(error={'code': 'database_error', 'message': 'The database request failed.'}), 500

    return app

