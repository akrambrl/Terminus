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
BASE = os.environ.get('PAGES_BASE_URL', '').rstrip('/')
SITE = 'https://terminusparis.fr'

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
    <meta property="og:image" content="{SITE}{BASE}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="fr_FR" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="{SITE}{BASE}/" />
    <!-- Validation du site pour Google AdSense (même compte éditeur que AdMob). -->
    <meta name="google-adsense-account" content="ca-pub-4450845101011880" />
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
# Liens suivis (« lien en bio ») : une page par réseau, avec sa provenance.
# terminusparis.fr/tiktok, /insta, /x… (+ ?c=nom-de-campagne pour une vidéo précise).
# Même principe que goatfc.fr/liens/ : provenance transmise à l'App Store (ct), à Google Play
# (referrer) et au site (utm_*, enregistrés dans PostHog).
import re
LINK_PAGES = {
    'liens': 'bio', 'tiktok': 'tiktok', 'insta': 'instagram', 'x': 'x',
    'youtube': 'youtube', 'facebook': 'facebook', 'snap': 'snapchat', 'qr': 'qr',
}
# Identifiant fournisseur Apple (App Store Connect → Analytics → Acquisition → Liens de campagne).
# Facultatif : sans lui, l'App Store reçoit quand même le jeton de campagne ct.
APPLE_PT = ''
links_ts = open(os.path.join(ROOT, 'src/store/links.ts'), encoding='utf-8').read()
const = lambda name: re.search(rf"export const {name} = ([^;]+);", links_ts).group(1).strip().strip("'")
tokens_css = open(os.path.join(ROOT, 'terminus-kit/tokens.css'), encoding='utf-8').read()
root_block = tokens_css[tokens_css.index(':root'):]
brick = re.search(r'--tp-brick-on-blue:\s*(#[0-9A-Fa-f]{6})', tokens_css).group(1)
template = open(os.path.join(ROOT, 'scripts/liens-template.html'), encoding='utf-8').read()
for folder, source in LINK_PAGES.items():
    page = (template
        .replace('/*__TOKENS__*/', root_block)
        .replace('__BRICK__', brick.replace('#', '%23'))
        .replace('__SOURCE__', source)
        .replace('__APPLE_PT__', APPLE_PT)
        .replace('__APP_STORE_URL__', const('APP_STORE_URL'))
        .replace('__PLAY_STORE_URL__', const('PLAY_STORE_URL'))
        .replace('__IOS_HIDDEN__', '' if const('IOS_PUBLISHED') == 'true' else 'hidden')
        .replace('__ANDROID_HIDDEN__', '' if const('ANDROID_PUBLISHED') == 'true' else 'hidden'))
    os.makedirs(os.path.join(DOCS, folder), exist_ok=True)
    open(os.path.join(DOCS, folder, 'index.html'), 'w', encoding='utf-8').write(page)

# Sans ce fichier, GitHub Pages ignore le dossier _expo (nom commençant par « _ »).
open(os.path.join(DOCS, '.nojekyll'), 'w').close()
print('docs/ prêt :', sum(len(f) for _, _, f in os.walk(DOCS)), 'fichiers')
