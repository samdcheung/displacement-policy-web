#!/usr/bin/env python3
"""Fail-closed checks for deployed Mapping after npm run build."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
repo=Path(sys.argv[1]).expanduser().resolve() if len(sys.argv)>1 else Path.cwd()
records=json.loads((repo/'data/mapping/mapping-records.json').read_text(encoding="utf-8"))['records']
refs=json.loads((repo/'data/mapping/mapping-references.json').read_text(encoding="utf-8"))['references']
profiles=json.loads((repo/'data/mapping/mapping-country-profiles.json').read_text(encoding="utf-8"))['countries']
assert len(records)>=33 and len(refs)>=218 and len(profiles)>=13,(len(records),len(refs),len(profiles))
assert len({r['id'] for r in records})==len(records)
assert len({r['slug'] for r in records})==len(records)
for r in records:
    assert (repo/'public/mapping'/r['slug']/'index.html').is_file(),r['slug']
for p in ['public/mapping.html','public/assets/mapping-ui/mapping.css','public/assets/mapping-ui/mapping.js','public/mapping/indonesia-dtsen/index.html']:
    assert (repo/p).is_file(),p
html=(repo/'public/mapping.html').read_text(encoding="utf-8")
assert 'How does responsibility for displaced people hold—or break?' in html
assert '/assets/mapping-ui/mapping.js' in html
assert '/mapping/indonesia-dtsen' in html
assert '<meta name="robots" content="noindex' not in html
page=(repo/'public/mapping/indonesia-dtsen/index.html').read_text(encoding="utf-8")
assert '<link rel="canonical" href="https://displacementpolicy.org/mapping/indonesia-dtsen"' in page
assert 'Indonesia DTSEN (National Socio-Economic Single Data) | Displacement Policy' in page
routes=json.loads((repo/'vercel.json').read_text(encoding="utf-8"))['routes']
assert any(x.get('src')=='/mapping/indonesia-dtks-siks-ng' and x.get('status')==308 and x.get('headers',{}).get('Location')=='/mapping/indonesia-dtsen' for x in routes)
print(json.dumps({'status':'pass','records':len(records),'references':len(refs),'profiles':len(profiles),'dtsen':'preserved','dtksRedirect':'preserved','note':'Still compare production Vercel routes and HTML against release candidate.'},indent=2))
