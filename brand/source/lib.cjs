// Shared drawing helpers for the Nafaa brand asset set.
//
// Everything here returns SVG markup. Text is converted to outlined paths with
// fontkit (Inter from @fontsource/inter, Noto Nastaliq Urdu from the system
// font folder), so the rendered PNG and PDF files never depend on fonts that
// happen to be installed on the machine.
//
// Logo geometry is read from brand/logo/svg, which is built from the approved
// concept files by brand/logo/source/build.cjs. Nothing here redraws the mark.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const req = (name) => require(require.resolve(name, { paths: [ROOT, path.join(ROOT, 'node_modules/.pnpm/node_modules')] }));
const fontkit = (() => {
  try {
    return req('fontkit');
  } catch {
    const dir = fs.readdirSync(path.join(ROOT, 'node_modules/.pnpm')).find((d) => d.startsWith('fontkit@'));
    return require(path.join(ROOT, 'node_modules/.pnpm', dir, 'node_modules/fontkit'));
  }
})();

// ---- Colours -----------------------------------------------------------------

const C = {
  green: '#16a34a',
  greenDark: '#15803d',
  green800: '#166534',
  green900: '#14532d',
  greenLight: '#22c55e',
  green300: '#86efac',
  green100: '#dcfce7',
  green50: '#f0fdf4',
  amber: '#f59e0b',
  amberLight: '#fbbf24',
  amber100: '#fef3c7',
  ink: '#052e16',
  inkDeep: '#03170b',
  paper: '#f8fafc',
  white: '#ffffff',
  black: '#000000',
  slate900: '#0f172a',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
};

// ---- Fonts and text ----------------------------------------------------------

const INTER_DIR = (() => {
  const pnpm = path.join(ROOT, 'node_modules/.pnpm');
  const dir = fs.readdirSync(pnpm).find((d) => d.startsWith('@fontsource+inter@'));
  return path.join(pnpm, dir, 'node_modules/@fontsource/inter/files');
})();
const fonts = {};
function inter(weight) {
  if (!fonts[weight]) fonts[weight] = fontkit.openSync(path.join(INTER_DIR, `inter-latin-${weight}-normal.woff`));
  return fonts[weight];
}
let nastaliqFont;
function nastaliq() {
  if (nastaliqFont === undefined) {
    try {
      const coll = fontkit.openSync('/System/Library/Fonts/NotoNastaliq.ttc');
      nastaliqFont = coll.fonts ? coll.fonts.find((f) => f.postscriptName === 'NotoNastaliqUrdu-Bold') || coll.fonts[0] : coll;
    } catch {
      nastaliqFont = null;
    }
  }
  return nastaliqFont;
}

const r1 = (v) => Math.round(v * 10) / 10;
const fmt = (d) => d.replace(/-?\d+\.\d+/g, (m) => String(r1(+m)));

// Lays out one line and returns the outlined path data plus metrics.
// track is letter spacing in em (Inter display text looks best at -0.01 to -0.03).
function shape(str, { size = 32, weight = 400, track = 0, font } = {}) {
  const f = font || inter(weight);
  const s = size / f.unitsPerEm;
  const run = f.layout(str, ['kern', 'liga', 'calt']);
  const missing = run.glyphs.findIndex((g) => g.id === 0);
  if (missing >= 0) throw new Error(`Inter has no glyph for "${[...str][missing]}" in "${str}"`);
  let x = 0;
  const parts = [];
  run.glyphs.forEach((g, i) => {
    const pos = run.positions[i];
    const p = g.path.scale(s, -s).translate(x + pos.xOffset * s, -pos.yOffset * s);
    parts.push(p.toSVG());
    x += pos.xAdvance * s + (i < run.glyphs.length - 1 ? track * size : 0);
  });
  return { d: fmt(parts.join('')), width: x, cap: f.capHeight * s, xh: f.xHeight * s, asc: f.ascent * s, desc: -f.descent * s };
}

const measure = (str, o) => shape(str, o).width;

// One line of outlined text. y is the baseline. anchor: start | middle | end.
function text(str, { x = 0, y = 0, size = 32, weight = 400, fill = C.ink, anchor = 'start', track = 0, opacity, font } = {}) {
  if (!str) return '';
  const t = shape(str, { size, weight, track, font });
  const dx = anchor === 'middle' ? -t.width / 2 : anchor === 'end' ? -t.width : 0;
  const op = opacity != null ? ` opacity="${opacity}"` : '';
  return `<path transform="translate(${r1(x + dx)} ${r1(y)})" fill="${fill}"${op} d="${t.d}"/>`;
}

// Greedy word wrap. Returns an array of lines.
function wrap(str, maxW, o) {
  const words = str.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next, o) > maxW) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Multi-line outlined text. Lines may be given as an array (manual breaks) or a
// string (wrapped to maxW). Returns { svg, height, lines }.
function para(content, { x = 0, y = 0, size = 32, weight = 400, fill = C.ink, lh = 1.25, maxW = 1e9, anchor = 'start', track = 0, opacity } = {}) {
  const lines = Array.isArray(content) ? content : wrap(content, maxW, { size, weight, track });
  const svg = lines.map((l, i) => text(l, { x, y: y + i * size * lh, size, weight, fill, anchor, track, opacity })).join('');
  return { svg, height: lines.length * size * lh, lines };
}

// Urdu (Nastaliq) text, right-to-left. Falls back to nothing when the font is missing.
function urdu(str, { x = 0, y = 0, size = 32, fill = C.ink, anchor = 'start', opacity } = {}) {
  const f = nastaliq();
  if (!f) return '';
  const s = size / f.unitsPerEm;
  const run = f.layout(str, { script: 'arab', language: 'URD', direction: 'rtl' });
  // fontkit returns RTL runs in visual order (left to right).
  let pen = 0;
  const parts = [];
  run.glyphs.forEach((g, i) => {
    const pos = run.positions[i];
    parts.push(g.path.scale(s, -s).translate(pen + pos.xOffset * s, -pos.yOffset * s).toSVG());
    pen += pos.xAdvance * s;
  });
  const w = pen;
  const dx = anchor === 'middle' ? -w / 2 : anchor === 'end' ? -w : 0;
  const op = opacity != null ? ` opacity="${opacity}"` : '';
  return `<path transform="translate(${r1(x + dx)} ${r1(y)})" fill="${fill}"${op} d="${fmt(parts.join(''))}"/>`;
}

// ---- Logo --------------------------------------------------------------------

const KIT = path.join(ROOT, 'brand/logo');
const lockupSrc = fs.readFileSync(path.join(KIT, 'svg/nafaa-logo.svg'), 'utf8');
const [BOWL, DOT] = [...lockupSrc.matchAll(/<path d="([^"]+)" fill="[^"]+"\/>/g)].map((m) => m[1]);
const WORD = lockupSrc.match(/<path transform="translate\(146 88\.3\)" fill="[^"]+" d="([^"]+)"/)[1];
if (!BOWL || !DOT || !WORD) throw new Error('Could not read the logo geometry from brand/logo/svg/nafaa-logo.svg');

// Mark bounds in its own 512 grid.
const MARK = { x0: 128, y0: 142, x1: 384, y1: 384, cx: 256, cy: 263, w: 256, h: 242 };
// Lockup visual bounds inside its 377.6 x 120 frame.
const LOCKUP = { x0: 6.67, y0: 12.5, x1: 377.6, y1: 113.3, w: 370.93, h: 100.8 };

const VARIANT = {
  light: { bowl: C.green, dot: C.amber, word: C.ink },
  dark: { bowl: C.greenLight, dot: C.amberLight, word: C.paper },
  reversed: { bowl: C.white, dot: C.amberLight, word: C.white },
  monoBlack: { bowl: C.black, dot: C.black, word: C.black },
  monoWhite: { bowl: C.white, dot: C.white, word: C.white },
};

const markPaths = (bowl, dot) => `<path d="${BOWL}" fill="${bowl}"/><path d="${DOT}" fill="${dot}"/>`;

// The bare mark, centred on (cx, cy), w = width of the visible mark.
function mark({ cx, cy, w, variant = 'light', bowl, dot, opacity }) {
  const v = VARIANT[variant];
  const s = w / MARK.w;
  const op = opacity != null ? ` opacity="${opacity}"` : '';
  return `<g transform="translate(${r1(cx - MARK.cx * s)} ${r1(cy - MARK.cy * s)}) scale(${+s.toFixed(5)})"${op}>${markPaths(bowl || v.bowl, dot || v.dot)}</g>`;
}

// The app icon (mark on the green tile, corner radius 114/512), top-left at (x, y).
function icon({ x, y, size, rx = 114, tileFill = C.green }) {
  const s = size / 512;
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${+s.toFixed(5)})"><rect width="512" height="512" rx="${rx}" fill="${tileFill}"/>${markPaths(C.white, C.amberLight)}</g>`;
}

// Horizontal logo placed by its visible bounds: top-left (x, y), visible height h.
function lockup({ x, y, h, variant = 'light', anchor = 'start' }) {
  const v = VARIANT[variant];
  const s = h / LOCKUP.h;
  const w = LOCKUP.w * s;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return `<g transform="translate(${r1(left - LOCKUP.x0 * s)} ${r1(y - LOCKUP.y0 * s)}) scale(${+s.toFixed(5)})"><g transform="scale(0.41667) translate(-112 -112)">${markPaths(v.bowl, v.dot)}</g><path transform="translate(146 88.3)" fill="${v.word}" d="${WORD}"/></g>`;
}
const lockupWidth = (h) => LOCKUP.w * (h / LOCKUP.h);

// The wordmark alone, baseline at y, cap-to-baseline height ~ 0.986 * size/71.
function wordmark({ x, y, h, fill = C.ink, anchor = 'start' }) {
  const s = h / 71.1;
  const w = 231.6 * s;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return `<path transform="translate(${r1(left)} ${r1(y)}) scale(${+s.toFixed(5)})" fill="${fill}" d="${WORD}"/>`;
}

// ---- Patterns ----------------------------------------------------------------
// All patterns come from the two shapes of the mark: the diamond (the noon dot)
// and the bowl (the lower half of a circle, open upwards).

let uid = 0;
const id = (p) => `${p}${++uid}`;

const diamond = (cx, cy, r, fill, op) => `<path d="M${r1(cx)} ${r1(cy - r)}L${r1(cx + r)} ${r1(cy)}L${r1(cx)} ${r1(cy + r)}L${r1(cx - r)} ${r1(cy)}Z" fill="${fill}"${op != null ? ` opacity="${op}"` : ''}/>`;

// A lattice of small diamonds. fade: optional { cx, cy, r } for a radial fade-out.
function diamondGrid({ w, h, step = 48, r = 3, fill = C.white, opacity = 0.12, fade, offset = 0 }) {
  const pid = id('dg');
  let body = `<pattern id="${pid}" width="${step}" height="${step}" patternUnits="userSpaceOnUse" x="${offset}" y="${offset}">${diamond(step / 2, step / 2, r, fill)}</pattern>`;
  let maskAttr = '';
  if (fade) {
    const gid = id('fg');
    const mid = id('fm');
    body += `<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${fade.cx}" cy="${fade.cy}" r="${fade.r}"><stop offset="0" stop-color="#fff" stop-opacity="${fade.invert ? 0 : 1}"/><stop offset="1" stop-color="#fff" stop-opacity="${fade.invert ? 1 : 0}"/></radialGradient><mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="url(#${gid})"/></mask>`;
    maskAttr = ` mask="url(#${mid})"`;
  }
  return `<defs>${body}</defs><rect width="${w}" height="${h}" fill="url(#${pid})" opacity="${opacity}"${maskAttr}/>`;
}

// Concentric bowls: lower half-circles centred on (cx, cy), opening upwards.
function bowlRings({ cx, cy, r0, n = 6, gap = 40, stroke = C.white, width = 2, opacity = 0.14, fadeOut = true }) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = r0 + i * gap;
    const op = fadeOut ? opacity * (1 - i / (n + 1)) : opacity;
    out += `<path d="M${r1(cx - r)} ${r1(cy)}A${r1(r)} ${r1(r)} 0 0 0 ${r1(cx + r)} ${r1(cy)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" opacity="${+op.toFixed(3)}"/>`;
  }
  return out;
}

// Brand backgrounds.
function bgGreen(w, h, { glow = true } = {}) {
  const a = id('bg');
  const b = id('bg');
  return `<defs><linearGradient id="${a}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.green}"/><stop offset="1" stop-color="${C.greenDark}"/></linearGradient>` +
    `<radialGradient id="${b}" gradientUnits="userSpaceOnUse" cx="${w * 0.2}" cy="${h * 0.05}" r="${Math.max(w, h) * 0.75}"><stop offset="0" stop-color="${C.greenLight}" stop-opacity="0.45"/><stop offset="1" stop-color="${C.greenLight}" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${a})"/>` + (glow ? `<rect width="${w}" height="${h}" fill="url(#${b})"/>` : '');
}
function bgInk(w, h, { glowX = 0.8, glowY = 0.1 } = {}) {
  const a = id('bg');
  return `<rect width="${w}" height="${h}" fill="${C.ink}"/><defs><radialGradient id="${a}" gradientUnits="userSpaceOnUse" cx="${w * glowX}" cy="${h * glowY}" r="${Math.max(w, h) * 0.8}"><stop offset="0" stop-color="${C.green}" stop-opacity="0.38"/><stop offset="0.6" stop-color="${C.green}" stop-opacity="0.06"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#${a})"/>`;
}
function bgPaper(w, h) {
  const a = id('bg');
  return `<rect width="${w}" height="${h}" fill="${C.white}"/><defs><radialGradient id="${a}" gradientUnits="userSpaceOnUse" cx="${w}" cy="0" r="${Math.max(w, h) * 0.9}"><stop offset="0" stop-color="${C.green100}" stop-opacity="0.9"/><stop offset="1" stop-color="${C.green50}" stop-opacity="0"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#${a})"/>`;
}

// ---- UI parts (code-drawn product illustrations) -----------------------------

// Simpler, robust drop shadow (flood + blur on alpha).
function dropShadow(name, { blur = 24, dy = 14, op = 0.22, color = '#052e16' } = {}) {
  return `<filter id="${name}" filterUnits="userSpaceOnUse" x="-10000" y="-10000" width="30000" height="30000" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="${blur / 2}" result="b"/><feOffset in="b" dy="${dy}" result="o"/><feFlood flood-color="${color}" flood-opacity="${op}"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

const rect = (x, y, w, h, rx, fill, extra = '') => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(rx)}" fill="${fill}"${extra}/>`;

// A pill with outlined text. Returns { svg, w }.
function pill(label, { x, y, size = 22, weight = 600, fill = C.green100, color = C.greenDark, padX, h, anchor = 'start', track = 0.04, dot } = {}) {
  padX = padX ?? size * 0.75;
  h = h ?? size * 1.9;
  const tw = measure(label, { size, weight, track });
  const dotW = dot ? size * 0.9 : 0;
  const w = tw + padX * 2 + dotW;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  let svg = rect(left, y, w, h, h / 2, fill);
  if (dot) svg += diamond(left + padX + size * 0.25, y + h / 2, size * 0.26, dot);
  svg += text(label, { x: left + padX + dotW, y: y + h / 2 + size * 0.36, size, weight, fill: color, track });
  return { svg, w, h };
}

// A button-like block with centred text.
function button(label, { x, y, w, h, size = 28, weight = 600, fill = C.amber, color = C.ink, anchor = 'start', rx } = {}) {
  const tw = measure(label, { size, weight });
  w = w ?? tw + size * 2.2;
  h = h ?? size * 2.3;
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return { svg: rect(left, y, w, h, rx ?? h / 2, fill) + text(label, { x: left + w / 2, y: y + h / 2 + size * 0.36, size, weight, fill: color, anchor: 'middle' }), w, h };
}

// A bill (receipt) card, drawn at width w with its top-left at (x, y).
const BILL_ITEMS = [
  ['Doodh 1L', '2', '460'],
  ['Anday (1 darjan)', '1', '390'],
  ['Chai patti 450g', '1', '720'],
  ['Cheeni 1kg', '2', '320'],
];
function billCard({ x, y, w = 420, items = BILL_ITEMS, total = '1,890', no = '1042', filter, dark = false }) {
  const s = w / 420;
  const fg = dark ? C.paper : C.ink;
  const mute = dark ? C.slate400 : C.slate500;
  const line = dark ? '#1e3a2a' : C.slate200;
  const bg = dark ? '#0b2a18' : C.white;
  const rowH = 44;
  const h = 150 + items.length * rowH + 150;
  let o = `<g transform="translate(${r1(x)} ${r1(y)}) scale(${+s.toFixed(4)})">`;
  o += rect(0, 0, 420, h, 28, bg, filter ? ` filter="url(#${filter})"` : '');
  o += icon({ x: 28, y: 28, size: 44 });
  o += text('Bill #' + no, { x: 86, y: 52, size: 20, weight: 700, fill: fg });
  o += text('Aaj, 4:32 PM', { x: 86, y: 76, size: 15, weight: 500, fill: mute });
  o += pill('PAID', { x: 392, y: 34, size: 13, weight: 700, fill: dark ? '#14532d' : C.green100, color: dark ? C.green300 : C.greenDark, anchor: 'end', track: 0.08 }).svg;
  o += `<path d="M28 110H392" stroke="${line}" stroke-width="1.5" stroke-dasharray="5 6"/>`;
  items.forEach(([name, qty, price], i) => {
    const yy = 148 + i * rowH;
    o += text(name, { x: 28, y: yy, size: 17, weight: 500, fill: fg });
    o += text('x' + qty, { x: 270, y: yy, size: 16, weight: 500, fill: mute, anchor: 'end' });
    o += text(price, { x: 392, y: yy, size: 17, weight: 600, fill: fg, anchor: 'end' });
  });
  const ty = 148 + items.length * rowH;
  o += `<path d="M28 ${ty - 10}H392" stroke="${line}" stroke-width="1.5"/>`;
  o += text('Total', { x: 28, y: ty + 30, size: 18, weight: 600, fill: mute });
  o += text('Rs ' + total, { x: 392, y: ty + 34, size: 30, weight: 800, fill: fg, anchor: 'end', track: -0.02 });
  o += rect(28, ty + 62, 364, 54, 16, C.green);
  o += text('Bill WhatsApp par bhejein', { x: 210, y: ty + 96, size: 17, weight: 600, fill: C.white, anchor: 'middle' });
  o += '</g>';
  return { svg: o, h: h * s, w };
}

// A sales stat card with a small bar chart.
function statCard({ x, y, w = 360, label = 'Aaj ki Sale', value = 'Rs 48,250', delta = '+12% kal se', filter, bars = [0.42, 0.55, 0.38, 0.62, 0.7, 0.58, 0.9] }) {
  const s = w / 360;
  const h = 230;
  let o = `<g transform="translate(${r1(x)} ${r1(y)}) scale(${+s.toFixed(4)})">`;
  o += rect(0, 0, 360, h, 26, C.white, filter ? ` filter="url(#${filter})"` : '');
  o += text(label, { x: 26, y: 46, size: 17, weight: 600, fill: C.slate500 });
  o += text(value, { x: 26, y: 92, size: 36, weight: 800, fill: C.ink, track: -0.02 });
  o += pill(delta, { x: 26, y: 110, size: 14, weight: 700, fill: C.green100, color: C.greenDark, track: 0.01 }).svg;
  const bw = 30;
  const gap = 14.6;
  bars.forEach((b, i) => {
    const bh = 70 * b;
    const last = i === bars.length - 1;
    o += rect(26 + i * (bw + gap), 205 - bh, bw, bh, 7, last ? C.green : C.green100);
  });
  o += diamond(26 + 6 * (bw + gap) + bw / 2, 205 - 70 * bars[6] - 14, 6, C.amber);
  o += '</g>';
  return { svg: o, h: h * s, w };
}

// A khata (customer credit) card.
function khataCard({ x, y, w = 360, filter, name = 'Akram Bhai', amount = 'Rs 3,400', note = 'Udhaar baqi' }) {
  const s = w / 360;
  const h = 128;
  let o = `<g transform="translate(${r1(x)} ${r1(y)}) scale(${+s.toFixed(4)})">`;
  o += rect(0, 0, 360, h, 24, C.white, filter ? ` filter="url(#${filter})"` : '');
  o += `<circle cx="58" cy="64" r="30" fill="${C.amber100}"/>`;
  o += text(name.split(' ').map((p) => p[0]).join(''), { x: 58, y: 71, size: 20, weight: 700, fill: '#92400e', anchor: 'middle' });
  o += text(name, { x: 104, y: 56, size: 19, weight: 700, fill: C.ink });
  o += text(note, { x: 104, y: 84, size: 15, weight: 500, fill: C.slate500 });
  o += text(amount, { x: 334, y: 72, size: 21, weight: 800, fill: '#b45309', anchor: 'end' });
  o += '</g>';
  return { svg: o, h: h * s, w };
}

// A phone frame with a simple Nafaa screen inside (header, stat, bill list).
function phone({ x, y, w = 380, filter, screen }) {
  const s = w / 380;
  const H = 780;
  let o = `<g transform="translate(${r1(x)} ${r1(y)}) scale(${+s.toFixed(4)})">`;
  o += rect(0, 0, 380, H, 58, '#0b1510', filter ? ` filter="url(#${filter})"` : '');
  o += rect(12, 12, 356, H - 24, 47, C.paper);
  const cid = id('ph');
  o += `<defs><clipPath id="${cid}"><rect x="12" y="12" width="356" height="${H - 24}" rx="47"/></clipPath></defs><g clip-path="url(#${cid})">`;
  o += screen ? screen() : phoneScreen();
  o += '</g>';
  o += rect(140, 26, 100, 28, 14, '#0b1510');
  o += '</g>';
  return { svg: o, h: H * s, w };
}
function phoneScreen() {
  let o = '';
  o += rect(12, 12, 356, 170, 0, C.green);
  o += bowlRings({ cx: 300, cy: 40, r0: 40, n: 4, gap: 26, opacity: 0.18 });
  o += lockup({ x: 34, y: 76, h: 28, variant: 'reversed' });
  o += text('Assalam-o-Alaikum, Hamid', { x: 34, y: 140, size: 15, weight: 500, fill: C.white, opacity: 0.85 });
  o += statCard({ x: 30, y: 160, w: 320 }).svg;
  o += text('Aaj ke bill', { x: 34, y: 400, size: 16, weight: 700, fill: C.ink });
  const rows = [['Bill #1042', 'Rs 1,890', '4:32 PM'], ['Bill #1041', 'Rs 640', '4:10 PM'], ['Bill #1040', 'Rs 2,215', '3:55 PM'], ['Bill #1039', 'Rs 380', '3:41 PM']];
  rows.forEach(([a, b, c], i) => {
    const yy = 420 + i * 74;
    o += rect(30, yy, 320, 62, 16, C.white);
    o += diamond(56, yy + 31, 8, i === 0 ? C.amber : C.green100);
    o += text(a, { x: 78, y: yy + 28, size: 15, weight: 700, fill: C.ink });
    o += text(c, { x: 78, y: yy + 48, size: 12.5, weight: 500, fill: C.slate500 });
    o += text(b, { x: 332, y: yy + 38, size: 16, weight: 700, fill: C.ink, anchor: 'end' });
  });
  o += rect(30, 716, 320, 0.01, 0, C.white);
  return o;
}

// QR code as one path, top-left (x, y), outer size px (quiet zone not included).
function qr(data, { x, y, size, fill = C.ink }) {
  const dir = fs.readdirSync(path.join(ROOT, 'node_modules/.pnpm')).find((d) => d.startsWith('qr-image@'));
  const lib = require(path.join(ROOT, 'node_modules/.pnpm', dir, 'node_modules/qr-image'));
  const o = lib.svgObject(data, { ec_level: 'M', margin: 0 });
  const s = size / o.size;
  return `<path transform="translate(${r1(x)} ${r1(y)}) scale(${+s.toFixed(5)})" fill="${fill}" d="${o.path}"/>`;
}

// ---- Document wrapper --------------------------------------------------------

function svgDoc(w, h, body, { title, unit } = {}) {
  const dims = unit ? `width="${unit.w}" height="${unit.h}"` : `width="${w}" height="${h}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${dims}>${title ? `<title>${title}</title>` : ''}${body}</svg>\n`;
}

// Picks a shade of `hex` dark enough to carry white text at 4.5:1.
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const contrast = (a, b) => {
  const [l1, l2] = [lum(hexToRgb(a)), lum(hexToRgb(b))].sort((p, q) => q - p);
  return (l1 + 0.05) / (l2 + 0.05);
};
function accessible(hex, against = '#ffffff', min = 4.5) {
  let [r, g, b] = hexToRgb(hex);
  let out = hex;
  for (let i = 0; i < 40 && contrast(out, against) < min; i++) {
    r *= 0.94; g *= 0.94; b *= 0.94;
    out = '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  }
  return out;
}
function tint(hex, t) {
  const [r, g, b] = hexToRgb(hex);
  return '#' + [r, g, b].map((v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('');
}

module.exports = {
  ROOT, C, inter, shape, measure, text, wrap, para, urdu,
  BOWL, DOT, WORD, MARK, LOCKUP, VARIANT, markPaths, mark, icon, lockup, lockupWidth, wordmark,
  diamond, diamondGrid, bowlRings, bgGreen, bgInk, bgPaper,
  dropShadow, rect, pill, button, billCard, statCard, khataCard, phone,
  qr, svgDoc, accessible, contrast, tint, hexToRgb, req, id,
};
