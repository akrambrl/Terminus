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
BASE = os.environ.get('PAGES_BASE_URL', '/Terminus').rstrip('/')

index = os.path.join(DIST, 'index.html')
html = open(index, encoding='utf-8').read()
html = html.replace('<html lang="en">', '<html lang="fr">')
html = html.replace('<title>Terminus Paris</title>', '<title>Terminus Paris – le jeu des stations du métro parisien</title>')
html = html.replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
    # Pas de viewport-fit=cover : la page commence sous la barre d'état d'iOS, sans le voile
    # flou qu'iOS ajoute quand le contenu passe dessous.
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
)
head = f'''
    <meta name="description" content="Terminus Paris : le jeu de grille quotidien sur les stations du métro parisien. 9 stations à trouver chaque jour, gratuit, sur mobile et ordinateur." />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Terminus Paris" />
    <meta property="og:title" content="Terminus Paris – le jeu des stations du métro" />
    <meta property="og:description" content="Une grille par jour, 9 stations du métro parisien à trouver. Tu connais vraiment le métro ?" />
    <meta property="og:image" content="https://akrambrl.github.io{BASE}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="fr_FR" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="https://akrambrl.github.io{BASE}/" />
    <meta name="theme-color" content="#EEF1FF" />
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
