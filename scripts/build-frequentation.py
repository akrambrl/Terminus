"""Points de rareté des stations, à partir de leur fréquentation réelle.

Source : Île-de-France Mobilités, « Validations sur le réseau ferré : nombre de validations par jour »
(1er trimestre 2026, réseau métro), reliées à chaque station par sa zone de correspondance
(coordonnées). Données brutes : scripts/data/frequentation.json.

Points : classement de la station de la plus fréquentée (10 points) à la moins fréquentée (100 points),
par pas de 5. Les stations d'une même zone de correspondance (ex. Saint-Michel et Cluny - La Sorbonne)
partagent le même nombre de validations.

Usage : python3 scripts/build-frequentation.py  -> écrit src/data/frequentation.ts
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = json.load(open(os.path.join(ROOT, 'scripts/data/frequentation.json'), encoding='utf-8'))
v = {q: x['validations'] for q, x in data['validations'].items()}
ranked = sorted(v, key=lambda q: -v[q])  # de la plus fréquentée à la moins fréquentée
n = len(ranked)
# Rang moyen en cas d'égalité (stations d'une même zone de correspondance).
pos = {}
i = 0
while i < n:
    j = i
    while j + 1 < n and v[ranked[j + 1]] == v[ranked[i]]:
        j += 1
    for k in range(i, j + 1):
        pos[ranked[k]] = (i + j) / 2
    i = j + 1
points = {q: 10 + int(round(pos[q] / (n - 1) * 90 / 5)) * 5 for q in v}
for q in points:
    data['validations'][q]['points'] = points[q]
json.dump(data, open(os.path.join(ROOT, 'scripts/data/frequentation.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

lines = [
    '// Fichier généré par scripts/build-frequentation.py - ne pas modifier à la main.',
    f"// Source : {data['source']}.",
    '// Points de rareté par station (identifiant Wikidata) : 10 = très fréquentée, 100 = très peu fréquentée.',
    'export const STATION_POINTS: Record<string, number> = {',
]
for q in sorted(points):
    lines.append(f"  {q}: {points[q]}, // {data['validations'][q]['name']}")
lines.append('};')
open(os.path.join(ROOT, 'src/data/frequentation.ts'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(len(points), 'stations')
