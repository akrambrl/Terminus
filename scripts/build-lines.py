"""Génère src/data/lineGraph.ts : stations voisines sur chaque ligne (ordre des stations).

Source : Wikidata (CC0), propriété « station adjacente » (P197) avec la ligne en qualificatif (P81),
exportée dans scripts/wikidata-adjacency.json.
Usage : python3 scripts/build-lines.py
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows = json.load(open(os.path.join(ROOT, 'scripts', 'wikidata-adjacency.json'), encoding='utf-8'))
src = open(os.path.join(ROOT, 'src', 'data', 'stations.ts'), encoding='utf-8').read()
stations = json.loads(src[src.index('= [') + 2:src.rindex(']') + 1])
by_id = {s['id']: s for s in stations}

LINES = ['1', '2', '3', '3bis', '4', '5', '6', '7', '7bis', '8', '9', '10', '11', '12', '13', '14']
label = lambda l: 'ligne ' + l.replace('bis', ' bis')

# Boucles parcourues dans un seul sens : pas de trajet du jeu dessus (l'ordre dépend du sens).
LOOPS = {
    '10': ["Église d'Auteuil", 'Michel-Ange - Auteuil', "Porte d'Auteuil", 'Chardon-Lagache', 'Mirabeau', 'Michel-Ange - Molitor'],
    '7bis': ['Place des Fêtes', 'Pré-Saint-Gervais', 'Danube'],
}

graph = {}
for l in LINES:
    nodes = {s['id'] for s in stations if l in s['lines']}
    adj = {n: set() for n in nodes}
    for r in rows:
        if r['lineLabel'] == label(l) and r['s'] in nodes and r['adj'] in nodes:
            adj[r['s']].add(r['adj'])
            adj[r['adj']].add(r['s'])
    loop = {s['id'] for s in stations if s['name'] in LOOPS.get(l, [])}
    assert len(loop) == len(LOOPS.get(l, [])), (l, loop)
    graph[l] = {'adj': {k: sorted(v) for k, v in sorted(adj.items())}, 'loop': sorted(loop)}

out = os.path.join(ROOT, 'src', 'data', 'lineGraph.ts')
with open(out, 'w', encoding='utf-8') as f:
    f.write('// Fichier généré par scripts/build-lines.py - ne pas modifier à la main.\n')
    f.write('// Source : Wikidata (CC0), stations adjacentes sur chaque ligne.\n')
    f.write('/** Pour chaque ligne : stations voisines, et stations des boucles à sens unique (exclues des trajets). */\n')
    f.write('export const LINE_GRAPH: Record<string, { adj: Record<string, string[]>; loop: string[] }> = ')
    f.write(json.dumps(graph, ensure_ascii=False, separators=(',', ':')))
    f.write(';\n')
print('ok', {l: len(g['adj']) for l, g in graph.items()})
