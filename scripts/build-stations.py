"""Génère src/data/stations.ts à partir de l'export Wikidata (scripts/wikidata-stations.json).

Usage : python3 scripts/build-stations.py
Les corrections manuelles ci-dessous priment sur Wikidata.
"""
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw = json.load(open(os.path.join(ROOT, 'scripts', 'wikidata-stations.json'), encoding='utf-8'))

# Lignes enregistrées dans Wikidata mais pas encore en service.
REMOVE_LINES = {
    'Bibliothèque François-Mitterrand': ['10'],
    'Montreuil - Hôpital': ['9'],
}
# Lieux mal renseignés (quartier au lieu d'arrondissement, etc.).
FIX_PLACES = {
    'Kléber': ['16'],
    'Notre-Dame-des-Champs': ['6'],
    'Porte Dauphine': ['16'],
    'Porte de Bagnolet': ['20'],
    'Temple': ['3'],
    'Boucicaut': ['15'],
}
TERMINI = {
    'La Défense', 'Château de Vincennes', 'Porte Dauphine', 'Nation',
    'Pont de Levallois - Bécon', 'Gallieni', 'Gambetta', 'Porte des Lilas',
    'Porte de Clignancourt', 'Bagneux - Lucie Aubrac', 'Bobigny - Pablo Picasso',
    "Place d'Italie", 'Charles de Gaulle - Étoile', 'La Courneuve - 8 Mai 1945',
    'Villejuif - Louis Aragon', "Mairie d'Ivry", 'Louis Blanc', 'Pré-Saint-Gervais',
    'Balard', 'Pointe du Lac', 'Pont de Sèvres', 'Mairie de Montreuil',
    'Boulogne - Pont de Saint-Cloud', "Gare d'Austerlitz", 'Châtelet',
    'Rosny-Bois-Perrier', "Mairie d'Issy", "Mairie d'Aubervilliers",
    'Châtillon - Montrouge', 'Saint-Denis - Université', 'Les Courtilles',
    'Saint-Denis Pleyel', "Aéroport d'Orly",
}
LINE_ORDER = ['1','2','3','3bis','4','5','6','7','7bis','8','9','10','11','12','13','14']

stations = []
for qid, s in raw.items():
    if s['state'] not in ([], ['en fonctionnement']):
        continue
    name = s['name'].replace('–', '-').strip()
    lines = [l for l in s['lines'] if l not in REMOVE_LINES.get(name, [])]
    if name in FIX_PLACES:
        arr, communes = [int(a) for a in FIX_PLACES[name]], []
    else:
        arr, communes = [], []
        for a in s['admin']:
            m = re.match(r'(\d+)', a)
            if 'arrondissement de Paris' in a and m:
                arr.append(int(m.group(1)))
            else:
                communes.append(a)
    if not arr and not communes:
        raise SystemExit(f'Lieu manquant : {name}')
    stations.append({
        'id': qid,
        'name': name,
        'lines': sorted(lines, key=LINE_ORDER.index),
        'arr': sorted(arr),
        'communes': sorted(communes),
        'terminus': name in TERMINI,
    })

missing = TERMINI - {s['name'] for s in stations}
if missing:
    raise SystemExit(f'Terminus introuvables : {missing}')
stations.sort(key=lambda s: s['name'])
out = os.path.join(ROOT, 'src', 'data', 'stations.ts')
with open(out, 'w', encoding='utf-8') as f:
    f.write('// Fichier généré par scripts/build-stations.py - ne pas modifier à la main.\n')
    f.write('// Source : Wikidata (CC0).\n')
    f.write("import type { Station } from '../game/types';\n\n")
    f.write('export const STATIONS: Station[] = ')
    f.write(json.dumps(stations, ensure_ascii=False, indent=2))
    f.write(';\n')
print(len(stations), 'stations ->', out)
