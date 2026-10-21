#!/usr/bin/env python3
import argparse
import json
import os
import sys

from app import create_app, db
from app.models import Garment


def normalize_item(item):
    payload = dict(item)
    attributes = payload.pop('attributes', {}) or {}
    source_hash = payload.get('source_hash') or (
        attributes.get('sourceHash') if isinstance(attributes, dict) else None
    )
    return payload, attributes, source_hash


def seed_items(items):
    app = create_app()
    with app.app_context():
        inserted = 0
        updated = 0
        skipped = 0

        for item in items:
            if not isinstance(item, dict):
                skipped += 1
                continue

            payload, attributes, source_hash = normalize_item(item)
            item_id = payload.get('id')
            if not item_id:
                skipped += 1
                continue

            existing = Garment.query.get(item_id)
            if existing is None:
                g = Garment(
                    id=item_id,
                    name=payload['name'],
                    category=payload['category'],
                    type=payload.get('type'),
                    subtype=payload.get('subtype'),
                    color=payload.get('color'),
                    pattern=payload.get('pattern'),
                    material=payload.get('material'),
                    fit=payload.get('fit'),
                    silhouette=payload.get('silhouette'),
                    formality=payload.get('formality'),
                    visual_weight=payload.get('visual_weight'),
                    status=payload.get('status', 'available'),
                    image_path=payload.get('image_path'),
                    thumbnail_path=payload.get('thumbnail_path'),
                    source_filename=payload.get('source_filename'),
                    source_hash=source_hash,
                    review_status=payload.get('review_status', 'confirmed'),
                    confidence=payload.get('confidence'),
                    attributes=attributes,
                )
                db.session.add(g)
                inserted += 1
            else:
                for key, value in payload.items():
                    if key in {'id', 'attributes'}:
                        continue
                    setattr(existing, key, value)
                existing.visual_weight = payload.get('visual_weight')
                existing.status = payload.get('status', existing.status or 'available')
                existing.source_hash = source_hash
                existing.review_status = payload.get('review_status', existing.review_status or 'confirmed')
                existing.confidence = payload.get('confidence')
                existing.attributes = attributes
                updated += 1

        db.session.commit()
        return {
            'inserted': inserted,
            'updated': updated,
            'skipped': skipped,
            'total': Garment.query.count(),
        }


def main():
    parser = argparse.ArgumentParser(description='Seed garment data into the configured PostgreSQL database.')
    parser.add_argument('--file', help='Path to a JSON file containing a list of garment records.')
    parser.add_argument('--url', help='Database URL, or set DATABASE_URL in the environment.')
    args = parser.parse_args()

    database_url = args.url or os.getenv('DATABASE_URL')
    if not database_url:
        print('DATABASE_URL is required. Pass --url or set DATABASE_URL in the environment.', file=sys.stderr)
        raise SystemExit(1)

    os.environ['DATABASE_URL'] = database_url

    if args.file:
        with open(args.file, 'r', encoding='utf-8') as handle:
            data = json.load(handle)
    else:
        data = json.load(sys.stdin)

    if not isinstance(data, list):
        print('Expected a JSON list of garments.', file=sys.stderr)
        raise SystemExit(1)

    result = seed_items(data)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
