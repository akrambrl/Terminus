"""Construit une page HTML autonome (un seul fichier) à partir de l'export web Expo.

Usage :
  npx expo export --platform web
  python3 scripts/build-web-preview.py <fichier de sortie.html>

Le JavaScript et les polices sont intégrés à la page, pour pouvoir la publier
ou l'ouvrir sans serveur.
"""
import base64, glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
out = sys.argv[1]

js = open(glob.glob(os.path.join(DIST, '_expo/static/js/web/*.js'))[0], encoding='utf-8').read()

def inline_font(match):
    path = os.path.join(DIST, match.group(1).lstrip('/'))
    data = base64.b64encode(open(path, 'rb').read()).decode()
    return f'"data:font/ttf;base64,{data}"'

js = re.sub(r'"(/assets/[^"]+\.ttf)"', inline_font, js)
assert '</script' not in js

html = f'''<title>Terminus Paris</title>
<style>
  /* Version web de test de l'app Expo : un seul thème clair, comme l'app. */
  :root {{ --bg: #EEF1FF; --fg: #15123D; color-scheme: light; }}
  html, body {{ height: 100%; background: var(--bg); color: var(--fg); }}
  body {{ overflow: hidden; }}
  #root {{ display: flex; height: 100%; flex: 1; }}
</style>
<noscript>Active JavaScript pour jouer.</noscript>
<div id="root"></div>
<script>{js}</script>
'''
open(out, 'w', encoding='utf-8').write(html)
print(f'{out} ({len(html) // 1024} Ko)')
