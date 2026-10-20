# Wardrobe AI

Wardrobe AI keeps its existing React interface and deterministic outfit scoring engine, with a Flask API and PostgreSQL persistence layer. The scoring code remains in `src/engine`; Flask calls that same code through Node for recommendations, so the browser and server do not maintain separate ranking implementations.

## Backend setup

Requirements: Python 3.10+, Node.js (for the existing recommendation engine), and a running PostgreSQL server. Create an empty database and a local backend environment file:

```sh
createdb wardrobe
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set `DATABASE_URL` in `backend/.env` to a PostgreSQL SQLAlchemy URL, for example `postgresql+psycopg://wardrobe:password@localhost:5432/wardrobe`. Set a private `FLASK_SECRET_KEY`. Never commit `.env`.

Apply the committed initial schema and start Flask:

```sh
flask --app wsgi:app db upgrade
flask --app wsgi:app run --debug
```

`backend/migrations/versions/0001_initial.py` defines the initial schema. After changing models, create a new revision with `flask --app wsgi:app db migrate -m "describe change"`, review it, then apply with `flask --app wsgi:app db upgrade`. `backend/app/models.py` defines the garment, profile, preferences, and outfit history tables. The API returns errors as `{ "error": { "code", "message", "details" } }`.

## Frontend

At the project root:

```sh
npm install
cp .env.example .env.local
npm run dev
```

`VITE_API_BASE_URL` defaults to `http://localhost:5000/api`. The Flask CORS origin defaults to Vite at `http://localhost:5173`; set `FRONTEND_ORIGIN` when that differs. Wardrobe, profile, preferences, recommendations, and outfit history use the API. The tutorial and saved outfit presentation remain browser-local UI state. Existing IndexedDB wardrobe/profile and local preference data are migrated additively when the API wardrobe is empty. Existing records are never replaced by the image importer.

## Image review and import

Original photos stay in `garments/`. `backend/import-manifest.json` records SHA-256 hashes and review status. Review each image visually and add one or more `items` with garment metadata before import. Leave ambiguous, inspiration, duplicate, or unrelated images without items; mark unrelated assets `status: "unrelated"`. An image may have multiple item records. Item IDs should be stable, and measurements must only be added when measured.

```sh
python3 backend/import_images.py --dry-run
```

After adding approved records, run the importer with the backend virtual environment active and `.env` configured:

```sh
cd backend
source .venv/bin/activate
python import_images.py
```

It copies approved images into `backend/media/`, leaves originals untouched, skips already imported source hashes/IDs, and prints created, skipped, pending review, and failed records. Dry-run prints intended changes without requiring PostgreSQL. Manually added records can use `POST /api/import`; duplicates are skipped and conflicting manually edited records are preserved. Local uploads are written under `backend/media/` with generated names. For production, replace local media with private object storage, serve through a CDN or signed URLs, and back up the database and media together.

## API overview

- `GET/POST /api/wardrobe`, `GET/PATCH/DELETE /api/wardrobe/<id>`
- `POST /api/wardrobe/<id>/image` multipart field `image`
- `GET/PUT /api/profile`, `GET/PUT /api/preferences`
- `POST /api/recommendations` with context, preferences, and optional limit
- `GET/POST /api/history`
- `POST /api/import`
- `GET /api/health`

The image manifest currently contains 43 photos under `garments/` and the app's unrelated `src/assets/hero.png`. The photos show wardrobe pieces (including tops, bottoms, shoes, and accessories); the review manifest leaves their records unclassified until each is reviewed at full resolution. This avoids guessing material, fit, hidden color details, or whether multi-item photos represent separate owned garments.

## Checks

```sh
npm run lint
npm test
npm run build
```

Backend tests and live database migration/API checks require installing `backend/requirements.txt` and configuring a separate test PostgreSQL database. Never point destructive checks at a personal wardrobe database.
