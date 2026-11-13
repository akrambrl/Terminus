/**
 * Captures d'écran marketing pour l'App Store et Google Play.
 *
 * Usage (depuis la racine du projet, après `npm run build:pages`) :
 *   node store-listing/make-screenshots.js
 *
 * 1. Sert le dossier docs/ en local et y joue une vraie partie (grille du jour) avec Playwright.
 * 2. Met chaque capture en scène (slogan + écran) aux tailles exigées par les stores.
 */
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'captures');
const RAW = path.join(OUT, 'raw');
const PORT = 8199;

const font = (p) => fs.readFileSync(path.join(ROOT, 'assets/fonts', p)).toString('base64');
const FONTS = `<style>
@font-face{font-family:Display;src:url(data:font/ttf;base64,${font('BricolageGrotesque-ExtraBold.ttf')})}
@font-face{font-family:Body;src:url(data:font/ttf;base64,${font('Figtree-Bold.ttf')})}
</style>`;

const SHOTS = [
  { raw: 'grid', title: '9 stations à trouver\nchaque jour', bg: '#2B3FD6', fg: '#FFFFFF' },
  { raw: 'defi', title: 'Le Défi :\ntrouve-les toutes', bg: '#7B4AE2', fg: '#FFFFFF' },
  { raw: 'pendu', title: 'Le Pendu\ndu métro', bg: '#15123D', fg: '#FFC229' },
  { raw: 'result', title: 'Les stations rares\nrapportent plus', bg: '#14B88A', fg: '#15123D' },
  { raw: 'classement', title: 'Grimpe au\nclassement du jour', bg: '#FFC229', fg: '#15123D' },
  { raw: 'intro', title: 'Plonge dans\nle métro parisien', bg: '#FF5A36', fg: '#FFFFFF' },
];
const SIZES = [
  // iPhone avec Dynamic Island, écran moyen (6,1" / 6,3") : taille demandée par App Store Connect.
  { prefix: 'ios-6.3', w: 1206, h: 2622 },
  { prefix: 'ios-6.9', w: 1320, h: 2868 },
  { prefix: 'ios-6.5', w: 1242, h: 2688 },
  { prefix: 'android', w: 1080, h: 1920 },
];

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
  return http
    .createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      p = '/docs' + p;
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) return res.writeHead(404).end();
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    })
    .listen(PORT);
}

/** Jour utilisé pour les captures (jeux variés et lisibles). */
const DAY = '2026-11-20';

/** Classement d'exemple pour la capture (pseudos fictifs). */
const SAMPLE_RANKING = {
  game: 'grille', period: 'day', day: DAY, players: 1284,
  top: [
    ['Metro_Lover', 845, 9, 0], ['LigneSix', 790, 9, 1], ['Pigalle75', 760, 9, 0], ['Parisienne', 705, 9, 2],
    ['Correspondance', 680, 8, 3], ['RERdesBois', 655, 9, 1], ['Bastoche', 610, 8, 2],
  ].map(([pseudo, score, found, errors], i) => ({ rank: i + 1, pseudo, score, found, errors, games: 1, me: i === 2 })),
  me: { rank: 3, pseudo: 'Pigalle75', score: 760, found: 9, errors: 0, games: 1 },
  pseudo: 'Pigalle75',
};

async function captureGame(browser) {
  const { cells, defi, pendu } = JSON.parse(
    execSync(`npx tsx store-listing/puzzle-answers.ts ${DAY}`, { cwd: ROOT }).toString(),
  );
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  // Pas de vraies données envoyées pendant les captures ; classement d'exemple.
  await page.route(/supabase\.co/, (r) =>
    r.request().url().includes('tp_leaderboard')
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_RANKING) })
      : r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }),
  );
  await page.goto(`http://localhost:${PORT}/?date=${DAY}`);

  // Intro : la rame à quai.
  await page.waitForTimeout(2900);
  await page.screenshot({ path: path.join(RAW, 'intro.png') });
  await page.waitForTimeout(3000);
  for (let k = 0; k < 3; k++) {
    const close = page.getByText('Fermer');
    if (!(await close.count())) break;
    await close.last().click();
    await page.waitForTimeout(400);
  }

  const fill = async (cell) => {
    await page.locator(`[aria-label="Case vide : ${cell.row} et ${cell.col}"]`).click();
    await page.waitForTimeout(500);
    await page.keyboard.type(cell.name);
    await page.waitForTimeout(300);
    await page.getByText(cell.name, { exact: true }).last().click();
    await page.waitForTimeout(500);
  };

  // Grille partiellement remplie.
  for (const [i, j] of [[0, 0], [0, 1], [1, 1], [1, 2], [2, 0], [2, 2]]) await fill(cells[i][j]);
  await page.screenshot({ path: path.join(RAW, 'grid.png') });

  // Fin de grille : résultat avec les points.
  for (const [i, j] of [[0, 2], [1, 0], [2, 1]]) await fill(cells[i][j]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(RAW, 'result.png') });

  // Classement du jour (données d'exemple).
  await page.getByText('Voir le classement').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(RAW, 'classement.png') });
  await page.getByText('Fermer').first().click();
  await page.waitForTimeout(600);

  // Défi : deux stations trouvées.
  await page.getByRole('tab', { name: /Défi/ }).click();
  await page.waitForTimeout(900);
  for (const name of defi.slice(0, 2)) {
    await page.getByText('Proposer une station').click();
    await page.waitForTimeout(500);
    await page.keyboard.type(name.split(' ')[0]);
    await page.waitForTimeout(300);
    await page.getByText(name, { exact: true }).last().click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(RAW, 'defi.png') });

  // Pendu : quelques lettres trouvées.
  await page.getByRole('tab', { name: /Pendu/ }).click();
  await page.waitForTimeout(900);
  const letters = [...new Set(pendu.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase())];
  for (const k of [...letters.slice(0, 3), 'w']) {
    await page.keyboard.press(k);
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: path.join(RAW, 'pendu.png') });
  await page.close();
}

async function compose(browser) {
  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
    for (const [n, shot] of SHOTS.entries()) {
      const img = fs.readFileSync(path.join(RAW, `${shot.raw}.png`)).toString('base64');
      const phoneW = Math.round(size.w * (size.h / size.w > 2 ? 0.8 : 0.66));
      const titleSize = Math.round(size.w * 0.085);
      await page.setContent(`<html><head>${FONTS}</head><body style="margin:0">
        <div style="width:${size.w}px;height:${size.h}px;background:${shot.bg};overflow:hidden;position:relative;
                    display:flex;flex-direction:column;align-items:center">
          <div style="font-family:Display;color:${shot.fg};font-size:${titleSize}px;line-height:1.08;text-align:center;
                      white-space:pre-line;margin-top:${Math.round(size.h * 0.06)}px;padding:0 ${Math.round(size.w * 0.06)}px">${shot.title}</div>
          <img src="data:image/png;base64,${img}" style="width:${phoneW}px;margin-top:${Math.round(size.h * 0.045)}px;
               border-radius:${Math.round(phoneW * 0.09)}px;border:${Math.round(size.w * 0.012)}px solid #15123D;
               box-shadow:0 ${Math.round(size.w * 0.025)}px 0 #15123D"/>
        </div></body></html>`);
      await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(OUT, `${size.prefix}-${n + 1}-${shot.raw}.png`) });
    }
    await page.close();
  }

  // Image de présentation Google Play (1024 × 500) et icône 512.
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  const grid = fs.readFileSync(path.join(RAW, 'grid.png')).toString('base64');
  const tiles = 'TERMINUS'.split('').map((l, i) => {
    const c = ['#2B3FD6', '#FF5A36', '#FFC229', '#14B88A', '#F2458C', '#7B4AE2', '#FF5A36', '#2B3FD6'][i];
    return `<span style="display:inline-flex;align-items:center;justify-content:center;width:62px;height:70px;border-radius:16px;
      background:${c};color:${c === '#FFC229' ? '#15123D' : '#fff'};font-family:Display;font-size:44px;margin-right:6px;
      transform:rotate(${i % 2 ? 3 : -3}deg)">${l}</span>`;
  }).join('');
  await page.setContent(`<html><head>${FONTS}</head><body style="margin:0">
    <div style="width:1024px;height:500px;background:#15123D;position:relative;overflow:hidden">
      <div style="position:absolute;left:56px;top:120px">${tiles}
        <div style="font-family:Body;color:#FFC229;font-size:22px;letter-spacing:14px;margin-top:16px">PARIS</div>
        <div style="font-family:Display;color:#fff;font-size:34px;margin-top:26px;line-height:1.15">3 jeux par jour sur<br/>le métro parisien</div>
      </div>
      <img src="data:image/png;base64,${grid}" style="position:absolute;right:46px;top:46px;width:250px;border-radius:28px;
        border:8px solid #fff;transform:rotate(4deg)"/>
    </div></body></html>`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, 'google-feature-graphic.png') });
  await page.close();
  fs.copyFileSync(path.join(ROOT, 'public/icon-512.png'), path.join(OUT, 'google-icon-512.png'));
}

(async () => {
  fs.mkdirSync(RAW, { recursive: true });
  const server = serve();
  const browser = await chromium.launch();
  try {
    await captureGame(browser);
    await compose(browser);
  } finally {
    await browser.close();
    server.close();
  }
  console.log('Captures prêtes dans', OUT);
})();
