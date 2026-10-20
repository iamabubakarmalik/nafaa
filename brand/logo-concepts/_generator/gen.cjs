// Builds icon / horizontal / dark / mono SVGs for every concept.
const fs = require('fs');
const path = require('path');
const fontkit = require('/Users/abubakarmalik/Projects/nafaa/node_modules/.pnpm/fontkit@2.0.4/node_modules/fontkit');
const FONT_DIR = '/Users/abubakarmalik/Projects/nafaa/node_modules/.pnpm/@fontsource+inter@5.3.0/node_modules/@fontsource/inter/files/';
const OUT = process.argv[2] || '/Users/abubakarmalik/Projects/nafaa/brand/logo-concepts';
delete require.cache[require.resolve('./marks.cjs')];
const concepts = require('./marks.cjs');

const C = {
  green: '#16a34a', greenDark: '#15803d', greenLight: '#22c55e',
  amber: '#f59e0b', amberLight: '#fbbf24',
  ink: '#052e16', paper: '#f8fafc', mono: '#020617',
};

const r1 = (v) => Math.round(v * 10) / 10;

// Outline a word in Inter as path data. Baseline at y = 0.
function outline(text, weight, size, tracking) {
  const f = fontkit.openSync(`${FONT_DIR}inter-latin-${weight}-normal.woff`);
  const s = size / f.unitsPerEm;
  const run = f.layout(text);
  let x = 0;
  let d = '';
  run.glyphs.forEach((g, i) => {
    d += g.path.scale(s, -s).translate(x, 0).toSVG();
    x += run.positions[i].xAdvance * s + (i < run.glyphs.length - 1 ? tracking * size : 0);
  });
  // First glyph side bearing so the word starts flush at x = 0.
  const lsb = run.glyphs[0].bbox.minX * s;
  d = d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, a, b) => `${r1(+a - lsb)} ${r1(+b)}`);
  d = d.replace(/(\d)\.0(?=\D)/g, '$1');
  return { d, width: r1(x - lsb - (run.glyphs.at(-1).advanceWidth - run.glyphs.at(-1).bbox.maxX) * s), cap: f.capHeight * s, xh: f.xHeight * s };
}

const TILE = (fill) => `<rect width="512" height="512" rx="114" fill="${fill}"/>`;
const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.greenLight}"/><stop offset="1" stop-color="${C.greenDark}"/></linearGradient>`;

const header = (c, what) => `<!-- Nafaa logo concept ${c.id}: ${what}. Wordmark: Inter Bold, outlined to paths. -->\n`;

function svg(w, h, body, extraDefs = '') {
  const defs = extraDefs ? `<defs>${extraDefs}</defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r1(w)} ${r1(h)}" width="${r1(w)}" height="${r1(h)}">${defs}${body}</svg>\n`;
}

function iconFile(c) {
  const tileFill = c.gradient ? 'url(#g)' : C.green;
  const body = TILE(tileFill) + c.mark({ fg: '#ffffff', acc: C.amberLight });
  return header(c, 'app icon on a 512 x 512 tile').replace('. Wordmark: Inter Bold, outlined to paths', '') +
    svg(512, 512, body, c.gradient ? GRAD : '');
}

// Horizontal lockup. mode: 'light' | 'dark' | 'mono'
function lockup(c, mode) {
  const S = 120; // icon box
  const lower = c.word === c.word.toLowerCase();
  const size = lower ? 92 : 84;
  const wm = outline(c.word, 700, size, -0.025);
  const gap = c.lockup === 'bare' ? 26 : 34;
  const k = S / (c.lockup === 'bare' ? 288 : 512);
  const off = c.lockup === 'bare' ? -112 : 0;
  let iconBody = '';
  let defs = '';
  if (c.lockup === 'tile') {
    if (mode === 'mono') {
      defs = `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><rect width="512" height="512" fill="#fff"/>${c.mark({ fg: '#000', acc: '#000' })}</mask>`;
      iconBody = `<rect width="512" height="512" rx="114" fill="${C.mono}" mask="url(#m)"/>`;
    } else {
      if (c.gradient) defs = GRAD;
      iconBody = TILE(c.gradient ? 'url(#g)' : C.green) + c.mark({ fg: '#ffffff', acc: C.amberLight });
    }
  } else {
    const pal = mode === 'mono' ? { fg: C.mono, acc: C.mono }
      : mode === 'dark' ? { fg: C.greenLight, acc: C.amberLight }
      : { fg: C.green, acc: C.amber };
    iconBody = c.mark(pal);
  }
  const icon = `<g transform="scale(${r1(k * 10000) / 10000})${off ? ` translate(${off} ${off})` : ''}">${iconBody}</g>`;
  // Optical vertical centring: cap height for capitalised words, a blend of x-height and ascender for lowercase.
  const visual = lower ? (wm.xh * 0.62 + wm.cap * 0.38) : wm.cap;
  const baseline = r1(S / 2 + visual / 2);
  const wordFill = mode === 'mono' ? C.mono : mode === 'dark' ? C.paper : C.ink;
  const word = `<path transform="translate(${S + gap} ${baseline})" fill="${wordFill}" d="${wm.d}"/>`;
  const W = S + gap + wm.width;
  const label = mode === 'light' ? 'horizontal logo, light backgrounds' : mode === 'dark' ? 'horizontal logo, dark backgrounds' : 'one-colour horizontal logo';
  return header(c, label) + svg(W, S, icon + word, defs);
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
fs.writeFileSync(path.join(__dirname, 'concepts.json'), JSON.stringify(concepts.map(({ mark, ...rest }) => rest), null, 2));
console.log('ok', concepts.length);
