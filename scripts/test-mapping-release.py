"""Check editorial identity, unchanged detail pages, and internal Mapping links."""
import hashlib
import json
import pathlib
import subprocess
import sys
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

root = pathlib.Path(__file__).resolve().parents[1]
baseline = sys.argv[1] if len(sys.argv) > 1 else 'backup/mapping-pre-redesign-2026-10-25'

def original(path):
    return subprocess.check_output(['git', 'show', f'{baseline}:{path}'], cwd=root)

def normalized(data):
    # Windows checkouts use CRLF; compare the committed content, not checkout EOLs.
    return data.replace(b'\r\n', b'\n')

for name in ['mapping-records.json', 'mapping-references.json', 'mapping-country-profiles.json']:
    path = f'data/mapping/{name}'
    assert normalized((root/path).read_bytes()) == normalized(original(path)), f'Editorial JSON changed: {path}'
assert normalized((root/'vercel.json').read_bytes()) == normalized(original('vercel.json')), 'Public routing changed'

details = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', baseline, 'mapping'], cwd=root, text=True).splitlines()
for path in details:
    assert normalized((root/path).read_bytes()) == normalized(original(path)), f'Existing detail page changed: {path}'

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])

out = root/'public'
broken = set()
count = 0
pages = [out/'mapping.html', *sorted((out/'mapping').rglob('*.html'))]
for page in pages:
    parser = Links()
    parser.feed(page.read_text(encoding='utf-8'))
    for href in parser.links:
        url = urlsplit(href)
        if url.scheme and url.netloc != 'displacementpolicy.org':
            continue
        if not url.path.startswith('/'):
            continue
        count += 1
        route = unquote(url.path).rstrip('/')
        target = out/route.lstrip('/')
        options = [target, pathlib.Path(str(target)+'.html'), target/'index.html']
        if route == '':
            options = [out/'index.html']
        if not any(p.is_file() for p in options):
            broken.add(href)
assert not broken, f'Broken internal links: {sorted(broken)}'

print(json.dumps({'status':'pass', 'unchangedDetailFiles':len(details), 'linkOccurrences':count,
                  'pagesChecked':len(pages), 'editorialJSON':'byte-identical', 'routing':'unchanged'}, indent=2))
