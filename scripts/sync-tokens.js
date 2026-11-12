// Génère src/design/tokens.ts à partir de terminus-kit/tokens.css (source de vérité de la charte).
// Usage : node scripts/sync-tokens.js  (à relancer après chaque modification du kit)
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'terminus-kit/tokens.css'), 'utf8');
const vars = {};
for (const m of css.matchAll(/--tp-([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();

const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const px = (v) => Number(String(v).replace('px', ''));

const color = {};
const line = {};
for (const [k, v] of Object.entries(vars)) {
  if (!v.startsWith('#') && !v.startsWith('rgba')) continue;
  const lm = k.match(/^l(\d+(?:bis)?)(-fg)?$/);
  if (lm) {
    line[lm[1]] = line[lm[1]] || {};
    line[lm[1]][lm[2] ? 'fg' : 'bg'] = v;
  } else color[camel(k)] = v;
}

const shadow = (v) => {
  const [x, y, , ...c] = v.split(/\s+/);
  return { x: px(x), y: px(y), color: c.join(' ').replace('var(--tp-ink)', vars.ink) };
};

const out = `// Fichier généré par scripts/sync-tokens.js depuis terminus-kit/tokens.css. Ne pas modifier à la main.
// Valeurs de la charte, prévues pour des visuels de 1080 px de large ; voir src/design/scale.ts pour l'app.

export const color = ${JSON.stringify(color, null, 2)} as const;

/** Pastilles de ligne : fond et texte. */
export const lineColor = ${JSON.stringify(line, null, 2)} as const;

export const radius = {
  badge: ${parseFloat(vars['radius-badge']) / 100},
  cell: ${px(vars['radius-cell'])},
  card: ${px(vars['radius-card'])},
  pill: ${px(vars['radius-pill'])},
} as const;

export const border = { width: ${px(vars.border.split(' ')[0])}, color: ${JSON.stringify(vars.ink)} } as const;

export const shadow = {
  solid: ${JSON.stringify(shadow(vars.shadow))},
  soft: ${JSON.stringify(shadow(vars['shadow-soft']))},
} as const;

export const space = { 1: ${px(vars['space-1'])}, 2: ${px(vars['space-2'])}, 3: ${px(vars['space-3'])}, 4: ${px(vars['space-4'])} } as const;
`;
fs.writeFileSync(path.join(ROOT, 'src/design/tokens.ts'), out);
console.log('src/design/tokens.ts généré :', Object.keys(color).length, 'couleurs,', Object.keys(line).length, 'lignes');
