// Builds the final Nafaa brand kit (brand/logo/svg and brand/logo/png).
//
// The artwork is read from concept-02-noon (the approved concept) so the kit
// always uses the exact approved geometry: the noon bowl, the amber diamond
// and the outlined Inter Bold "nafaa" wordmark. Only framing and colour
// variants are produced here; the shapes are never redrawn.
//
// Run from the repo root: node brand/logo/source/build.cjs

const fs = require('fs');
const path = require('path');
const sharp = require(require.resolve('sharp', { paths: [path.resolve(__dirname, '../../..')] }));

const SRC = path.join(__dirname, 'concept-02-noon');
const OUT = path.resolve(__dirname, '..');
const SVG_DIR = path.join(OUT, 'svg');
const PNG_DIR = path.join(OUT, 'png');

const C = {
  green: '#16a34a',
  greenLight: '#22c55e',
  amber: '#f59e0b',
  amberLight: '#fbbf24',
  ink: '#052e16',
  paper: '#f8fafc',
  black: '#000000',
  white: '#ffffff',
};

// ---- Approved geometry, read from the concept files -------------------------

const lockupSrc = fs.readFileSync(path.join(SRC, 'logo-horizontal.svg'), 'utf8');
const markPaths = [...lockupSrc.matchAll(/<g [^>]*>(.*?)<\/g>/g)][0][1].match(/d="([^"]+)"/g).map((m) => m.slice(3, -1));
const [BOWL, DOT] = markPaths;
const WORD = lockupSrc.match(/<path transform="translate\(146 88\.3\)" fill="[^"]+" d="([^"]+)"/)[1];

// Lockup frame from the concept: 377.6 x 120, mark scaled from its 288 box.
const LOCKUP_W = 377.6;
const LOCKUP_H = 120;
const MARK_T = 'scale(0.41667) translate(-112 -112)';
const WORD_T = 'translate(146 88.3)';

// Wordmark bounds (baseline at y = 0): x 0..231.6, y -70.1..1.
const WORD_BOX = { x: 0, y: -70.1, w: 231.6, h: 71.1 };

// Mark bounds in the 512 grid: x 128..384, y 142..384. Centre (256, 263).
const MARK_BOX = '112 119 288 288';

// ---- SVG builders ------------------------------------------------------------

const header = (what) => `<!-- Nafaa logo: ${what}. Paths only. -->\n`;
const svg = (viewBox, w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}">${body}</svg>\n`;

const mark = (bowl, dot) => `<path d="${BOWL}" fill="${bowl}"/><path d="${DOT}" fill="${dot}"/>`;
const tile = (fill, rx = 114) => `<rect width="512" height="512"${rx ? ` rx="${rx}"` : ''} fill="${fill}"/>`;

const iconSvg = (rx = 114) => svg('0 0 512 512', 512, 512, tile(C.green, rx) + mark(C.white, C.amberLight));

function lockupSvg(bowl, dot, word) {
  return svg(`0 0 ${LOCKUP_W} ${LOCKUP_H}`, LOCKUP_W, LOCKUP_H,
    `<g transform="${MARK_T}">${mark(bowl, dot)}</g><path transform="${WORD_T}" fill="${word}" d="${WORD}"/>`);
}

const wordmarkSvg = (fill) =>
  svg(`${WORD_BOX.x} ${WORD_BOX.y} ${WORD_BOX.w} ${WORD_BOX.h}`, WORD_BOX.w, WORD_BOX.h, `<path fill="${fill}" d="${WORD}"/>`);

const markSvg = (bowl, dot) => svg(MARK_BOX, 288, 288, mark(bowl, dot));

const SVGS = {
  'nafaa-icon.svg': header('app icon, mark on the green tile') + iconSvg(),
  'nafaa-mark.svg': header('mark without tile, light backgrounds') + markSvg(C.green, C.amber),
  'nafaa-mark-dark.svg': header('mark without tile, dark backgrounds') + markSvg(C.greenLight, C.amberLight),
  'nafaa-logo.svg': header('horizontal logo, light backgrounds') + lockupSvg(C.green, C.amber, C.ink),
  'nafaa-logo-dark.svg': header('horizontal logo, dark backgrounds') + lockupSvg(C.greenLight, C.amberLight, C.paper),
  'nafaa-logo-reversed.svg': header('horizontal logo on brand green (#16a34a)') + lockupSvg(C.white, C.amberLight, C.white),
  'nafaa-logo-mono-black.svg': header('one-colour horizontal logo, black') + lockupSvg(C.black, C.black, C.black),
  'nafaa-logo-mono-white.svg': header('one-colour horizontal logo, white') + lockupSvg(C.white, C.white, C.white),
  'nafaa-wordmark.svg': header('wordmark only, light backgrounds') + wordmarkSvg(C.ink),
  'nafaa-wordmark-dark.svg': header('wordmark only, dark backgrounds') + wordmarkSvg(C.paper),
};

// ---- PNG helpers -------------------------------------------------------------

// Render at 4x and downsample, which keeps small sizes crisp and even.
async function render(svgText, width, height = width) {
  const vb = svgText.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const density = Math.min(2400, Math.ceil((72 * 4 * width) / vb[2]));
  return sharp(Buffer.from(svgText), { density })
    .resize(width, height, { kernel: 'lanczos3', fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ICO with PNG-encoded entries (supported by every current browser and Windows Vista+).
function ico(entries) {
  const head = Buffer.alloc(6 + 16 * entries.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(entries.length, 4);
  let offset = head.length;
  entries.forEach(({ size, png }, i) => {
    const o = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, o);
    head.writeUInt8(size >= 256 ? 0 : size, o + 1);
    head.writeUInt8(0, o + 2);
    head.writeUInt8(0, o + 3);
    head.writeUInt16LE(1, o + 4);
    head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(png.length, o + 8);
    head.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...entries.map((e) => e.png)]);
}

const write = (name, buf) => fs.writeFileSync(path.join(PNG_DIR, name), buf);

// ---- Build -------------------------------------------------------------------

(async () => {
  fs.mkdirSync(SVG_DIR, { recursive: true });
  fs.mkdirSync(PNG_DIR, { recursive: true });
  for (const [name, text] of Object.entries(SVGS)) fs.writeFileSync(path.join(SVG_DIR, name), text);

  const rounded = iconSvg(114);
  const square = iconSvg(0); // full bleed: platforms apply their own mask

  // Favicons (rounded tile, transparent corners).
  const fav = {};
  for (const s of [16, 32, 48]) {
    fav[s] = await render(rounded, s);
    write(`favicon-${s}.png`, fav[s]);
  }
  write('favicon.ico', ico([16, 32, 48].map((size) => ({ size, png: fav[size] }))));

  // PWA / web app icons.
  write('icon-192.png', await render(rounded, 192));
  write('icon-512.png', await render(rounded, 512));
  // Maskable: full bleed. The mark reaches 147 px from the centre, inside the
  // 205 px safe-zone radius (40% of 512).
  write('icon-maskable-512.png', await render(square, 512));

  // iOS fills transparency with black and rounds corners itself: full bleed, opaque.
  write('apple-touch-icon.png', await sharp(await render(square, 180)).flatten({ background: C.green }).png().toBuffer());
  write('app-icon-1024.png', await sharp(await render(square, 1024)).flatten({ background: C.green }).png().toBuffer());

  // Android adaptive icon (108 dp at 4x = 432 px). The 512 tile maps onto the
  // 72 dp visible area (288 px), so the mark keeps the same proportions as the
  // app icon and stays well inside the 66 dp safe circle.
  const fg = svg('0 0 432 432', 432, 432, `<g transform="translate(72 72) scale(0.5625)">${mark(C.white, C.amberLight)}</g>`);
  write('android-adaptive-foreground.png', await render(fg, 432));
  write('android-adaptive-background.png', await render(svg('0 0 432 432', 432, 432, `<rect width="432" height="432" fill="${C.green}"/>`), 432));

  // Social avatar: full bleed; circle crops keep the whole mark.
  write('social-avatar-400.png', await sharp(await render(square, 400)).flatten({ background: C.green }).png().toBuffer());

  // Default OG image: the reversed lockup centred on brand green.
  const ogH = 168;
  const ogW = (LOCKUP_W / LOCKUP_H) * ogH;
  const og = svg('0 0 1200 630', 1200, 630,
    `<rect width="1200" height="630" fill="${C.green}"/>` +
    `<g transform="translate(${(1200 - ogW) / 2} ${(630 - ogH) / 2}) scale(${ogH / LOCKUP_H})">` +
    `<g transform="${MARK_T}">${mark(C.white, C.amberLight)}</g><path transform="${WORD_T}" fill="${C.white}" d="${WORD}"/></g>`);
  write('og-default.png', await sharp(await render(og, 1200, 630)).flatten({ background: C.green }).png().toBuffer());

  console.log('svg:', Object.keys(SVGS).length, 'png:', fs.readdirSync(PNG_DIR).length);
})();
