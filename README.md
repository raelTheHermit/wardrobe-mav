# Fitzii

Fitzii is a personal outfit-planning app built from a simple idea: not everyone has the fashion sense to dress their best, and a good wardrobe system should make decisions easier instead of more stressful.

This project started as a personal tool to help me get dressed with less guesswork. It turns a closet into a recommendation engine: it looks at what I own, how it fits, what looks good together, and which outfit best matches the moment.

The app uses a deterministic, rule-based outfit engine in the frontend. The Flask recommendations endpoint calls that same engine through `backend/recommendations.mjs`.

## What Fitzii does

- tracks the wardrobe items you actually own
- scores outfit combinations against context, fit, formality, and color harmony
- personalizes suggestions using your profile and style preferences
- saves favorite outfits and keeps a small history of previous picks
- keeps the app shell and cached wardrobe available offline after the PWA has loaded once
- saves wardrobe, profile, preference, and outfit-history changes locally and queues supported API writes for sync after reconnecting

## Why the app exists

The landing-page story is intentionally personal: this is primarily my own wardrobe companion. I wanted a tool that would help me dress better with less friction, not a generic “fashion AI” experience that feels distant or over-designed.

The main dashboard puts that story front and center: the Today screen shows a founder-style introduction, and the recommendation cards sit underneath it, so the app feels more like a personal style assistant than a polished SaaS demo.

## How the scoring works

Fitzii does not rely on a black-box model. It applies explicit style rules and weighted checks to each outfit candidate.

The engine builds candidates from the available garments, removes incoherent combinations, scores each outfit from 0 to 1, then picks a varied top set. Its default weights are:

```text
compatibility × 0.26 + aesthetic × 0.18 + context × 0.18
+ personal × 0.12 + silhouette × 0.08 + fit × 0.08
+ template × 0.06 + novelty × 0.04
```

Factors without evidence are skipped and the active weights are renormalized to 1. Fit needs profile measurements, novelty needs outfit history, and template fit is only used when a vibe is selected. Aesthetic is scored when a selected aesthetic has garment data to compare.

For example, when aesthetic, fit, novelty, and template fit have no usable evidence:

```text
active factors = compatibility, context, personal, silhouette
active weight = 0.26 + 0.18 + 0.12 + 0.08 = 0.64
score = (compatibility × 0.26 + context × 0.18
       + personal × 0.12 + silhouette × 0.08) / 0.64
```

Compatibility combines color, pattern, formality, and style scores for garment pairs, then accounts for hue variety, loud patterns, and formality spread across the outfit. Context checks occasion formality and weather. Personal preference uses selected styles, colors, materials, exclusions, and formality bias. Silhouette checks garment proportions. Each outfit card shows an explanation based on the available score breakdown.

`bodyProfile.js` supplies the fit score when the profile has measurements. The vibe selector offers Day Ease, City Formal, Weekend Creative, Alté, Old Money, and One Piece. Each template can constrain formality, exclude items, control color and pattern mixing, and contribute a template-fit score. “All vibes” generates candidates across templates.

Garment data can come from form fields or AI/API tagging. The feature normalizer infers missing family, color, pattern, formality, and climate details from garment names where possible. Unavailable details remain unknown and are excluded from factors that need them.

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

In a second terminal, run the frontend:

```sh
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The frontend connects to `http://localhost:5000/api` by default. Set `VITE_API_BASE_URL` in `frontend/.env.local` to use another API URL. Create an account or sign in while online to establish the server session. After the app has loaded once, its PWA shell and locally cached data remain available offline; changes to wardrobe items, profile, preferences, and outfit history are queued and retried when the browser reports that it is online. Account registration and login require a connection. Installable PWA behavior requires HTTPS in deployment (localhost is treated as secure for development).

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

These commands run the frontend lint checks, test suite, and production build.

## Notes

Fitzii is intentionally not a generic fashion app template. It is a small personal system for building better outfits from what you already own, with the recommendation logic tuned for my own wardrobe and style habits.
