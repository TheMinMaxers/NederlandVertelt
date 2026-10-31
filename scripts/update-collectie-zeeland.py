"""Refresh museum locations from published Collectie Zeeland JSON and exact BAG addresses.
Run: python3 scripts/update-collectie-zeeland.py
No API key required. Object production places are never used as museum locations.
"""
import datetime
import html
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request

SOURCE = 'https://collectiezeeland.nl/wp-json/wp/v2/participant?per_page=100'
CATALOG = 'https://zoeken.collectiezeeland.nl/Atlantispubliek/data/set/catalog'
GEOCODER = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free'
# Non-museum participants: library, sailing foundation and supporting organisations.
EXCLUDED = {1779, 1357, 1690, 1485}

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'NederlandVertelt/1.0'})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response)

def text(value):
    return html.unescape(re.sub('<[^>]+>', '', value)).strip()

def main():
    locations, skipped = [], []
    for participant in fetch(SOURCE):
        if participant['id'] in EXCLUDED:
            continue
        content = participant['content']['rendered']
        contact = re.search(r'Contact.*?</h[1-6]>(.*?)(?:</p>)', content, re.S)
        lines = [text(line) for line in re.split(r'<br\s*/?>', contact.group(1))] if contact else []
        postal = re.search(r'(\d{4})\s*([A-Z]{2})\s+(.+)', lines[-1] if lines else '')
        number = re.search(r'\s(\d+)([a-zA-Z]?)(?:-\d+)?$', lines[-2] if len(lines) > 1 else '')
        if not postal or not number:
            skipped.append(participant['link'])
            continue
        postcode = postal[1] + postal[2]
        query = urllib.parse.urlencode({'q': f'{postcode} {number[1]}{number[2]}', 'fq': ['type:adres', f'postcode:{postcode}', f'huisnummer:{number[1]}'], 'rows': 20}, doseq=True)
        docs = fetch(GEOCODER + '?' + query)['response']['docs']
        matches = [d for d in docs if d.get('postcode') == postcode and str(d.get('huisnummer')) == number[1] and (d.get('huisletter', '').lower() == number[2].lower())]
        if len(matches) != 1:
            skipped.append(participant['link'])
            print('Ambiguous/missing exact address:', participant['title']['rendered'])
            continue
        address = matches[0]
        coordinates = re.fullmatch(r'POINT\(([-\d.]+) ([-\d.]+)\)', address['centroide_ll'])
        if not coordinates:
            raise ValueError('Invalid BAG coordinates')
        objects = []
        for start in re.finditer(r'console\.log\(', content):
            try:
                workset, _ = json.JSONDecoder().raw_decode(content[start.end():])
            except ValueError:
                continue
            for record in workset.get('result', {}).get('records', []):
                title = re.search(r'<strong>(.*?)</strong>', record.get('BESCHRIJVING', ''), re.S)
                if title and record.get('detaillink', '').startswith('https://zoeken.collectiezeeland.nl/'):
                    objects.append({'title': text(title[1]), 'url': record['detaillink']})
        locations.append({'name': text(participant['title']['rendered']), 'url': participant['link'], 'address': address['weergavenaam'], 'town': address['woonplaatsnaam'], 'coordinates': [float(coordinates[2]), float(coordinates[1])], 'addressSource': address['rdf_seealso'], 'objects': list({o['url']: o for o in objects}.values())})
    if not locations:
        raise ValueError('No validated locations; keeping existing snapshot')
    target = Path(__file__).resolve().parents[1] / 'src/data/collectie-zeeland.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps({'updated': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'source': SOURCE, 'catalog': CATALOG, 'geocoder': GEOCODER, 'skipped': skipped, 'locations': locations}, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(locations)} locations, {sum(len(p["objects"]) for p in locations)} collection links, {len(skipped)} skipped')

if __name__ == '__main__':
    main()
