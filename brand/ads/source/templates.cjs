// HTML templates for the Nafaa Meta ad set.
//
// Every creative is one HTML page rendered to PNG by build.cjs in headless
// Chrome. Layout is absolute and computed per format, so nothing depends on
// how a browser wraps text: each headline line is given explicitly in the copy.
//
// Visual language follows brand/BRAND-GUIDELINES.md: brand green, ink and
// paper backgrounds, the diamond lattice and bowl rings, Inter for Latin text,
// Noto Nastaliq Urdu for Urdu, and the logo files from brand/logo/svg as-is.

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../../..');
const LOGO_DIR = path.join(ROOT, 'brand/logo/svg');

const INTER_DIR = (() => {
  const pnpm = path.join(ROOT, 'node_modules/.pnpm');
  const dir = fs.readdirSync(pnpm).find((d) => d.startsWith('@fontsource+inter@'));
  return path.join(pnpm, dir, 'node_modules/@fontsource/inter/files');
})();

const logoSvg = (name) =>
  fs
    .readFileSync(path.join(LOGO_DIR, `${name}.svg`), 'utf8')
    .replace(/<!--.*?-->/gs, '')
    .replace(/ width="[\d.]+" height="[\d.]+"/, ' width="100%" height="100%"')
    .trim();
const LOGOS = {
  light: logoSvg('nafaa-logo'),
  dark: logoSvg('nafaa-logo-dark'),
  green: logoSvg('nafaa-logo-reversed'),
  icon: logoSvg('nafaa-icon'),
};
const LOGO_RATIO = 377.6 / 120;

// ---- Formats -------------------------------------------------------------------

// safeTop / safeBottom: area kept free of text, logo and buttons. For 9:16 this
// follows Meta's guidance for Stories and Reels (top 14%, bottom 20-35%).
const FORMATS = {
  '4x5': { w: 1080, h: 1350, label: 'Feed 4:5 (main)', pad: 76, safeTop: 0, safeBottom: 0 },
  '9x16': { w: 1080, h: 1920, label: 'Stories / Reels 9:16', pad: 84, safeTop: 270, safeBottom: 384 },
  '1x1': { w: 1080, h: 1080, label: 'Feed 1:1', pad: 72, safeTop: 0, safeBottom: 0 },
  link: { w: 1200, h: 628, label: 'Link / right column 1.91:1', pad: 56, safeTop: 0, safeBottom: 0 },
};

// ---- Icons (Lucide, ISC licence, stroke 2 on a 24 grid) -------------------------

const ICONS = {
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  wifiOff: '<path d="M12 20h.01"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/><path d="M5 13a10 10 0 0 1 5.24-2.76"/><path d="m2 2 20 20"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  swipe: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
};
const icon = (name, size, color, stroke = 2.2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="flex:none;display:block">${ICONS[name]}</svg>`;

// ---- Themes --------------------------------------------------------------------

const THEMES = {
  light: {
    bg: '#f5faf6',
    ink: '#052e16',
    sub: '#3f5a4a',
    accent: '#16a34a',
    muted: '#64748b',
    line: 'rgba(5,46,22,0.10)',
    logo: 'light',
    btnBg: '#16a34a',
    btnInk: '#ffffff',
    ghostInk: '#052e16',
    ghostLine: 'rgba(5,46,22,0.18)',
    ghostBg: '#ffffff',
    pillBg: '#ffffff',
    pillInk: '#14532d',
    pillLine: 'rgba(22,163,74,0.22)',
    deco: '#16a34a',
    glow: 'radial-gradient(1100px 820px at 92% 0%, rgba(187,247,208,0.95) 0%, rgba(220,252,231,0.6) 38%, rgba(245,250,246,0) 70%)',
    glow2: 'radial-gradient(700px 600px at 0% 100%, rgba(254,243,199,0.55) 0%, rgba(245,250,246,0) 70%)',
  },
  dark: {
    bg: '#04200f',
    ink: '#f8fafc',
    sub: 'rgba(236,253,245,0.74)',
    accent: '#4ade80',
    muted: 'rgba(236,253,245,0.55)',
    line: 'rgba(255,255,255,0.12)',
    logo: 'dark',
    btnBg: '#16a34a',
    btnInk: '#ffffff',
    ghostInk: '#f8fafc',
    ghostLine: 'rgba(255,255,255,0.22)',
    ghostBg: 'rgba(255,255,255,0.06)',
    pillBg: 'rgba(255,255,255,0.07)',
    pillInk: '#bbf7d0',
    pillLine: 'rgba(134,239,172,0.28)',
    deco: '#4ade80',
    glow: 'radial-gradient(1000px 760px at 8% 0%, rgba(22,163,74,0.55) 0%, rgba(21,128,61,0.18) 45%, rgba(4,32,15,0) 72%)',
    glow2: 'radial-gradient(900px 700px at 100% 100%, rgba(21,128,61,0.42) 0%, rgba(4,32,15,0) 70%)',
  },
  green: {
    bg: '#15803d',
    ink: '#ffffff',
    sub: 'rgba(255,255,255,0.86)',
    accent: '#fbbf24',
    muted: 'rgba(255,255,255,0.7)',
    line: 'rgba(255,255,255,0.18)',
    logo: 'green',
    btnBg: '#fbbf24',
    btnInk: '#052e16',
    ghostInk: '#ffffff',
    ghostLine: 'rgba(255,255,255,0.4)',
    ghostBg: 'rgba(255,255,255,0.08)',
    pillBg: 'rgba(255,255,255,0.12)',
    pillInk: '#ffffff',
    pillLine: 'rgba(255,255,255,0.28)',
    deco: '#ffffff',
    glow: 'radial-gradient(1100px 820px at 0% 0%, rgba(34,197,94,0.95) 0%, rgba(22,163,74,0.55) 40%, rgba(21,128,61,0) 72%)',
    glow2: 'radial-gradient(900px 700px at 100% 100%, rgba(20,83,45,0.75) 0%, rgba(21,128,61,0) 70%)',
  },
};

// ---- Shared CSS ------------------------------------------------------------------

function fontFaces() {
  const url = (w) => pathToFileURL(path.join(INTER_DIR, `inter-latin-${w}-normal.woff2`)).href;
  return [400, 500, 600, 700, 800]
    .map((w) => `@font-face{font-family:'Inter';font-style:normal;font-weight:${w};font-display:block;src:url('${url(w)}') format('woff2');}`)
    .join('\n');
}

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:transparent}
body{font-family:'Inter',Arial,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;font-feature-settings:'cv11','ss01','tnum' 0}
.ad{position:relative;overflow:hidden}
.abs{position:absolute}
.ur{font-family:'Noto Nastaliq Urdu',serif;direction:rtl;font-weight:700}
.h1{font-weight:800;letter-spacing:-0.038em;line-height:1.02;white-space:nowrap}
.h1 em{font-style:normal}
.sub{font-weight:500;letter-spacing:-0.012em;line-height:1.32}
.num{font-variant-numeric:tabular-nums}
.shot{position:absolute;display:block;image-rendering:auto}
.crop{position:absolute;overflow:hidden;background:#fff}
.crop img{position:absolute;display:block;max-width:none}
`;

// ---- Building blocks -------------------------------------------------------------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Headline lines; `*word*` marks the accent words. */
function lines(list, color) {
  return list
    .map((l) => `<div>${esc(l).replace(/\*(.+?)\*/g, `<em style="color:${color}">$1</em>`)}</div>`)
    .join('');
}

function logo(theme, x, y, h) {
  const w = h * LOGO_RATIO;
  return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${LOGOS[THEMES[theme].logo]}</div>`;
}

function pill(t, text, x, y, size, align = 'left') {
  const pos = align === 'right' ? `right:${x}px` : `left:${x}px`;
  return `<div class="abs" style="${pos};top:${y}px;display:flex;align-items:center;gap:${size * 0.5}px;height:${size * 2.3}px;padding:0 ${size * 0.95}px;border-radius:999px;background:${t.pillBg};border:1.5px solid ${t.pillLine};color:${t.pillInk};font-weight:600;font-size:${size}px;letter-spacing:0.01em;white-space:nowrap">
    <span style="width:${size * 0.5}px;height:${size * 0.5}px;transform:rotate(45deg);background:${t === THEMES.green ? '#fbbf24' : '#f59e0b'};border-radius:1.5px;flex:none"></span>${esc(text)}</div>`;
}

/** Header: logo left, industry pill right. */
function header(theme, f, ind, opts = {}) {
  const t = THEMES[theme];
  const y = (f.safeTop || 0) + (f === FORMATS.link ? 44 : f.pad - 8);
  const lh = f === FORMATS.link ? 38 : 50;
  const ps = f === FORMATS.link ? 17 : 22;
  return logo(theme, f.pad, y, lh) + (opts.noPill ? '' : pill(t, ind.pill, f.pad, y + (lh - ps * 2.3) / 2, ps, 'right'));
}

/** Primary offer button plus the WhatsApp line. */
function cta(theme, x, y, size, opts = {}) {
  const t = THEMES[theme];
  const h = size * 2.7;
  const ur = opts.ur;
  const primary = ur ? '<span class="ur" style="line-height:1;position:relative;top:0.12em">7 دن فری ٹرائل</span>' : esc(opts.primary || '7 din free trial');
  const secondary = ur ? '<span class="ur" style="line-height:1;position:relative;top:0.12em">واٹس ایپ کریں</span>' : esc(opts.secondary || 'WhatsApp karein');
  const dir = ur ? 'row-reverse' : 'row';
  const pos = opts.right != null ? `right:${opts.right}px` : `left:${x}px`;
  return `<div class="abs" style="${pos};top:${y}px;display:flex;flex-direction:${dir};gap:${size * 0.7}px;align-items:center">
    <div style="height:${h}px;padding:0 ${size * 1.25}px;border-radius:${h / 2}px;background:${t.btnBg};color:${t.btnInk};display:flex;align-items:center;gap:${size * 0.5}px;font-weight:700;font-size:${size}px;letter-spacing:-0.01em;white-space:nowrap;box-shadow:0 ${size * 0.5}px ${size * 1.4}px -${size * 0.4}px ${theme === 'green' ? 'rgba(3,23,11,0.45)' : 'rgba(22,163,74,0.55)'}">${primary}${ur ? '' : icon('arrow', size * 1.05, t.btnInk, 2.6)}</div>
    <div style="height:${h}px;padding:0 ${size * 1.05}px;border-radius:${h / 2}px;background:${t.ghostBg};border:2px solid ${t.ghostLine};color:${t.ghostInk};display:flex;flex-direction:${dir};align-items:center;gap:${size * 0.5}px;font-weight:600;font-size:${size * 0.92}px;white-space:nowrap">${icon('chat', size * 1.02, theme === 'green' ? '#ffffff' : '#16a34a', 2.3)}${secondary}</div>
  </div>`;
}

/** Background: glows, the diamond lattice from one corner and bowl rings. */
function background(theme, w, h, opts = {}) {
  const t = THEMES[theme];
  const id = `p${Math.random().toString(36).slice(2, 8)}`;
  const latX = opts.latticeAt === 'left' ? '0%' : '100%';
  const latY = opts.latticeY || '0%';
  const ringsX = opts.ringsX ?? w * 0.86;
  const ringsY = opts.ringsY ?? h * 0.98;
  const ringR = opts.ringR ?? Math.max(w, h) * 0.2;
  const rings = [1, 1.45, 1.9, 2.35, 2.8]
    .map((k) => `<path d="M ${ringsX - ringR * k} ${ringsY} A ${ringR * k} ${ringR * k} 0 0 0 ${ringsX + ringR * k} ${ringsY}" fill="none" stroke="${t.deco}" stroke-width="2" opacity="${theme === 'light' ? 0.13 : 0.16}"/>`)
    .join('');
  return `<div class="abs" style="inset:0;background:${t.bg}"></div>
  <div class="abs" style="inset:0;background:${t.glow}"></div>
  <div class="abs" style="inset:0;background:${t.glow2}"></div>
  <svg class="abs" style="inset:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <pattern id="${id}" width="30" height="30" patternUnits="userSpaceOnUse"><rect x="12" y="12" width="6" height="6" transform="rotate(45 15 15)" fill="${t.deco}"/></pattern>
      <radialGradient id="${id}g" cx="${latX}" cy="${latY}" r="62%"><stop offset="0" stop-color="#fff" stop-opacity="${theme === 'light' ? 0.32 : 0.26}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <mask id="${id}m"><rect width="${w}" height="${h}" fill="url(#${id}g)"/></mask>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#${id})" mask="url(#${id}m)"/>
    ${opts.noRings ? '' : rings}
  </svg>`;
}

// ---- Devices -------------------------------------------------------------------

/** Phone frame; `w` is the outer width. The screenshot fills the screen from the top. */
function phone(img, x, y, w, opts = {}) {
  const bez = w * 0.032;
  const sw = w - bez * 2;
  const sh = opts.screenH ?? sw * (915 / 412) + sw * 0.07;
  const r = w * 0.15;
  const status = sw * 0.07;
  const shadow = opts.shadow ?? '0 60px 120px -30px rgba(3,23,11,0.55), 0 25px 50px -20px rgba(3,23,11,0.35)';
  const rot = opts.rotate ? `transform:rotate(${opts.rotate}deg);transform-origin:50% 50%;` : '';
  const time = opts.time || '6:42';
  const iw = sw;
  const ih = img.h * (sw / img.w);
  const top = opts.scrollY ? -opts.scrollY * (sw / img.w) : 0;
  return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${sh + bez * 2}px;border-radius:${r}px;background:linear-gradient(145deg,#2a312e,#0a0f0d 40%,#151b18);padding:${bez}px;box-shadow:${shadow};${rot}">
    <div style="position:absolute;inset:${bez * 0.35}px;border-radius:${r - bez * 0.35}px;border:1px solid rgba(255,255,255,0.08);pointer-events:none"></div>
    <div style="position:relative;width:${sw}px;height:${sh}px;border-radius:${r - bez}px;overflow:hidden;background:${opts.screenBg || '#ffffff'}">
      <div style="position:absolute;left:0;top:0;width:100%;height:${status}px;display:flex;align-items:center;justify-content:space-between;padding:0 ${sw * 0.085}px;font-weight:600;font-size:${status * 0.42}px;color:#0f172a;background:${opts.statusBg || '#ffffff'};z-index:2">
        <span class="num">${time}</span>
        <span style="display:flex;gap:${status * 0.14}px;align-items:center">
          <svg width="${status * 0.42}" height="${status * 0.3}" viewBox="0 0 17 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#0f172a"/><rect x="4.5" y="5.5" width="3" height="6.5" rx="1" fill="#0f172a"/><rect x="9" y="3" width="3" height="9" rx="1" fill="#0f172a"/><rect x="13.5" y="0" width="3" height="12" rx="1" fill="#0f172a"/></svg>
          <svg width="${status * 0.62}" height="${status * 0.3}" viewBox="0 0 26 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="#0f172a" opacity="0.45"/><rect x="2" y="2" width="16" height="8" rx="1.8" fill="#0f172a"/><rect x="23.5" y="4" width="2" height="4" rx="1" fill="#0f172a" opacity="0.45"/></svg>
        </span>
      </div>
      <div style="position:absolute;left:50%;top:${status * 0.24}px;width:${status * 0.52}px;height:${status * 0.52}px;margin-left:-${status * 0.26}px;border-radius:50%;background:#0a0f0d;z-index:3"></div>
      <img class="shot" src="${img.url}" style="left:0;top:${status + top}px;width:${iw}px;height:${ih}px">
    </div>
  </div>`;
}

/** Laptop with a thin bezel; `w` is the lid width. */
function laptop(img, x, y, w, opts = {}) {
  const bez = w * 0.022;
  const sw = w - bez * 2;
  const sh = sw * (opts.aspect ?? 1000 / 1600);
  const lidH = sh + bez * 2.4;
  const baseW = w * 1.14;
  const baseH = w * 0.03;
  const ih = img.h * (sw / img.w);
  return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;filter:drop-shadow(0 50px 70px rgba(3,23,11,0.42))">
    <div style="position:relative;width:${w}px;height:${lidH}px;border-radius:${w * 0.024}px ${w * 0.024}px ${w * 0.006}px ${w * 0.006}px;background:linear-gradient(180deg,#1c2321,#0b100e);padding:${bez}px ${bez}px ${bez * 1.4}px">
      <div style="position:absolute;left:50%;top:${bez * 0.38}px;width:${bez * 0.3}px;height:${bez * 0.3}px;border-radius:50%;background:#2c3532;margin-left:-${bez * 0.15}px"></div>
      <div style="position:relative;width:${sw}px;height:${sh}px;overflow:hidden;border-radius:${w * 0.004}px;background:#fff">
        <img class="shot" src="${img.url}" style="left:0;top:0;width:${sw}px;height:${ih}px">
      </div>
    </div>
    <div style="position:relative;left:${-(baseW - w) / 2}px;width:${baseW}px;height:${baseH}px;border-radius:0 0 ${baseH * 1.6}px ${baseH * 1.6}px / 0 0 ${baseH}px ${baseH}px;background:linear-gradient(180deg,#e7ebee 0%,#c4cbd1 45%,#8e979f 100%)">
      <div style="position:absolute;left:50%;top:0;width:${w * 0.16}px;height:${baseH * 0.38}px;margin-left:-${w * 0.08}px;border-radius:0 0 ${baseH * 0.4}px ${baseH * 0.4}px;background:linear-gradient(180deg,#aab2b9,#c9d0d5)"></div>
    </div>
  </div>`;
}

/** Tablet in landscape or portrait; `w` is the outer width. */
function tablet(img, x, y, w, opts = {}) {
  const bez = w * 0.028;
  const sw = w - bez * 2;
  const sh = opts.screenH ?? sw * (img.h / img.w);
  const ih = img.h * (sw / img.w);
  return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;height:${sh + bez * 2}px;border-radius:${w * 0.05}px;background:linear-gradient(145deg,#2a312e,#0a0f0d 40%,#151b18);padding:${bez}px;box-shadow:0 60px 110px -30px rgba(3,23,11,0.55),0 20px 40px -18px rgba(3,23,11,0.35)">
    <div style="position:relative;width:${sw}px;height:${sh}px;border-radius:${w * 0.026}px;overflow:hidden;background:#fff">
      <img class="shot" src="${img.url}" style="left:0;top:0;width:${sw}px;height:${ih}px">
    </div>
  </div>`;
}

/**
 * A crop of a real screenshot, shown as a floating card. `rect` is in the
 * screenshot's own pixels; the card is `w` wide and keeps the crop's aspect
 * unless `h` is given (then the crop is anchored at its top).
 */
function crop(img, rect, x, y, w, opts = {}) {
  const [cx, cy, cw, ch] = rect;
  const s = w / cw;
  const h = opts.h ?? ch * s;
  const r = opts.radius ?? 22;
  const shadow = opts.shadow ?? '0 40px 80px -24px rgba(3,23,11,0.45), 0 12px 24px -12px rgba(3,23,11,0.25)';
  const ring = opts.ring ?? 'rgba(5,46,22,0.08)';
  return `<div class="crop" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;box-shadow:${shadow},0 0 0 1.5px ${ring};${opts.rotate ? `transform:rotate(${opts.rotate}deg);` : ''}${opts.style || ''}">
    <img src="${img.url}" style="left:${-cx * s}px;top:${-cy * s}px;width:${img.w * s}px;height:${img.h * s}px">
  </div>`;
}

/** Height a crop card will have at width `w`. */
const cropH = (rect, w) => rect[3] * (w / rect[2]);

// ---- Page wrapper ----------------------------------------------------------------

function page(w, h, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces()}${BASE_CSS}</style></head>
<body><div class="ad" style="width:${w}px;height:${h}px">${body}</div></body></html>`;
}

module.exports = { FORMATS, THEMES, LOGOS, LOGO_RATIO, ICONS, icon, esc, lines, logo, pill, header, cta, background, phone, laptop, tablet, crop, cropH, page };
