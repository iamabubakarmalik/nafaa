// Round 2: builds icon / horizontal / dark / mono SVGs for every concept.
const fs = require('fs');
const path = require('path');
const fontkit = require('/Users/abubakarmalik/Projects/nafaa/node_modules/.pnpm/fontkit@2.0.4/node_modules/fontkit');
const INTER = '/Users/abubakarmalik/Projects/nafaa/node_modules/.pnpm/@fontsource+inter@5.3.0/node_modules/@fontsource/inter/files/';
const NASTALIQ = '/System/Library/Fonts/NotoNastaliq.ttc';
const OUT = process.argv[2] || '/Users/abubakarmalik/Projects/nafaa/brand/logo-concepts/round-2';
const concepts = require('./marks2.cjs');

const C = { green: '#16a34a', greenDark: '#15803d', greenLight: '#22c55e', amber: '#f59e0b', amberLight: '#fbbf24', ink: '#052e16', paper: '#f8fafc', mono: '#020617' };
const r1 = (v) => Math.round(v * 10) / 10;
const tidy = (d) => d.replace(/-?\d+\.\d+/g, (m) => String(r1(+m))).replace(/(\d)\.0(?=\D)/g, '$1');

// Outline text; returns path data with the baseline at y = 0 and the ink starting at x = 0.
function outline(text, font, size, tracking = 0, opts) {
  const s = size / font.unitsPerEm;
  const run = font.layout(text, opts);
  let x = 0, d = '';
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i];
    const gx = x + p.xOffset * s, gy = -p.yOffset * s;
    const b = g.path.bbox;
    if (isFinite(b.minX) && g.path.commands.length) {
      minX = Math.min(minX, gx + b.minX * s); maxX = Math.max(maxX, gx + b.maxX * s);
      minY = Math.min(minY, gy - b.maxY * s); maxY = Math.max(maxY, gy - b.minY * s);
    }
    d += g.path.scale(s, -s).translate(gx, gy).toSVG();
    x += p.xAdvance * s + (i < run.glyphs.length - 1 ? tracking * size : 0);
  });
  const shifted = d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, a, b) => `${r1(+a - minX)} ${r1(+b)}`);
  return { d: tidy(shifted), width: maxX - minX, top: minY, bottom: maxY, glyphs: run.glyphs, s, minX, positions: run.positions };
}
const inter = (w) => fontkit.openSync(`${INTER}inter-latin-${w}-normal.woff`);
const I700 = inter(700), I800 = inter(800);
const NQ = fontkit.openSync(NASTALIQ).fonts.find((f) => f.postscriptName === 'NotoNastaliqUrdu-Bold');

const TILE = (fill) => `<rect width="512" height="512" rx="114" fill="${fill}"/>`;
const header = (c, what) => `<!-- Nafaa logo concept (round 2) ${c.id}: ${what}. -->\n`;
const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r1(w)} ${r1(h)}" width="${r1(w)}" height="${r1(h)}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>\n`;

const PAL = {
  tile: { fg: '#ffffff', acc: C.amberLight, inner: C.green, accOn: C.amber },
  mask: { fg: '#000', acc: '#000', inner: '#fff', accOn: '#fff' },
  light: { fg: C.green, acc: C.amber },
  dark: { fg: C.greenLight, acc: C.amberLight },
  mono: { fg: C.mono, acc: C.mono },
};

function iconFile(c) {
  return header(c, 'app icon on a 512 x 512 tile') + svg(512, 512, TILE(C.green) + c.mark(PAL.tile));
}

function iconGroup(c, mode, S, x = 0) {
  if (c.lockup === 'tile') {
    const k = S / 512;
    if (mode === 'mono') {
      return {
        defs: `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><rect width="512" height="512" fill="#fff"/>${c.mark(PAL.mask)}</mask>`,
        body: `<g transform="translate(${x} 0) scale(${r1(k * 10000) / 10000})"><rect width="512" height="512" rx="114" fill="${C.mono}" mask="url(#m)"/></g>`,
      };
    }
    return { defs: '', body: `<g transform="translate(${x} 0) scale(${r1(k * 10000) / 10000})">${TILE(C.green)}${c.mark(PAL.tile)}</g>` };
  }
  const k = S / 288;
  return { defs: '', body: `<g transform="translate(${x} 0) scale(${r1(k * 10000) / 10000}) translate(-112 -112)">${c.mark(PAL[mode])}</g>` };
}

function lockup(c, mode) {
  const S = 120;
  const wordFill = mode === 'mono' ? C.mono : mode === 'dark' ? C.paper : C.ink;
  const dotFill = mode === 'mono' ? C.mono : mode === 'dark' ? C.amberLight : C.amber;
  const label = { light: 'horizontal logo, light backgrounds', dark: 'horizontal logo, dark backgrounds', mono: 'one-colour horizontal logo' }[mode];

  if (c.dotted) {
    // Wordmark-only logo: Inter ExtraBold "nafaa" with the amber dot of noon over the n.
    const size = 112;
    const wm = outline('nafaa', I800, size, -0.03);
    const xh = I800.xHeight * wm.s;
    const n = wm.glyphs[0].bbox;
    const nCx = ((n.minX + n.maxX) / 2) * wm.s - wm.minX;
    const r = size * 0.085, gap = size * 0.1;
    const top = xh + gap + 2 * r;
    const H = top + 4;
    const base = r1(top + 2);
    const body = `<path transform="translate(0 ${base})" fill="${wordFill}" d="${wm.d}"/><circle cx="${r1(nCx)}" cy="${r1(base - xh - gap - r)}" r="${r1(r)}" fill="${dotFill}"/>`;
    return header(c, `${label}. Wordmark: Inter ExtraBold, outlined to paths`) + svg(wm.width, H, body);
  }

  const lower = c.word === c.word.toLowerCase();
  const size = lower ? 92 : 84;
  const wm = outline(c.word, I700, size, -0.025);
  const cap = I700.capHeight * wm.s, xh = I700.xHeight * wm.s;
  const gap = c.lockup === 'bare' ? 26 : 34;
  const icon = iconGroup(c, mode, S);
  const visual = lower ? xh * 0.62 + cap * 0.38 : cap;
  const baseline = r1(S / 2 + visual / 2);
  let body = icon.body + `<path transform="translate(${S + gap} ${baseline})" fill="${wordFill}" d="${wm.d}"/>`;
  let W = S + gap + wm.width;
  if (c.bilingual) {
    const ur = outline('نفع', NQ, 62, 0, { script: 'arab', direction: 'rtl' });
    const ruleX = W + 30;
    const urX = ruleX + 2 + 30;
    const urH = ur.bottom - ur.top;
    const urY = S / 2 - (ur.top + urH / 2);
    body += `<rect x="${r1(ruleX)}" y="${r1(S / 2 - cap * 0.75)}" width="2" height="${r1(cap * 1.5)}" fill="${wordFill}" opacity="0.35"/>`;
    body += `<path transform="translate(${r1(urX)} ${r1(urY)})" fill="${wordFill}" d="${ur.d}"/>`;
    W = urX + ur.width + 3;
  }
  const font = c.bilingual ? 'Wordmark: Inter Bold and Noto Nastaliq Urdu Bold, outlined to paths' : 'Wordmark: Inter Bold, outlined to paths';
  return header(c, `${label}. ${font}`) + svg(W, S, body, icon.defs);
}

fs.mkdirSync(OUT, { recursive: true });
for (const c of concepts) {
  const dir = path.join(OUT, c.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'icon.svg'), iconFile(c));
  fs.writeFileSync(path.join(dir, 'logo-horizontal.svg'), lockup(c, 'light'));
  fs.writeFileSync(path.join(dir, 'logo-dark.svg'), lockup(c, 'dark'));
  fs.writeFileSync(path.join(dir, 'mono.svg'), lockup(c, 'mono'));
}
fs.writeFileSync(path.join(__dirname, 'concepts2.json'), JSON.stringify(concepts.map(({ mark, ...rest }) => rest), null, 2));
console.log('ok', concepts.length);
