// Génère les icônes de l'app (icon.png, android-icon-foreground.png, splash-icon.png).
// Usage : node scripts/icon/make-icons.js assets
const { chromium } = require('playwright');
// Icône Terminus : un « T » formé de deux lignes de métro, une correspondance au croisement,
// un butoir de terminus en bas, sur fond bleu nuit carrelé.
const svg = ({ bg, scale }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <pattern id="tiles" width="128" height="128" patternUnits="userSpaceOnUse">
      <rect width="128" height="128" fill="#15123D"/>
      <rect x="4" y="4" width="120" height="56" rx="14" fill="#1C1850"/>
      <rect x="-60" y="68" width="120" height="56" rx="14" fill="#1C1850"/>
      <rect x="68" y="68" width="120" height="56" rx="14" fill="#1C1850"/>
    </pattern>
  </defs>
  ${bg ? '<rect width="1024" height="1024" fill="url(#tiles)"/>' : ''}
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <!-- ligne verticale (jaune) -->
    <line x1="512" y1="330" x2="512" y2="790" stroke="#FFC229" stroke-width="124" stroke-linecap="round"/>
    <!-- ligne horizontale (orange) -->
    <line x1="196" y1="330" x2="828" y2="330" stroke="#FF5A36" stroke-width="124" stroke-linecap="round"/>
    <!-- arrêts -->
    <circle cx="232" cy="330" r="34" fill="#FFFFFF"/>
    <circle cx="792" cy="330" r="34" fill="#FFFFFF"/>
    <circle cx="512" cy="590" r="34" fill="#FFFFFF"/>
    <!-- correspondance -->
    <circle cx="512" cy="330" r="96" fill="#FFFFFF" stroke="#15123D" stroke-width="26"/>
    <circle cx="512" cy="330" r="40" fill="#2B3FD6"/>
    <!-- butoir du terminus -->
    <rect x="392" y="842" width="240" height="56" rx="28" fill="#FFFFFF"/>
  </g>
</svg>`;
(async () => {
  const [out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const [file, bg, scale] of [
    ['icon.png', true, 0.92],
    ['android-icon-foreground.png', false, 0.62],
    ['splash-icon.png', false, 0.9],
  ]) {
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg({ bg, scale })}</body></html>`);
    await p.screenshot({ path: `${out}/${file}`, omitBackground: !bg, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  }
  await b.close();
})();
