import os
from pathlib import Path
from flask import Flask, jsonify
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
    )
    if test_config:
        app.config.update(test_config)
    CORS(app, origins=[os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173')])
    db.init_app(app)
    migrate.init_app(app, db)
    Path(app.config['MEDIA_DIR']).mkdir(parents=True, exist_ok=True)

    from . import models
    from .routes import api
    app.register_blueprint(api, url_prefix='/api')

    @app.get('/media/<path:filename>')
    def media(filename):
        from flask import send_from_directory
        return send_from_directory(app.config['MEDIA_DIR'], filename)

    @app.errorhandler(413)
    def too_large(_):
        return jsonify(error={'code': 'file_too_large', 'message': 'Image must be 10 MB or smaller.'}), 413

    @app.errorhandler(SQLAlchemyError)
    def database_error(_):
        db.session.rollback()
        app.logger.exception('Database request failed')
        return jsonify(error={'code': 'database_error', 'message': 'The database request failed.'}), 500

    return app
