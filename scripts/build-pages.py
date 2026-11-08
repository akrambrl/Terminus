"""Prépare la web app pour GitHub Pages dans le dossier docs/.

Usage : npm run build:pages
(lance l'export web Expo avec le bon sous-dossier, puis ce script)

Ajoute au index.html généré ce qu'il faut pour l'installer sur l'écran d'accueil
(manifeste, icône Apple, couleurs), puis copie le tout dans docs/.
"""
import glob, os, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
DOCS = os.path.join(ROOT, 'docs')
BASE = os.environ.get('PAGES_BASE_URL', '/Baraparfum').rstrip('/')

index = os.path.join(DIST, 'index.html')
html = open(index, encoding='utf-8').read()
html = html.replace('<html lang="en">', '<html lang="fr">')
html = html.replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
)
head = f'''
    <meta name="description" content="Le jeu de grille quotidien sur les stations du métro parisien." />
    <meta name="theme-color" content="#15123D" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Terminus" />
    <link rel="manifest" href="{BASE}/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="{BASE}/apple-touch-icon.png" />
    <style>html, body {{ background: #EEF1FF; }}</style>
  </head>'''
assert '</head>' in html
html = html.replace('</head>', head, 1)
open(index, 'w', encoding='utf-8').write(html)

shutil.rmtree(DOCS, ignore_errors=True)
shutil.copytree(DIST, DOCS)

# Les polices sont exportées dans assets/node_modules/, un dossier ignoré par git :
# on le renomme assets/vendor/ et on corrige les chemins dans le JavaScript.
src_mods = os.path.join(DOCS, 'assets', 'node_modules')
if os.path.isdir(src_mods):
    os.rename(src_mods, os.path.join(DOCS, 'assets', 'vendor'))
    for js in glob.glob(os.path.join(DOCS, '_expo', 'static', 'js', 'web', '*.js')):
        code = open(js, encoding='utf-8').read()
        open(js, 'w', encoding='utf-8').write(code.replace('/assets/node_modules/', '/assets/vendor/'))
# Sans ce fichier, GitHub Pages ignore le dossier _expo (nom commençant par « _ »).
open(os.path.join(DOCS, '.nojekyll'), 'w').close()
print('docs/ prêt :', sum(len(f) for _, _, f in os.walk(DOCS)), 'fichiers')
