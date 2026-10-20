"""Safe, repeatable import of manually reviewed image classifications."""
import argparse, hashlib, json, os, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'backend' / 'import-manifest.json'
EXTENSIONS = {'.jpg','.jpeg','.png','.webp','.avif'}

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    return h.hexdigest()

def discover():
    files=[]
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or path.suffix.lower() not in EXTENSIONS: continue
        if any(part in {'node_modules','.git','dist','backend/media'} for part in path.parts): continue
        files.append({'source':path.relative_to(ROOT).as_posix(),'sha256':digest(path),'status':'manual_review','items':[]})
    return files

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--dry-run',action='store_true')
    parser.add_argument('--write-manifest',action='store_true')
    args=parser.parse_args()
    discovered=discover()
    if args.write_manifest or not MANIFEST.exists():
        old={}
        if MANIFEST.exists():
            old={entry['source']:entry for entry in json.loads(MANIFEST.read_text()).get('images',[])}
        merged=[]
        for image in discovered:
            prior=old.get(image['source'])
            if prior and prior.get('sha256') == image['sha256']:
                image.update({k:v for k,v in prior.items() if k not in {'source','sha256'}})
            merged.append(image)
        MANIFEST.write_text(json.dumps({'version':1,'images':merged},indent=2)+'\n')
        print(f'Manifest updated: {len(merged)} discovered images; unchanged reviewed classifications were preserved.')
        return
    manifest=json.loads(MANIFEST.read_text())
    images=manifest.get('images',[])
    report={'created':[],'skipped':[],'needs_review':[],'failed':[]}
    manifest_sources={entry.get('source') for entry in images}
    report['unmanifested']=[entry['source'] for entry in discovered if entry['source'] not in manifest_sources]
    if args.dry_run:
        for image in images:
            if image.get('status') == 'unrelated':
                report['skipped'].append(image['source'])
            elif image.get('items'):
                report['created'].extend(item.get('id') or image['sha256'][:24] for item in image['items'])
            else:
                report['needs_review'].append(image['source'])
        print(json.dumps({'mode':'dry-run','discovered':len(discovered),'report':report},indent=2))
        return
    from app import create_app, db
    from app.models import Garment
    from app.routes import validate_payload
    app=create_app()
    with app.app_context():
        for image in images:
            if image.get('status') == 'unrelated':
                report['skipped'].append(image['source']); continue
            path=(ROOT / image['source']).resolve()
            if ROOT.resolve() not in path.parents or not path.is_file():
                report['failed'].append({'source':image.get('source'),'error':'Missing or unsafe image path'}); continue
            current_hash=digest(path)
            if current_hash != image.get('sha256'):
                report['failed'].append({'source':image['source'],'error':'Image changed since manifest review'}); continue
            items=image.get('items') or []
            if not items:
                report['needs_review'].append(image['source']); continue
            if Garment.query.filter_by(source_hash=current_hash).first():
                report['skipped'].append(image['source']); continue
            media_dir=Path(app.config['MEDIA_DIR'])
            stored=f'{current_hash}{path.suffix.lower()}'
            destination=media_dir / stored
            for item in items:
                clean, problems = validate_payload(item)
                if problems:
                    report['failed'].append({'source':image['source'],'errors':problems}); continue
                source_id=item.get('id') or f"import-{current_hash[:24]}-{len(report['created'])}"
                if Garment.query.filter_by(id=source_id).first():
                    report['skipped'].append(source_id); continue
                if not destination.exists(): shutil.copy2(path,destination)
                record=dict(clean); record.setdefault('name',Path(image['source']).stem); record.setdefault('category','unknown')
                record.setdefault('status','available'); record.setdefault('review_status','needs_review')
                record['id']=source_id; record['image_path']=f'/media/{stored}'; record['source_filename']=path.name; record['source_hash']=current_hash
                reserved={k:record.pop(k,None) for k in ('id','name','category','type','subtype','color','pattern','material','fit','silhouette','formality','status','image_path','thumbnail_path','source_filename','source_hash','review_status','confidence')}
                g=Garment(**reserved,attributes=record); db.session.add(g); report['created'].append(source_id)
        if not args.dry_run: db.session.commit()
    print(json.dumps({'mode':'dry-run' if args.dry_run else 'import','discovered':len(discovered),'report':report},indent=2))

if __name__=='__main__': main()
