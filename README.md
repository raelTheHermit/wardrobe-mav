# Fitzii

Fitzii is a personal outfit-planning app built from a simple idea: not everyone has the fashion sense to dress their best, and a good wardrobe system should make decisions easier instead of more stressful.

This project started as a personal tool to help me get dressed with less guesswork. It turns a closet into a recommendation engine: it looks at what I own, how it fits, what looks good together, and which outfit best matches the moment.

The app keeps a deterministic scoring engine in the frontend and exposes the same logic through the Flask API, so the browser and server use the same recommendation rules instead of drifting into two separate interpretations.

## What Fitzii does

- tracks the wardrobe items you actually own
- scores outfit combinations against context, fit, formality, and color harmony
- personalizes suggestions using your profile and style preferences
- saves favorite outfits and keeps a small history of previous picks
- works offline while the browser queues local changes and syncs them when the connection returns

## Why the app exists

The landing-page story is intentionally personal: this is primarily my own wardrobe companion. I wanted a tool that would help me dress better with less friction, not a generic “fashion AI” experience that feels distant or over-designed.

The main dashboard puts that story front and center: the Today screen shows a founder-style introduction, and the recommendation cards sit underneath it, so the app feels more like a personal style assistant than a polished SaaS demo.

## How the scoring works

Fitzii does not rely on a black-box model. It applies explicit style rules and weighted checks to each outfit candidate.

A simple way to think about it is:

- a + b = 100
- a = the outfit’s fit, compatibility, and context score
- b = the style preference and personal fit score

In practice, the engine combines many sub-factors such as:

- silhouette compatibility
- color harmony
- occasion or context match
- formality balance
- garment variety and coordination
- personal style preference weighting

The result is a single score for each outfit recommendation, plus a breakdown so the user can see why a look rose to the top.

## Project layout

- backend/ — Flask API, SQLAlchemy models, recommendation bridge, media serving
- frontend/ — Vite + React app, PWA setup, wardrobe UI, dashboard experience
- garments/ — source wardrobe images and the exported metadata catalog

## Backend setup

Requirements: Python 3.10+, Node.js, and a PostgreSQL server.

```sh
createdb wardrobe
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set `DATABASE_URL` in `backend/.env` to your PostgreSQL connection, for example:

```sh
DATABASE_URL=postgresql+psycopg://wardrobe:password@localhost:5432/wardrobe
FLASK_SECRET_KEY=replace-with-a-random-local-secret
MEDIA_DIR=./media
```

Then run the database migrations and start Flask:

```sh
flask --app wsgi:app db upgrade
flask --app wsgi:app run --debug
```

## Frontend setup

At the repo root:

```sh
npm install
cp .env.example .env.local
npm run dev
```

The frontend connects to the local API at `http://localhost:5000/api` by default. The app is designed to work locally first, then sync queued writes when the network is available again.

## Image review and import

Original photos remain in `garments/`. `backend/import-manifest.json` tracks the source image hashes and the review status for imported wardrobe items.

```sh
python3 backend/import_images.py --dry-run
```

After reviewing the photo set and confirming which items are approved, run the importer from the backend environment:

```sh
cd backend
source .venv/bin/activate
python import_images.py
```

This copies approved images into `backend/media/`, keeps the originals untouched, and adds media links to the matching garments in the database. It skips already imported hash matches and preserves records that were manually edited.

## API overview

- `GET/POST /api/wardrobe`
- `GET/PATCH/DELETE /api/wardrobe/<id>`
- `POST /api/wardrobe/<id>/image`
- `GET/PUT /api/profile`
- `GET/PUT /api/preferences`
- `POST /api/recommendations`
- `GET/POST /api/history`
- `POST /api/import`
- `GET /api/health`

## Quality checks

```sh
npm run lint
npm test
npm run build
```

These checks are designed to validate the recommendation engine, browser UI, and production bundle while keeping the app easy to run locally.

## Notes

Fitzii is intentionally not a generic fashion app template. It is a small personal system for building better outfits from what you already own, with the recommendation logic tuned for my own wardrobe and style habits.
