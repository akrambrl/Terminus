/**
 * Pages de contenu du site (lisibles sans JavaScript, pour les lecteurs, les moteurs de recherche et AdSense) :
 * règles, FAQ, à propos, les 16 lignes du métro, toutes les stations, et les archives des jeux passés
 * (Grille, Défi, Pendu avec leurs réponses ; jamais le jour en cours).
 *
 * Usage : npx tsx scripts/build-content.ts            (écrit dans docs/, après npm run build:pages)
 * Aussi lancé chaque nuit par .github/workflows/archives.yml pour ajouter l'archive de la veille.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { STATIONS } from '../src/data/stations';
import { LINES } from '../src/game/criteria';
import { addDays, dayNumber, parisDayKey } from '../src/game/day';
import { dailySeed, generatePuzzle } from '../src/game/generator';
import { stationPoints } from '../src/game/points';
import type { LineId, Station } from '../src/game/types';
import { DEFI_MAX_ERRORS, generateDefi } from '../src/modes/defi/defi';
import { MAX_PENDU_ERRORS, nameLetters, penduStation } from '../src/modes/pendu/pendu';
import { lineColor } from '../src/design/tokens';

const ROOT = join(__dirname, '..');
const DOCS = join(ROOT, 'docs');
const SITE = 'https://terminusparis.fr';
const LAUNCH = '2026-11-08';
/** Le Défi et le Pendu existent depuis le 12 novembre 2026. */
const MODES_LAUNCH = '2026-11-12';
const ADSENSE = 'ca-pub-4450845101011880';
const today = process.env.CONTENT_TODAY ?? parisDayKey();
const frequentation = JSON.parse(readFileSync(join(ROOT, 'scripts/data/frequentation.json'), 'utf8')) as {
  validations: Record<string, { validations: number }>;
};
const tokensCss = readFileSync(join(ROOT, 'terminus-kit/tokens.css'), 'utf8');
const rootTokens = tokensCss.slice(tokensCss.indexOf(':root'));

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lineName = (l: string) => `ligne ${l.replace('bis', ' bis')}`;
const lineSlug = (l: string) => `ligne-${l}`;
const fmtInt = (n: number) => n.toLocaleString('fr-FR');
const fmtDay = (d: string) => {
  const [y, m, j] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, j)).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const plural = (n: number, s: string, p = `${s}s`) => `${fmtInt(n)} ${n > 1 ? p : s}`;
const byName = (a: Station, b: Station) => a.name.localeCompare(b.name, 'fr');
const validations = (s: Station) => frequentation.validations[s.id]?.validations ?? 0;

function badge(l: string, size = 22) {
  const c = lineColor[l as keyof typeof lineColor];
  return `<a class="pastille" href="/lignes/${lineSlug(l)}/" style="background:${c.bg};color:${c.fg};width:${size}px;height:${size}px;font-size:${Math.round(size * (l.length > 2 ? 0.42 : 0.5))}px" title="${esc(lineName(l))}">${l.replace('bis', 'b')}</a>`;
}
const badges = (s: Station) => s.lines.map((l) => badge(l)).join('') + (s.rer.length ? `<span class="rer">RER ${s.rer.join(' ')}</span>` : '');
const place = (s: Station) => (s.arr.length ? s.arr.map((a) => (a === 1 ? '1er' : `${a}e`)).join(', ') + ' arr.' : s.communes.join(', '));

function layout(o: { path: string; title: string; description: string; body: string; ads?: boolean }) {
  const url = `${SITE}${o.path}`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Terminus Paris" />
<meta property="og:title" content="${esc(o.title)}" />
<meta property="og:description" content="${esc(o.description)}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:url" content="${url}" />
<meta name="google-adsense-account" content="${ADSENSE}" />
<meta name="theme-color" content="#EEF1FF" />
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<style>
${rootTokens}
@font-face { font-family: "Bricolage Grotesque"; font-weight: 800; font-display: swap; src: url("/polices/BricolageGrotesque-ExtraBold.woff2") format("woff2"); }
@font-face { font-family: "Figtree"; font-weight: 700; font-display: swap; src: url("/polices/Figtree-Bold.woff2") format("woff2"); }
@font-face { font-family: "Figtree"; font-weight: 800; font-display: swap; src: url("/polices/Figtree-ExtraBold.woff2") format("woff2"); }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: var(--tp-font-text); font-weight: 700; color: var(--tp-ink); background: var(--tp-surface); line-height: 1.55;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='66' height='36'%3E%3Crect x='0' y='3' width='62' height='12' rx='6' fill='%23E2E6FB'/%3E%3Crect x='-33' y='21' width='62' height='12' rx='6' fill='%23E2E6FB'/%3E%3Crect x='33' y='21' width='62' height='12' rx='6' fill='%23E2E6FB'/%3E%3C/svg%3E"); }
a { color: var(--tp-blue); }
header { background: var(--tp-ink); color: #fff; }
.barre { max-width: 960px; margin: 0 auto; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.logo { display: flex; gap: 3px; text-decoration: none; }
.logo span { width: 24px; height: 27px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; color: #fff; }
.logo span:nth-child(odd) { transform: rotate(-4deg); } .logo span:nth-child(even) { transform: rotate(3deg); }
nav { display: flex; gap: 6px 16px; flex-wrap: wrap; }
nav a { color: #fff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 10px 2px; }
nav a.jouer { background: var(--tp-sun); color: var(--tp-ink); border-radius: 999px; padding: 10px 16px; }
main { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { font-family: var(--tp-font-display); font-weight: 800; letter-spacing: -.02em; line-height: 1.05; font-size: clamp(30px, 6vw, 46px); margin: 8px 0 12px; }
h2 { font-family: var(--tp-font-display); font-weight: 800; letter-spacing: -.01em; font-size: 24px; margin: 28px 0 10px; }
h3 { font-size: 18px; margin: 18px 0 6px; font-weight: 800; }
p, li { font-size: 16px; }
.chapo { font-size: 18px; }
.carte { background: #fff; border: 3px solid var(--tp-ink); border-radius: 22px; box-shadow: 0 5px 0 var(--tp-ink); padding: 18px 20px; margin: 18px 0; }
.plaque { display: inline-block; background: var(--tp-ink); color: #fff; border: 3px solid #fff; border-radius: 10px; padding: 4px 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; font-size: 13px; }
.pastille { display: inline-flex; align-items: center; justify-content: center; border-radius: 28%; font-weight: 800; text-decoration: none; margin: 1px 2px 1px 0; vertical-align: middle; }
.rer { display: inline-block; background: var(--tp-ink); color: #fff; border-radius: 5px; padding: 1px 5px; font-size: 11px; font-weight: 800; margin-left: 2px; vertical-align: middle; }
table { width: 100%; border-collapse: collapse; font-size: 15px; }
th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid var(--tp-line-empty); vertical-align: middle; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--tp-ink-muted); }
td.num, th.num { text-align: right; white-space: nowrap; }
.defile { overflow-x: auto; }
.grille { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.grille div { background: #fff; border: 2px solid var(--tp-line-empty); border-radius: 12px; padding: 8px; font-size: 13px; min-height: 64px; }
.grille .crit { background: var(--tp-ink); color: #fff; border-color: var(--tp-ink); display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 800; }
.grille .coin { background: transparent; border: 0; }
.cases { display: none; }
.cases h3 { font-size: 16px; margin: 14px 0 2px; }
.cases p { margin: 0; font-size: 14px; }
@media (max-width: 700px) { .grille { display: none; } .cases { display: block; } }
.liste-jours { columns: 2 220px; padding-left: 18px; }
.pub { margin: 24px 0; min-height: 0; }
.cta { display: inline-block; background: var(--tp-blue); color: #fff; text-decoration: none; font-weight: 800; border: 3px solid var(--tp-ink); border-radius: 999px; box-shadow: 0 5px 0 var(--tp-ink); padding: 12px 22px; margin: 6px 0; }
footer { background: var(--tp-ink); color: #fff; font-size: 13px; }
footer .barre { padding: 20px 16px; }
footer a { color: var(--tp-sun); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
</head>
<body>
<header><div class="barre">
  <a class="logo" href="/" aria-label="Terminus Paris : jouer">${'TERMINUS'.split('').map((c, i) => `<span style="background:${['var(--tp-blue)', 'var(--tp-tomato)', 'var(--tp-sun);color:var(--tp-ink)', 'var(--tp-mint)', 'var(--tp-pink)', 'var(--tp-violet)', 'var(--tp-tomato)', 'var(--tp-blue)'][i]}">${c}</span>`).join('')}</a>
  <nav aria-label="Menu">
    <a href="/regles/">Règles</a><a href="/lignes/">Lignes</a><a href="/stations/">Stations</a><a href="/archives/">Archives</a><a href="/faq/">FAQ</a><a href="/a-propos/">À propos</a><a class="jouer" href="/">Jouer</a>
  </nav>
</div></header>
<main>
${o.body}
</main>
<footer><div class="barre">
  <span>Terminus Paris, le jeu quotidien du métro parisien. Jeu non officiel, sans lien avec la RATP ni Île-de-France Mobilités.</span>
  <span><a href="/a-propos/">À propos</a> · <a href="/confidentialite.html">Confidentialité</a> · <a href="mailto:terminusparis@gmail.com">Contact</a></span>
</div></footer>
</body>
</html>
`;
}

const pages: { path: string; html: string }[] = [];
const add = (path: string, o: Omit<Parameters<typeof layout>[0], 'path'>) => pages.push({ path, html: layout({ path, ...o }) });

/* ---------------- Règles ---------------- */
add('/regles/', {
  title: 'Règles de Terminus Paris : la Grille, le Défi et le Pendu du métro',
  description: 'Comment jouer à Terminus Paris : les règles de la Grille, du Défi et du Pendu, le calcul des points selon la fréquentation des stations et le classement du jour.',
  body: `<span class="plaque">Règles du jeu</span>
<h1>Comment jouer à Terminus Paris</h1>
<p class="chapo">Chaque jour à minuit (heure de Paris), trois nouveaux jeux sur les stations du métro parisien vous attendent : la Grille, le Défi et le Pendu. Ils sont les mêmes pour tout le monde, ce qui permet de comparer vos scores avec vos amis et dans le classement du jour.</p>

<div class="carte">
<h2>La Grille</h2>
<p>La grille compte 3 lignes et 3 colonnes. Chaque ligne et chaque colonne porte un critère : une ligne de métro (« Ligne 6 »), un quartier (« Centre de Paris », « Hors Paris »), la proximité d'un monument (« À moins de 2 km de la tour Eiffel »), une particularité du nom (« Commence par S », « Contient un Y ») ou un nombre de correspondances (« Avec RER »).</p>
<p>Pour remplir une case, il faut trouver une station qui respecte <strong>à la fois</strong> le critère de sa ligne et celui de sa colonne. Chaque station ne peut servir qu'une fois dans la grille. Vous avez droit à <strong>3 erreurs</strong> : une station qui ne convient pas coûte un ticket, une bonne réponse ne coûte rien.</p>
<h3>Les points</h3>
<p>Chaque bonne réponse rapporte de <strong>10 à 100 points</strong> selon la fréquentation réelle de la station. Les très grandes stations comme Châtelet ou Saint-Lazare valent 10 points ; les petites stations tranquilles comme Pelleport ou Église d'Auteuil en valent 100. Pour battre votre record, cherchez les stations les moins connues ! La fréquentation provient des données ouvertes d'Île-de-France Mobilités (nombre de validations).</p>
</div>

<div class="carte">
<h2>Le Défi</h2>
<p>Deux critères se croisent, par exemple « Ligne 4 » et « Commence par S ». Il y a toujours entre 3 et 8 stations qui conviennent : à vous de les trouver toutes. Proposez-les une par une ; une mauvaise réponse coûte un ticket, et vous avez droit à <strong>${DEFI_MAX_ERRORS} erreurs</strong>. Vous pouvez aussi abandonner : toutes les réponses s'affichent alors.</p>
</div>

<div class="carte">
<h2>Le Pendu du métro</h2>
<p>Une station est à deviner, lettre par lettre. Les tirets, apostrophes et espaces sont déjà visibles, et les pastilles des lignes qui desservent la station servent d'indice. Une lettre juste apparaît partout dans le nom (É compte comme E) ; une lettre absente coûte un ticket, jusqu'à <strong>${MAX_PENDU_ERRORS} erreurs</strong>. Vous pouvez proposer le nom complet à tout moment, mais un mauvais nom coûte aussi un ticket.</p>
</div>

<div class="carte">
<h2>Le classement du jour</h2>
<p>Après chaque partie, vous pouvez choisir un pseudo pour apparaître dans le classement du jour ou de la semaine : la Grille se classe aux points, le Défi au nombre de stations trouvées, le Pendu au nombre d'erreurs. Seule la première partie du jour compte, et le serveur vérifie chaque réponse.</p>
<h3>Des grilles en plus</h3>
<p>La grille du jour est toujours gratuite. Pour jouer d'autres grilles, utilisez vos pièces : vous en gagnez 3 chaque jour en ouvrant le jeu. Les pièces ne s'achètent pas.</p>
</div>
<p><a class="cta" href="/">Jouer aux jeux du jour</a></p>`,
});

/* ---------------- FAQ ---------------- */
const faq: [string, string][] = [
  ['Terminus Paris est-il gratuit ?', 'Oui, entièrement. Les trois jeux du jour sont gratuits, sans compte ni inscription. Le jeu est financé par la publicité. Les pièces, qui permettent de jouer des grilles en plus, se gagnent en jouant et ne s’achètent jamais.'],
  ['À quelle heure change le jeu ?', 'À minuit, heure de Paris, pour tout le monde. Les trois jeux (Grille, Défi, Pendu) sont les mêmes pour tous les joueurs de la journée.'],
  ['Quelles stations sont dans le jeu ?', `Les ${STATIONS.length} stations des lignes 1 à 14, 3 bis et 7 bis du métro parisien, dont les prolongements récents de la ligne 14 jusqu’à Saint-Denis Pleyel et l’aéroport d’Orly. Les lignes en projet du Grand Paris Express ne sont pas encore incluses.`],
  ['Comment sont calculés les points ?', 'Chaque bonne réponse de la Grille vaut entre 10 et 100 points selon la fréquentation de la station : plus elle est fréquentée, moins elle rapporte. Les stations sont classées de la plus fréquentée à la moins fréquentée à partir du nombre de validations publié par Île-de-France Mobilités.'],
  ['Que veut dire « Centre de Paris » ?', 'Les stations situées dans les quatre premiers arrondissements, qui forment depuis 2020 le secteur « Paris Centre ».'],
  ['Une station en correspondance compte-t-elle pour plusieurs lignes ?', 'Oui. Une station desservie par plusieurs lignes respecte le critère de chacune de ces lignes. Par exemple, Châtelet convient pour les lignes 1, 4, 7, 11 et 14.'],
  ['Les accents sont-ils obligatoires dans la recherche ?', 'Non : la recherche comprend les noms sans accents, sans tirets et sans majuscules. Tapez par exemple « chaussee d antin » pour Chaussée d’Antin - La Fayette.'],
  ['Où retrouver les réponses des jours précédents ?', 'Dans les archives : chaque jour passé y a sa page, avec toutes les réponses possibles de la Grille, les stations du Défi et la station du Pendu.'],
  ['Existe-t-il une application ?', 'Oui, Terminus Paris arrive sur l’App Store et Google Play. Le site terminusparis.fr fonctionne aussi sur téléphone et ordinateur, et peut être ajouté à l’écran d’accueil.'],
  ['Le jeu est-il officiel ?', 'Non. Terminus Paris est un jeu indépendant, sans lien avec la RATP ni Île-de-France Mobilités. Il n’utilise ni leur logo, ni leur plan, ni leur typographie.'],
];
add('/faq/', {
  title: 'FAQ Terminus Paris : questions fréquentes sur le jeu du métro',
  description: 'Gratuité, heure de changement, stations incluses, calcul des points, archives : les réponses aux questions fréquentes sur Terminus Paris.',
  body: `<span class="plaque">FAQ</span>
<h1>Questions fréquentes</h1>
${faq.map(([q, a]) => `<div class="carte"><h2 style="margin-top:0;font-size:20px">${esc(q)}</h2><p>${esc(a)}</p></div>`).join('\n')}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })}</script>`,
});

/* ---------------- À propos ---------------- */
add('/a-propos/', {
  title: 'À propos de Terminus Paris',
  description: 'Terminus Paris est un jeu quotidien et indépendant sur les stations du métro parisien. Qui le fait, d’où viennent les données et comment nous contacter.',
  body: `<span class="plaque">À propos</span>
<h1>À propos de Terminus Paris</h1>
<p class="chapo">Terminus Paris est né d'une idée simple : on passe des heures dans le métro, mais connaît-on vraiment ses stations ? Chaque jour, trois petits jeux permettent de tester et d'enrichir sa connaissance du réseau, en quelques minutes, sur le trajet du matin.</p>
<div class="carte">
<h2 style="margin-top:0">Qui sommes-nous ?</h2>
<p>Terminus Paris est un projet indépendant édité par Akram Bourhila, à Paris. Le jeu est gratuit, sans compte, et financé par la publicité. Une remarque, une erreur dans une station, une idée de critère ? Écrivez-nous à <a href="mailto:terminusparis@gmail.com">terminusparis@gmail.com</a>.</p>
<h2>D'où viennent les données ?</h2>
<ul>
<li><strong>Stations, lignes, arrondissements et coordonnées</strong> : Wikidata (licence CC0), vérifiées et corrigées à la main.</li>
<li><strong>Fréquentation des stations</strong> : données ouvertes d'Île-de-France Mobilités, nombre de validations sur le réseau ferré (1er trimestre 2026).</li>
<li><strong>Monuments et Seine</strong> : positions géographiques publiques, utilisées pour les critères de proximité.</li>
</ul>
<h2>Jeu non officiel</h2>
<p>Terminus Paris n'a aucun lien avec la RATP ni avec Île-de-France Mobilités. Le jeu n'utilise ni leurs logos, ni leurs plans, ni leur typographie : les pastilles de lignes et toute l'identité visuelle sont propres au jeu.</p>
</div>
<p><a class="cta" href="/">Jouer aux jeux du jour</a></p>`,
});

/* ---------------- Lignes ---------------- */
const lineStations = (l: LineId) => STATIONS.filter((s) => s.lines.includes(l)).sort(byName);
add('/lignes/', {
  title: 'Les lignes du métro de Paris : stations, correspondances et fréquentation',
  description: 'Les 16 lignes du métro parisien dans Terminus Paris : liste des stations de chaque ligne, correspondances, arrondissements desservis et stations les plus fréquentées.',
  body: `<span class="plaque">Les lignes</span>
<h1>Les 16 lignes du métro de Paris</h1>
<p class="chapo">Le métro parisien compte 14 lignes principales et 2 lignes « bis », la 3 bis et la 7 bis. Retrouvez pour chacune la liste de ses stations dans le jeu, ses correspondances, les arrondissements et communes qu'elle dessert, et ses stations les plus et les moins fréquentées.</p>
<div class="carte defile"><table>
<tr><th>Ligne</th><th class="num">Stations</th><th>Correspondances avec</th></tr>
${LINES.map((l) => {
  const st = lineStations(l);
  const other = [...new Set(st.flatMap((s) => s.lines))].filter((x) => x !== l);
  return `<tr><td>${badge(l, 26)} <a href="/lignes/${lineSlug(l)}/">${esc(lineName(l)[0].toUpperCase() + lineName(l).slice(1))}</a></td><td class="num">${st.length}</td><td>${other.map((x) => badge(x, 18)).join('')}</td></tr>`;
}).join('\n')}
</table></div>`,
});

for (const l of LINES) {
  const st = lineStations(l);
  const name = lineName(l);
  const Name = name[0].toUpperCase() + name.slice(1);
  const arr = [...new Set(st.flatMap((s) => s.arr))].sort((a, b) => a - b);
  const communes = [...new Set(st.flatMap((s) => s.communes))].sort((a, b) => a.localeCompare(b, 'fr'));
  const other = [...new Set(st.flatMap((s) => s.lines))].filter((x) => x !== l).sort((a, b) => parseInt(a) - parseInt(b));
  const rer = [...new Set(st.flatMap((s) => s.rer))].sort();
  const busy = [...st].sort((a, b) => validations(b) - validations(a));
  const top = busy.slice(0, 3);
  const calm = busy.slice(-3).reverse();
  const multi = st.filter((s) => s.lines.length >= 3).length;
  add(`/lignes/${lineSlug(l)}/`, {
    title: `${Name} du métro de Paris : les ${st.length} stations, correspondances et fréquentation`,
    description: `Toutes les stations de la ${name} du métro parisien : ${st.length} stations, correspondances avec ${other.length} lignes${rer.length ? ` et le RER ${rer.join(', ')}` : ''}, arrondissements desservis et fréquentation.`,
    body: `<span class="plaque">${esc(Name)}</span>
<h1>${badge(l, 40)} ${esc(Name)} du métro de Paris</h1>
<p class="chapo">La ${esc(name)} compte <strong>${st.length} stations</strong> dans Terminus Paris. ${arr.length ? `Elle traverse ${plural(arr.length, 'arrondissement')} de Paris (${arr.map((a) => (a === 1 ? '1er' : `${a}e`)).join(', ')})` : 'Elle ne passe par aucun arrondissement parisien'}${communes.length ? ` et dessert ${plural(communes.length, 'commune')} hors de Paris : ${communes.join(', ')}` : ', sans sortir de Paris'}.</p>
<div class="carte">
<h2 style="margin-top:0">Correspondances</h2>
<p>${other.length ? `La ${esc(name)} offre des correspondances avec ${plural(other.length, 'autre ligne')} de métro : ${other.map((x) => badge(x)).join(' ')}` : 'La ligne n’offre aucune correspondance avec une autre ligne de métro'}${rer.length ? `, ainsi qu'avec le RER ${rer.join(', ')}` : ''}. ${multi ? `${plural(multi, 'station')} de la ligne ${multi > 1 ? 'sont desservies' : 'est desservie'} par au moins trois lignes de métro.` : ''}</p>
<h2>Fréquentation</h2>
<p>Les stations les plus fréquentées de la ligne sont ${top.map((s) => `<strong>${esc(s.name)}</strong> (${fmtInt(validations(s))} validations au 1er trimestre 2026)`).join(', ')}. Les plus calmes sont ${calm.map((s) => `<strong>${esc(s.name)}</strong>`).join(', ')} : dans la Grille, elles rapportent jusqu'à ${Math.max(...calm.map((s) => stationPoints(s.id)))} points.</p>
<p style="font-size:13px;color:var(--tp-ink-muted)">Les validations sont comptées par pôle : les stations en correspondance partagent le même chiffre.</p>
</div>
<div class="pub"></div>
<h2>Les ${st.length} stations de la ${esc(name)}</h2>
<div class="carte defile"><table>
<tr><th>Station</th><th>Lignes et RER</th><th>Situation</th><th class="num">Points</th></tr>
${st.map((s) => `<tr><td>${esc(s.name)}</td><td>${badges(s)}</td><td>${esc(place(s))}</td><td class="num">${stationPoints(s.id)}</td></tr>`).join('\n')}
</table></div>
<p>Les points indiqués sont ceux que rapporte la station dans la Grille de Terminus Paris : de 10 pour les stations les plus fréquentées à 100 pour les plus tranquilles.</p>
<p><a class="cta" href="/">Jouer aux jeux du jour</a> <a href="/lignes/">← Toutes les lignes</a></p>`,
  });
}

/* ---------------- Toutes les stations ---------------- */
const sorted = [...STATIONS].sort(byName);
const letters = [...new Set(sorted.map((s) => nameLetters(s.name)[0]))];
add('/stations/', {
  title: `Les ${STATIONS.length} stations du métro de Paris de A à Z`,
  description: `Liste alphabétique des ${STATIONS.length} stations du métro parisien dans Terminus Paris, avec leurs lignes, leurs correspondances RER, leur arrondissement ou leur commune.`,
  body: `<span class="plaque">Stations</span>
<h1>Les ${STATIONS.length} stations du métro de A à Z</h1>
<p class="chapo">Toutes les stations du jeu, avec les lignes qui les desservent, leurs correspondances RER, leur arrondissement ou leur commune, et les points qu'elles rapportent dans la Grille. ${sorted.filter((s) => !s.arr.length).length} stations sont situées hors de Paris.</p>
<p>${letters.map((c) => `<a href="#${c}">${c}</a>`).join(' · ')}</p>
${letters.map((c) => `<h2 id="${c}">${c}</h2><div class="carte defile"><table>
<tr><th>Station</th><th>Lignes et RER</th><th>Situation</th><th class="num">Points</th></tr>
${sorted.filter((s) => nameLetters(s.name)[0] === c).map((s) => `<tr><td>${esc(s.name)}</td><td>${badges(s)}</td><td>${esc(place(s))}</td><td class="num">${stationPoints(s.id)}</td></tr>`).join('\n')}
</table></div>`).join('\n')}`,
});

/* ---------------- Archives (jours passés uniquement) ---------------- */
const archiveDays: string[] = [];
for (let d = LAUNCH; d < today; d = addDays(d, 1)) archiveDays.push(d);
archiveDays.reverse();
const stationById = new Map(STATIONS.map((s) => [s.id, s]));
for (const day of archiveDays) {
  const n = dayNumber(day);
  const p = generatePuzzle(dailySeed(day));
  const defi = generateDefi(day);
  const pendu = penduStation(day);
  // Une case peut avoir une centaine de réponses : on montre les 20 qui rapportent le plus.
  const cell = (ids: string[]) => {
    const best = [...ids].sort((a, b) => stationPoints(b) - stationPoints(a));
    const shown = best.slice(0, 20).map((id) => `${esc(stationById.get(id)!.name)} <small>(${stationPoints(id)})</small>`).join(', ');
    return best.length > 20 ? `${shown}… <em>et ${best.length - 20} autres</em>` : shown;
  };
  add(`/archives/${day}/`, {
    title: `Terminus Paris n°${n} du ${fmtDay(day)} : réponses de la Grille, du Défi et du Pendu`,
    description: day < MODES_LAUNCH ? `Les réponses de la grille n°${n} du ${fmtDay(day)} : toutes les stations possibles de chaque case.` : `Les réponses des jeux du métro du ${fmtDay(day)} : toutes les stations possibles de la grille n°${n}, du défi « ${defi.a.label} × ${defi.b.label} » et la station du pendu.`,
    body: `<span class="plaque">Archives · n°${n}</span>
<h1>Les jeux du ${esc(fmtDay(day))}</h1>
<p class="chapo">Retrouvez toutes les réponses des trois jeux de Terminus Paris n°${n}. Entre parenthèses, les points que rapportait chaque station dans la Grille.</p>
<div class="carte">
<h2 style="margin-top:0">La Grille n°${n}</h2>
<div class="grille">
<div class="coin"></div>${p.cols.map((c) => `<div class="crit">${esc(c.label)}</div>`).join('')}
${p.rows.map((r, i) => `<div class="crit">${esc(r.label)}</div>${p.cols.map((_, j) => `<div>${cell(p.answers[i][j])}</div>`).join('')}`).join('\n')}
</div>
<div class="cases">
${p.rows.map((r, i) => p.cols.map((c, j) => `<h3>${esc(r.label)} × ${esc(c.label)} <small>(${p.answers[i][j].length} réponses)</small></h3><p>${cell(p.answers[i][j])}</p>`).join('\n')).join('\n')}
</div>
<p style="font-size:14px">Colonnes : ${p.cols.map((c) => `<strong>${esc(c.label)}</strong> (${esc(c.description)})`).join(' ; ')}. Lignes : ${p.rows.map((c) => `<strong>${esc(c.label)}</strong> (${esc(c.description)})`).join(' ; ')}.</p>
</div>
<div class="pub"></div>
${day < MODES_LAUNCH ? '' : `<div class="carte">
<h2 style="margin-top:0">Le Défi : ${esc(defi.a.label)} × ${esc(defi.b.label)}</h2>
<p>Les ${defi.answers.length} stations qui remplissaient les deux critères : ${defi.answers.map((id) => `<strong>${esc(stationById.get(id)!.name)}</strong> ${badges(stationById.get(id)!)}`).join(' · ')}.</p>
</div>
<div class="carte">
<h2 style="margin-top:0">Le Pendu</h2>
<p>La station à deviner était <strong>${esc(pendu.name)}</strong> ${badges(pendu)}, ${esc(place(pendu))}, en ${nameLetters(pendu.name).length} lettres.</p>
</div>`}
<p>${archiveDays.indexOf(day) < archiveDays.length - 1 ? `<a href="/archives/${addDays(day, -1)}/">← Jour précédent</a> · ` : ''}<a href="/archives/">Toutes les archives</a>${archiveDays.indexOf(day) > 0 ? ` · <a href="/archives/${addDays(day, 1)}/">Jour suivant →</a>` : ''}</p>
<p><a class="cta" href="/">Jouer aux jeux d'aujourd'hui</a></p>`,
  });
}
add('/archives/', {
  title: 'Archives de Terminus Paris : les réponses des jeux du métro jour par jour',
  description: 'Toutes les grilles, défis et pendus passés de Terminus Paris, avec leurs réponses : une page par jour depuis le lancement du jeu.',
  body: `<span class="plaque">Archives</span>
<h1>Les jeux des jours passés</h1>
<p class="chapo">Chaque jour a sa page, avec toutes les réponses possibles de la Grille, les stations du Défi et la station du Pendu. Les réponses du jour en cours ne sont jamais publiées : elles apparaissent ici le lendemain.</p>
<div class="carte"><ul class="liste-jours">
${archiveDays.map((d) => `<li><a href="/archives/${d}/">n°${dayNumber(d)} · ${esc(fmtDay(d))}</a></li>`).join('\n')}
</ul>${archiveDays.length ? '' : '<p>Les premières archives arrivent demain.</p>'}</div>`,
});

/* ---------------- Écriture, plan du site, robots.txt ---------------- */
for (const p of pages) {
  const file = join(DOCS, p.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, p.html);
}
const urls = ['/', ...pages.map((p) => p.path)];
writeFileSync(
  join(DOCS, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`,
);
writeFileSync(join(DOCS, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`${pages.length} pages de contenu (${archiveDays.length} archives jusqu'au ${archiveDays[0] ?? '-'}), sitemap.xml`);
