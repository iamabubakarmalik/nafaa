// Builds the Nafaa brand asset set (everything in brand/ except brand/logo).
//
// Run from the repo root:  node brand/source/build-assets.cjs
//
// Every image is drawn here as SVG and rendered with sharp; PDFs are rendered
// with rsvg-convert. Text is outlined to paths (see lib.cjs), the logo comes
// from brand/logo/svg, and industry names and colours are read from
// apps/web/src/industries/*/*Pack.tsx. Copy lives in COPY below: change it and
// run the script again rather than editing the PNGs.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib.cjs');

const { C, text, para, pill, button, lockup, mark, icon, rect, diamond } = L;
const sharp = L.req('sharp');
const ROOT = L.ROOT;
const OUT = path.join(ROOT, 'brand');
const TMP = path.join(__dirname, '.tmp');

// ---- Copy --------------------------------------------------------------------

const COPY = {
  tagline: ['Dukaan ka pura hisaab,', 'ek app me.'],
  taglineOne: 'Dukaan ka pura hisaab, ek app me.',
  sub: 'Bill, stock aur khata. Internet ke baghair bhi.',
  what: 'POS, stock aur khata software',
  url: 'nafaa.pk',
  signup: 'app.nafaa.pk/register',
  phone: '+92 324 1772933',
  phoneLocal: '0324-1772933',
  email: 'info@nafaa.pk',
  trial: '7 din Free Trial',
  pitch: 'Apni dukaan ka hisaab asaan banayein',
};

// ---- Output helpers ----------------------------------------------------------

const manifest = [];
const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`);

function record(rel, use, extra = {}) {
  manifest.push({ rel, use, ...extra });
}

// Renders an SVG string to a raster file. Options:
//   ss: supersample factor for small icons; full: skip palette quantising;
//   flatten: background colour (removes alpha); mono: 1-bit black and white;
//   dpi: density metadata for print files.
async function raster(rel, svg, use, opt = {}) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const [, , vw, vh] = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const w = opt.w || +svg.match(/ width="([\d.]+)"/)[1];
  const h = opt.h || Math.round((w * vh) / vw);
  const ss = opt.ss || 1;
  let img = sharp(Buffer.from(svg), { density: (72 * w * ss) / vw });
  if (ss > 1 || opt.w) img = sharp(await img.png().toBuffer()).resize(w, h, { kernel: 'lanczos3', fit: 'fill' });
  if (opt.flatten) img = img.flatten({ background: opt.flatten }).removeAlpha();
  if (opt.mono) img = img.flatten({ background: '#ffffff' }).greyscale().threshold(opt.mono === true ? 160 : opt.mono);
  if (opt.dpi) img = img.withMetadata({ density: opt.dpi });
  if (rel.endsWith('.webp')) img = img.webp({ quality: opt.quality || 88, alphaQuality: 100, effort: 6, smartSubsample: true });
  else if (rel.endsWith('.jpg')) img = img.jpeg({ quality: opt.quality || 88, mozjpeg: true, chromaSubsampling: '4:4:4' });
  else if (opt.mono) img = img.png({ palette: true, colours: 2, compressionLevel: 9 });
  else {
    // Gradients band when quantised, so they stay full colour. Flat artwork
    // takes the palette version when it is smaller.
    const full = await img.clone().png({ compressionLevel: 9, effort: 10, adaptiveFiltering: true }).toBuffer();
    let best = full;
    if (!opt.full && !/Gradient|feGaussianBlur/.test(svg)) {
      const pal = await img.clone().png({ palette: true, quality: 100, effort: 10, compressionLevel: 9, dither: 1 }).toBuffer();
      if (pal.length < full.length) best = pal;
    }
    fs.writeFileSync(file, best);
    record(rel, use, opt.meta);
    return file;
  }
  await img.toFile(file);
  record(rel, use, opt.meta);
  return file;
}

function writeSvg(rel, svg, use) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, svg);
  record(rel, use);
}

// Vector PDF from one or more SVG pages (dimensions in physical units).
function pdf(rel, pages, use) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });
  const inputs = pages.map((svg, i) => {
    const p = path.join(TMP, `${path.basename(rel, '.pdf')}-${i}.svg`);
    fs.writeFileSync(p, svg);
    return p;
  });
  execFileSync('rsvg-convert', ['-f', 'pdf', '-o', file, ...inputs]);
  record(rel, use);
}

const doc = (w, h, body, o) => L.svgDoc(w, h, body, o);
// Print documents: viewBox in pixels at 300 dpi, page size in physical units,
// with an optional bleed b (px) added on every side.
function printDoc(w, h, b, body, unit) {
  const toUnit = (px) => (unit === 'in' ? `${(px / 300).toFixed(4)}in` : `${((px / 300) * 25.4).toFixed(3)}mm`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-b} ${-b} ${w + 2 * b} ${h + 2 * b}" width="${toUnit(w + 2 * b)}" height="${toUnit(h + 2 * b)}">${body}</svg>\n`;
}
const pxDoc = (w, h, b, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-b} ${-b} ${w + 2 * b} ${h + 2 * b}" width="${w + 2 * b}" height="${h + 2 * b}">${body}</svg>\n`;

const SH = (name = 'sh', o) => `<defs>${L.dropShadow(name, o)}</defs>`;

// ---- Industries (read from the web app's industry packs) ---------------------

function readIndustries() {
  const dir = path.join(ROOT, 'apps/web/src/industries');
  return fs.readdirSync(dir)
    .filter((d) => !d.startsWith('_') && fs.existsSync(path.join(dir, d)) && fs.statSync(path.join(dir, d)).isDirectory())
    .map((d) => {
      const f = fs.readdirSync(path.join(dir, d)).find((n) => /Pack\.tsx$/.test(n));
      if (!f) return null;
      const src = fs.readFileSync(path.join(dir, d, f), 'utf8');
      const get = (k) => (src.match(new RegExp(`\\n\\s*${k}:\\s*'([^']+)'`)) || [])[1];
      const id = get('id');
      if (!id) return null;
      const color = (src.match(/\n\s*color:\s*'(#[0-9a-fA-F]{6})'/) || [])[1] || C.green;
      const priority = +((src.match(/priority:\s*(\d+)/) || [])[1] || 0);
      return { id, name: get('name'), shortName: get('shortName') || get('name'), color, priority };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Three sample bill lines per industry, for the OG cards.
const SAMPLE = {
  agri: [['DAP khaad 50kg', '1', '12,400'], ['Gandum beej 40kg', '2', '9,600'], ['Spray 1L', '1', '1,850']],
  appliances: [['Inverter AC 1.5 ton', '1', '1,45,000'], ['Washing machine', '1', '62,500'], ['Microwave', '1', '24,900']],
  autoparts: [['Brake pads (set)', '1', '3,200'], ['Engine oil 4L', '1', '6,450'], ['Air filter', '1', '1,150']],
  bakery: [['Chocolate cake 2 lb', '1', '2,400'], ['Rusk (packet)', '3', '540'], ['Patties', '6', '720']],
  bookstore: [['Register 200 pages', '4', '880'], ['Geometry box', '1', '450'], ['Gel pens (pack)', '2', '360']],
  carpet: [['Irani qaleen 6x9', '1', '48,000'], ['Floor mat', '2', '3,600'], ['Fitting charges', '1', '2,500']],
  clinic: [['Consultation', '1', '1,500'], ['Follow-up visit', '1', '800'], ['BP check', '1', '200']],
  cosmetics: [['Lipstick (shade 12)', '1', '1,250'], ['Face wash 150ml', '1', '890'], ['Gift set', '1', '3,400']],
  dairy: [['Doodh 1L', '6', '1,320'], ['Dahi 1kg', '1', '300'], ['Makhan 200g', '1', '480']],
  electronics: [['Bluetooth earbuds', '1', '4,500'], ['Fast charger 25W', '1', '2,200'], ['Power bank', '1', '5,800']],
  florist: [['Gulab bouquet', '1', '3,500'], ['Mehndi thaal phool', '1', '6,000'], ['Gajray', '4', '800']],
  furniture: [['Sofa set 5 seater', '1', '1,85,000'], ['Centre table', '1', '28,000'], ['Delivery', '1', '3,000']],
  gaming: [['PS5 controller', '1', '19,500'], ['Gaming hour (PC)', '3', '600'], ['Gift card', '1', '5,000']],
  garments: [['Lawn suit 3pc (M)', '1', '6,850'], ['Kurta (L)', '1', '3,200'], ['Dupatta', '1', '1,450']],
  gym: [['Monthly membership', '1', '5,000'], ['Personal training', '4', '8,000'], ['Protein shake', '2', '1,200']],
  hardware: [['Cement bag', '10', '14,500'], ['PVC pipe 1 inch', '6', '2,700'], ['Paint 4L', '1', '4,950']],
  hotel: [['Deluxe room (2 raat)', '1', '18,000'], ['Breakfast', '2', '1,600'], ['Laundry', '1', '700']],
  jewelry: [['Gold ring 4.2g', '1', '1,26,000'], ['Making charges', '1', '6,500'], ['Silver chain', '1', '8,400']],
  meat: [['Beef boneless 1kg', '2', '2,400'], ['Chicken 1kg', '1', '690'], ['Mutton 1kg', '1', '2,600']],
  mobile: [['Smartphone 8/256', '1', '64,999'], ['Screen protector', '1', '600'], ['Back cover', '1', '850']],
  optical: [['Eye test', '1', '500'], ['Frame (metal)', '1', '4,800'], ['Lenses (pair)', '1', '6,200']],
  petshop: [['Cat food 1.2kg', '2', '3,800'], ['Bird cage', '1', '2,900'], ['Pet shampoo', '1', '950']],
  pharmacy: [['Panadol (strip)', '2', '120'], ['Cough syrup 120ml', '1', '285'], ['ORS sachet', '5', '150']],
  restaurant: [['Chicken karahi (half)', '1', '1,650'], ['Naan', '4', '160'], ['Raita', '1', '120']],
  retail: [['Doodh 1L', '2', '460'], ['Chai patti 450g', '1', '720'], ['Cheeni 1kg', '2', '320']],
  salon: [['Haircut', '1', '800'], ['Facial', '1', '2,500'], ['Mehndi', '1', '1,500']],
  'services-biz': [['AC service', '1', '3,500'], ['Gas refill', '1', '6,000'], ['Visit charges', '1', '1,000']],
  shoe: [['Joggers (size 42)', '1', '7,450'], ['Chappal (size 9)', '1', '1,890'], ['Shoe polish', '1', '250']],
  sports: [['Cricket bat (hard ball)', '1', '14,500'], ['Tape ball (pack)', '1', '600'], ['Batting gloves', '1', '3,200']],
  toystore: [['Remote car', '1', '4,200'], ['Building blocks', '1', '2,850'], ['Gudiya', '1', '1,600']],
};
const totalOf = (items) => {
  const n = items.reduce((s, [, , p]) => s + Number(p.replace(/,/g, '')), 0);
  return n.toLocaleString('en-IN');
};

// ---- Shared pieces -----------------------------------------------------------

// Avatar: full-bleed green with the centred mark (safe for circle crops).
function avatar(size) {
  return doc(size, size, `<rect width="${size}" height="${size}" fill="${C.green}"/>${mark({ cx: size / 2, cy: size / 2, w: size * 0.52, variant: 'reversed' })}`);
}

// A green hero background with the lattice and rings.
function heroGreen(w, h, { ringsX = 0.82, ringsY = 0.15, r0, gap, n = 8, step, fadeR } = {}) {
  const m = Math.min(w, h);
  return L.bgGreen(w, h) +
    L.diamondGrid({ w, h, step: step || Math.max(28, Math.round(m / 14)), r: Math.max(1.8, m / 260), opacity: 0.16, fade: { cx: w * ringsX, cy: h * ringsY, r: Math.max(w, h) * (fadeR || 0.7) } }) +
    L.bowlRings({ cx: w * ringsX, cy: h * ringsY, r0: r0 || m * 0.22, n, gap: gap || m * 0.075, width: Math.max(1.5, m / 380), opacity: 0.2 });
}
function heroInk(w, h, { ringsX = 0.8, ringsY = 0.1, r0, gap, n = 8 } = {}) {
  const m = Math.min(w, h);
  return L.bgInk(w, h, { glowX: ringsX, glowY: ringsY }) +
    L.diamondGrid({ w, h, step: Math.max(28, Math.round(m / 14)), r: Math.max(1.8, m / 260), fill: C.greenLight, opacity: 0.14, fade: { cx: w * ringsX, cy: h * ringsY, r: Math.max(w, h) * 0.7 } }) +
    L.bowlRings({ cx: w * ringsX, cy: h * ringsY, r0: r0 || m * 0.22, n, gap: gap || m * 0.075, stroke: C.greenLight, width: Math.max(1.5, m / 380), opacity: 0.22 });
}
function heroPaper(w, h, { ringsX = 0.85, ringsY = 0.1 } = {}) {
  const m = Math.min(w, h);
  return L.bgPaper(w, h) +
    L.diamondGrid({ w, h, step: Math.max(28, Math.round(m / 14)), r: Math.max(1.8, m / 280), fill: C.green, opacity: 0.16, fade: { cx: w * ringsX, cy: h * ringsY, r: Math.max(w, h) * 0.6 } }) +
    L.bowlRings({ cx: w * ringsX, cy: h * ringsY, r0: m * 0.2, n: 7, gap: m * 0.07, stroke: C.green, width: Math.max(1.5, m / 400), opacity: 0.16 });
}

// Barcode label card (for the "new feature" template).
function barcodeCard({ x, y, w = 520, filter }) {
  const s = w / 520;
  let o = `<g transform="translate(${x} ${y}) scale(${s})">`;
  o += rect(0, 0, 520, 330, 28, C.white, filter ? ` filter="url(#${filter})"` : '');
  o += text('Chai patti 450g', { x: 40, y: 70, size: 30, weight: 700, fill: C.ink });
  o += text('Rs 720', { x: 480, y: 70, size: 30, weight: 800, fill: C.greenDark, anchor: 'end' });
  // Deterministic bar pattern.
  let bx = 40;
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  let bars = '';
  while (bx < 470) {
    const bw = 2 + Math.floor(rnd() * 4) * 2;
    bars += `<rect x="${bx}" y="105" width="${bw}" height="150" fill="${C.ink}"/>`;
    bx += bw + 3 + Math.floor(rnd() * 3) * 2;
  }
  o += bars;
  o += text('8 964000 123457', { x: 260, y: 296, size: 24, weight: 600, fill: C.slate600, anchor: 'middle', track: 0.12 });
  o += '</g>';
  return o;
}

// ---- WhatsApp ----------------------------------------------------------------

async function whatsapp() {
  await raster('whatsapp/profile-640.png', avatar(640), 'WhatsApp Business profile photo. WhatsApp crops it to a circle; the mark sits well inside it.');

  // Cover (business profile header) and catalog item.
  {
    const W = 1600, H = 900;
    let b = heroGreen(W, H, { ringsX: 0.5, ringsY: 0.22, r0: 200, gap: 64, n: 9 });
    b += lockup({ x: W / 2, y: 330, h: 130, variant: 'reversed', anchor: 'middle' });
    b += text(COPY.taglineOne, { x: W / 2, y: 560, size: 46, weight: 600, fill: C.white, anchor: 'middle', track: -0.015 });
    b += text(`${COPY.url}  ·  ${COPY.phone}`, { x: W / 2, y: 625, size: 28, weight: 500, fill: C.white, anchor: 'middle', opacity: 0.8 });
    await raster('whatsapp/cover-1600x900.png', doc(W, H, b), 'WhatsApp Business cover photo (Edit profile > Cover photo). Content stays in the middle band, so any wide crop works.');
  }
  {
    const W = 1080, H = 1080;
    let b = heroPaper(W, H, { ringsX: 0.9, ringsY: 0.05 }) + SH('sh', { blur: 40, dy: 20, op: 0.16 });
    b += lockup({ x: 80, y: 84, h: 56 });
    b += para(['Nafaa POS'], { x: 80, y: 250, size: 76, weight: 800, fill: C.ink, track: -0.03 }).svg;
    b += para(['Bill, stock aur khata,', 'ek hi app me.'], { x: 80, y: 316, size: 36, weight: 500, fill: C.slate600, lh: 1.3 }).svg;
    b += rect(0, 520, W, 560, 0, C.green);
    b += L.bowlRings({ cx: 860, cy: 520, r0: 140, n: 7, gap: 52, opacity: 0.22 });
    b += L.billCard({ x: 120, y: 450, w: 400, filter: 'sh' }).svg;
    b += L.statCard({ x: 580, y: 610, w: 400, filter: 'sh' }).svg;
    b += pill(COPY.trial, { x: 580, y: 920, size: 30, weight: 700, fill: C.amberLight, color: C.ink, track: 0.01, dot: C.ink }).svg;
    await raster('whatsapp/catalog-1080.png', doc(W, H, b), 'WhatsApp Business catalog item image (Catalog > Add item), square.');
  }

  // Status templates (1080 x 1920). Top ~220 px and bottom ~260 px are covered by WhatsApp's UI.
  const SW = 1080, SHt = 1920;
  const statusFooter = (variant = 'reversed', color = C.white) =>
    text(COPY.url, { x: SW / 2, y: 1600, size: 40, weight: 700, fill: color, anchor: 'middle', track: 0.01 });

  {
    let b = heroGreen(SW, SHt, { ringsX: 0.5, ringsY: 0.14, r0: 150, gap: 70, n: 10 }) + SH('sh', { blur: 50, dy: 26, op: 0.25 });
    b += lockup({ x: SW / 2, y: 290, h: 78, variant: 'reversed', anchor: 'middle' });
    b += para(['Nafaa me', 'khush aamdeed!'], { x: SW / 2, y: 560, size: 100, weight: 800, fill: C.white, anchor: 'middle', track: -0.03, lh: 1.08 }).svg;
    b += para(['Bill, stock aur khata, sab ek jagah.', 'Internet ke baghair bhi.'], { x: SW / 2, y: 770, size: 40, weight: 500, fill: C.white, anchor: 'middle', opacity: 0.9, lh: 1.35 }).svg;
    b += L.phone({ x: SW / 2 - 230, y: 930, w: 460, filter: 'sh' }).svg;
    await raster('whatsapp/status-welcome.png', doc(SW, SHt, b), 'WhatsApp status: welcome / introduction.');
  }
  {
    let b = heroInk(SW, SHt, { ringsX: 0.5, ringsY: 0.62 }) + SH('sh', { blur: 60, dy: 30, op: 0.5, color: '#000' });
    b += lockup({ x: SW / 2, y: 290, h: 70, variant: 'dark', anchor: 'middle' });
    b += pill('NAYA FEATURE', { x: SW / 2, y: 470, size: 30, weight: 700, fill: C.amberLight, color: C.ink, anchor: 'middle', track: 0.12, dot: C.ink }).svg;
    b += para(['Barcode labels,', 'ek click me'], { x: SW / 2, y: 680, size: 104, weight: 800, fill: C.white, anchor: 'middle', track: -0.03, lh: 1.08 }).svg;
    b += para(['Product chunein, label print karein', 'aur counter par scan karein.'], { x: SW / 2, y: 900, size: 40, weight: 500, fill: C.slate300, anchor: 'middle', lh: 1.35 }).svg;
    b += barcodeCard({ x: SW / 2 - 330, y: 1060, w: 660, filter: 'sh' });
    b += statusFooter('dark', C.green300);
    await raster('whatsapp/status-new-feature.png', doc(SW, SHt, b), 'WhatsApp status: new feature announcement (copy in COPY / whatsapp() of the build script).');
  }
  {
    let b = heroGreen(SW, SHt, { ringsX: 0.5, ringsY: 0.5, r0: 300, gap: 80, n: 9 });
    b += lockup({ x: SW / 2, y: 290, h: 70, variant: 'reversed', anchor: 'middle' });
    b += pill('KHAAS OFFER', { x: SW / 2, y: 520, size: 30, weight: 700, fill: C.white, color: C.greenDark, anchor: 'middle', track: 0.12, dot: C.amber }).svg;
    b += text('7 din', { x: SW / 2, y: 900, size: 300, weight: 800, fill: C.amberLight, anchor: 'middle', track: -0.04 });
    b += text('Free Trial', { x: SW / 2, y: 1060, size: 130, weight: 800, fill: C.white, anchor: 'middle', track: -0.03 });
    b += para(['Poora Nafaa istemal karein.', 'Pasand aaye to plan lein.'], { x: SW / 2, y: 1190, size: 42, weight: 500, fill: C.white, anchor: 'middle', opacity: 0.9, lh: 1.35 }).svg;
    b += button('Aaj hi shuru karein', { x: SW / 2, y: 1360, size: 40, weight: 700, fill: C.amberLight, color: C.ink, anchor: 'middle' }).svg;
    b += text(COPY.signup, { x: SW / 2, y: 1600, size: 36, weight: 600, fill: C.white, anchor: 'middle', opacity: 0.9 });
    await raster('whatsapp/status-offer.png', doc(SW, SHt, b), 'WhatsApp status: offer (7 din Free Trial).');
  }
  {
    let b = heroPaper(SW, SHt, { ringsX: 0.5, ringsY: 0.55 }) + SH('sh', { blur: 60, dy: 30, op: 0.22 });
    b += lockup({ x: SW / 2, y: 290, h: 70, anchor: 'middle' });
    b += para(['Nafaa app', 'download karein'], { x: SW / 2, y: 560, size: 100, weight: 800, fill: C.ink, anchor: 'middle', track: -0.03, lh: 1.08 }).svg;
    b += text('Mobile aur computer, dono par.', { x: SW / 2, y: 770, size: 40, weight: 500, fill: C.slate600, anchor: 'middle' });
    const chips = ['Android', 'iPhone', 'Windows', 'Mac'];
    const cw = chips.map((c) => L.measure(c, { size: 30, weight: 600, track: 0.02 }) + 50);
    const total = cw.reduce((a, b2) => a + b2, 0) + 20 * (chips.length - 1);
    let cx = SW / 2 - total / 2;
    chips.forEach((c, i) => {
      b += pill(c, { x: cx, y: 830, size: 30, weight: 600, fill: C.white, color: C.ink, track: 0.02, padX: 25 }).svg.replace('<rect', `<rect stroke="${C.slate200}" stroke-width="2"`);
      cx += cw[i] + 20;
    });
    b += L.phone({ x: SW / 2 - 220, y: 990, w: 440, filter: 'sh' }).svg;
    b += `<defs><linearGradient id="fadeW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>`;
    b += rect(0, 1300, SW, 230, 0, 'url(#fadeW)') + rect(0, 1529, SW, 391, 0, C.white);
    b += text(COPY.url, { x: SW / 2, y: 1610, size: 44, weight: 700, fill: C.greenDark, anchor: 'middle' });
    await raster('whatsapp/status-download-app.png', doc(SW, SHt, b), 'WhatsApp status: download the app. Check that the listed platforms are live before posting.');
  }
  {
    let b = heroGreen(SW, SHt, { ringsX: 0.5, ringsY: 0.14, r0: 150, gap: 70, n: 10 });
    b += lockup({ x: SW / 2, y: 290, h: 70, variant: 'reversed', anchor: 'middle' });
    b += statusFooter();
    await raster('whatsapp/status-blank.png', doc(SW, SHt, b), 'WhatsApp status: blank branded template; add your own text between y 450 and y 1500.');
  }

  // Greeting and away message cards (1080 x 1080).
  {
    const W = 1080;
    let b = rect(0, 0, W, W, 0, C.white);
    b += `<g>${heroGreen(W, 520, { ringsX: 0.85, ringsY: 0.1, r0: 110, gap: 46 })}</g>`;
    b += mark({ cx: 150, cy: 190, w: 150, variant: 'reversed' });
    b += text('Assalam-o-Alaikum!', { x: 80, y: 410, size: 84, weight: 800, fill: C.white, track: -0.03 });
    b += text('Nafaa me khush aamdeed. Batayein, hum kaise madad karein?', { x: 80, y: 470, size: 30, weight: 500, fill: C.white, opacity: 0.9 });
    const opts = [['1', 'Demo dekhein'], ['2', 'Qeemat aur plans'], ['3', 'Support se baat karein']];
    opts.forEach(([n, label], i) => {
      const y = 590 + i * 130;
      b += rect(80, y, 920, 104, 26, C.green50);
      b += rect(104, y + 22, 60, 60, 16, C.green);
      b += text(n, { x: 134, y: y + 64, size: 32, weight: 800, fill: C.white, anchor: 'middle' });
      b += text(label, { x: 196, y: y + 64, size: 36, weight: 600, fill: C.ink });
      b += diamond(966, y + 52, 9, C.amber);
    });
    b += text('Number likh kar bhejein.', { x: 80, y: 1010, size: 28, weight: 500, fill: C.slate500 });
    b += text(COPY.url, { x: 1000, y: 1010, size: 28, weight: 700, fill: C.greenDark, anchor: 'end' });
    await raster('whatsapp/greeting-1080.png', doc(W, W, b), 'Greeting card. The greeting message itself is text only, so save this as a Quick reply (Business tools > Quick replies, e.g. /salam) and send it after the greeting.');
  }
  {
    const W = 1080;
    let b = heroInk(W, W, { ringsX: 0.5, ringsY: 0.3, r0: 120, gap: 60, n: 9 });
    b += mark({ cx: W / 2, cy: 300, w: 200, variant: 'dark' });
    b += text('Shukriya!', { x: W / 2, y: 560, size: 104, weight: 800, fill: C.white, anchor: 'middle', track: -0.03 });
    b += para(['Aap ka message mil gaya hai.', 'Hum abhi online nahi hain, jald jawab denge.'], { x: W / 2, y: 650, size: 36, weight: 500, fill: C.slate300, anchor: 'middle', lh: 1.4 }).svg;
    b += pill('Tab tak dekhein: nafaa.pk', { x: W / 2, y: 830, size: 32, weight: 600, fill: '#0e3b22', color: C.green300, anchor: 'middle', track: 0.01, dot: C.amberLight }).svg;
    await raster('whatsapp/away-1080.png', doc(W, W, b), 'Away card. Away messages are text only; save this as a Quick reply (e.g. /baad) for after-hours replies, or attach it from the WhatsApp Business API.');
  }

  // Sticker: the mark with a white die-cut outline, transparent WebP.
  {
    const W = 512;
    const s = 340 / L.MARK.w;
    const g = (inner) => `<g transform="translate(${W / 2 - L.MARK.cx * s} ${W / 2 - L.MARK.cy * s}) scale(${s})">${inner}</g>`;
    const outline = `<path d="${L.BOWL}"/><path d="${L.DOT}"/>`;
    let b = `<defs><filter id="st" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="7"/><feOffset dy="6"/><feComponentTransfer><feFuncA type="linear" slope="0.28"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    b += `<g filter="url(#st)">${g(`<g fill="#fff" stroke="#fff" stroke-width="44" stroke-linejoin="round">${outline}</g>`)}${g(L.markPaths(C.green, C.amber))}</g>`;
    await raster('whatsapp/sticker-512.webp', doc(W, W, b), 'WhatsApp sticker (512 x 512 transparent WebP, under 100 KB).', { quality: 90 });
    await raster('whatsapp/sticker-tray-96.png', doc(W, W, b), 'Sticker pack tray icon (96 x 96 PNG), needed when the sticker is published as a pack.', { w: 96, h: 96, full: true });
  }
}

// ---- Social ------------------------------------------------------------------

async function social() {
  const avatars = [
    ['social/facebook/profile-720.png', 720, 'Facebook page profile picture (shown as a circle).'],
    ['social/instagram/profile-1080.png', 1080, 'Instagram profile picture (shown as a circle).'],
    ['social/linkedin/profile-400.png', 400, 'LinkedIn company logo.'],
    ['social/x/profile-400.png', 400, 'X (Twitter) profile picture.'],
    ['social/youtube/profile-800.png', 800, 'YouTube channel picture.'],
    ['social/tiktok/profile-200.png', 200, 'TikTok profile picture.'],
  ];
  for (const [rel, s, use] of avatars) await raster(rel, avatar(s), use);

  // Facebook cover 1640 x 624. Mobile shows the centre ~1110 px; desktop puts
  // the profile picture over the bottom-left corner.
  {
    const W = 1640, H = 624;
    let b = heroGreen(W, H, { ringsX: 0.86, ringsY: 0.02, r0: 120, gap: 46, n: 9 }) + SH('sh', { blur: 40, dy: 18, op: 0.28 });
    b += lockup({ x: 430, y: 110, h: 56, variant: 'reversed' });
    b += para(COPY.tagline, { x: 430, y: 262, size: 52, weight: 700, fill: C.white, track: -0.025, lh: 1.12 }).svg;
    b += text(COPY.sub, { x: 430, y: 380, size: 26, weight: 500, fill: C.white, opacity: 0.88 });
    b += pill(`${COPY.trial}  ·  ${COPY.url}`, { x: 430, y: 406, size: 22, weight: 700, fill: C.amberLight, color: C.ink, track: 0.01, dot: C.ink }).svg;
    b += L.billCard({ x: 1080, y: 96, w: 260, filter: 'sh' }).svg;
    await raster('social/facebook/cover-1640x624.png', doc(W, H, b), 'Facebook page cover photo. Content sits inside the mobile safe zone (centre 1110 x 470).');
  }

  // Instagram post 1080 x 1350 (+ blank template) and story 1080 x 1920.
  {
    const W = 1080, H = 1350;
    const base = () => heroPaper(W, H, { ringsX: 0.92, ringsY: 0.04 }) + SH('sh', { blur: 44, dy: 22, op: 0.2 }) + lockup({ x: 90, y: 96, h: 54 }) + text(COPY.url, { x: 990, y: 136, size: 28, weight: 600, fill: C.greenDark, anchor: 'end' });
    let b = base();
    b += para(['Har bill ka hisaab,', 'aap ke haath me.'], { x: 90, y: 330, size: 84, weight: 800, fill: C.ink, track: -0.03, lh: 1.1 }).svg;
    b += para(['Bill banayein, stock dekhein aur khata', 'rakhein. Internet na ho tab bhi.'], { x: 90, y: 500, size: 34, weight: 500, fill: C.slate600, lh: 1.4 }).svg;
    b += rect(60, 660, 960, 630, 48, C.green);
    b += `<g>${L.bowlRings({ cx: 900, cy: 660, r0: 120, n: 6, gap: 50, opacity: 0.22 })}</g>`;
    b += L.billCard({ x: 110, y: 610, w: 430, filter: 'sh' }).svg;
    b += L.statCard({ x: 580, y: 760, w: 390, filter: 'sh' }).svg;
    b += L.khataCard({ x: 580, y: 1040, w: 390, filter: 'sh' }).svg;
    await raster('social/instagram/post-1080x1350.png', doc(W, H, b), 'Instagram feed post (4:5). Text stays inside the 3:4 profile-grid crop.');
    let blank = base() + rect(60, 660, 960, 630, 48, C.green) + L.bowlRings({ cx: 900, cy: 660, r0: 120, n: 6, gap: 50, opacity: 0.22 });
    await raster('social/instagram/post-blank-1080x1350.png', doc(W, H, blank), 'Instagram post template: headline area (y 220-600) and green panel left empty.');
  }
  {
    const W = 1080, H = 1920;
    let b = heroInk(W, H, { ringsX: 0.5, ringsY: 0.45 }) + SH('sh', { blur: 60, dy: 30, op: 0.55, color: '#000' });
    b += lockup({ x: W / 2, y: 290, h: 70, variant: 'dark', anchor: 'middle' });
    b += para(COPY.tagline, { x: W / 2, y: 520, size: 82, weight: 800, fill: C.white, anchor: 'middle', track: -0.03, lh: 1.12 }).svg;
    b += text(COPY.sub, { x: W / 2, y: 715, size: 36, weight: 500, fill: C.slate300, anchor: 'middle' });
    b += L.phone({ x: W / 2 - 200, y: 810, w: 400, filter: 'sh' }).svg;
    b += L.khataCard({ x: 600, y: 1210, w: 400, filter: 'sh' }).svg;
    b += button(`${COPY.trial}  ·  ${COPY.url}`, { x: W / 2, y: 1560, size: 34, weight: 700, fill: C.amberLight, color: C.ink, anchor: 'middle' }).svg;
    await raster('social/instagram/story-1080x1920.png', doc(W, H, b), 'Instagram / Facebook story. Top 250 px and bottom 280 px kept clear of text.');
    let blank = heroInk(W, H, { ringsX: 0.5, ringsY: 0.45 }) + lockup({ x: W / 2, y: 290, h: 70, variant: 'dark', anchor: 'middle' }) + text(COPY.url, { x: W / 2, y: 1600, size: 40, weight: 700, fill: C.green300, anchor: 'middle' });
    await raster('social/instagram/story-blank-1080x1920.png', doc(W, H, blank), 'Story template: logo and link only.');
  }

  // LinkedIn company cover 1128 x 191. The company logo covers the bottom-left.
  {
    const W = 1128, H = 191;
    let b = heroGreen(W, H, { ringsX: 0.2, ringsY: -0.3, r0: 70, gap: 30, n: 7 });
    b += text(COPY.taglineOne, { x: 300, y: 92, size: 32, weight: 700, fill: C.white, track: -0.02 });
    b += text(`${COPY.what}  ·  ${COPY.url}`, { x: 300, y: 128, size: 18, weight: 500, fill: C.white, opacity: 0.88 });
    b += lockup({ x: 1080, y: 76, h: 38, variant: 'reversed', anchor: 'end' });
    await raster('social/linkedin/cover-1128x191.png', doc(W, H, b), 'LinkedIn company page cover. Left 280 px kept clear for the logo.');
  }

  // X header 1500 x 500. The profile picture covers the bottom-left.
  {
    const W = 1500, H = 500;
    let b = heroGreen(W, H, { ringsX: 0.12, ringsY: 0.0, r0: 90, gap: 44, n: 9 }) + SH('sh', { blur: 36, dy: 16, op: 0.28 });
    b += lockup({ x: 560, y: 128, h: 54, variant: 'reversed' });
    b += para(COPY.tagline, { x: 560, y: 270, size: 50, weight: 700, fill: C.white, track: -0.025, lh: 1.12 }).svg;
    b += text(COPY.url, { x: 560, y: 400, size: 26, weight: 600, fill: C.white, opacity: 0.9 });
    b += L.statCard({ x: 1110, y: 140, w: 300, filter: 'sh' }).svg;
    await raster('social/x/header-1500x500.png', doc(W, H, b), 'X (Twitter) header. Left 500 px of the lower half kept clear for the profile picture.');
  }

  // YouTube banner 2560 x 1440 (safe area 1546 x 423 in the centre) and thumbnail.
  {
    const W = 2560, H = 1440;
    let b = heroGreen(W, H, { ringsX: 0.5, ringsY: 0.2, r0: 360, gap: 80, n: 10 }) + SH('sh', { blur: 50, dy: 24, op: 0.28 });
    b += lockup({ x: W / 2, y: 548, h: 110, variant: 'reversed', anchor: 'middle' });
    b += text(COPY.taglineOne, { x: W / 2, y: 790, size: 66, weight: 700, fill: C.white, anchor: 'middle', track: -0.025 });
    b += text(`${COPY.sub}  ·  ${COPY.url}`, { x: W / 2, y: 870, size: 36, weight: 500, fill: C.white, anchor: 'middle', opacity: 0.88 });
    b += L.statCard({ x: 150, y: 600, w: 330, filter: 'sh' }).svg;
    b += L.billCard({ x: 2110, y: 520, w: 300, filter: 'sh' }).svg;
    await raster('social/youtube/banner-2560x1440.png', doc(W, H, b), 'YouTube channel banner. Logo and text inside the 1546 x 423 safe area; cards outside it show on desktop and TV only.');
  }
  {
    const W = 1280, H = 720;
    const base = () => heroGreen(W, H, { ringsX: 0.78, ringsY: 0.0, r0: 120, gap: 52, n: 10 }) + SH('sh', { blur: 40, dy: 20, op: 0.3 }) + lockup({ x: 72, y: 64, h: 50, variant: 'reversed' });
    let b = base();
    b += pill('NAFAA GUIDE', { x: 72, y: 190, size: 24, weight: 700, fill: C.amberLight, color: C.ink, track: 0.12, dot: C.ink }).svg;
    b += para(['Khata kaise', 'rakhein?'], { x: 72, y: 360, size: 112, weight: 800, fill: C.white, track: -0.035, lh: 1.02 }).svg;
    b += text('Udhaar ka saaf record, 3 aasaan steps.', { x: 72, y: 560, size: 34, weight: 600, fill: C.white, opacity: 0.92 });
    b += L.khataCard({ x: 780, y: 170, w: 420, filter: 'sh' }).svg;
    b += L.khataCard({ x: 740, y: 340, w: 420, filter: 'sh', name: 'Saima Baji', amount: 'Rs 1,250', note: 'Kal tak wapas' }).svg;
    b += L.khataCard({ x: 800, y: 510, w: 380, filter: 'sh', name: 'Rafiq Store', amount: 'Rs 8,900', note: 'Is mahine' }).svg.replace(/#b45309/g, C.greenDark);
    await raster('social/youtube/thumbnail-1280x720.png', doc(W, H, b), 'YouTube video thumbnail (example). Bottom-right corner kept clear for the duration badge.');
    await raster('social/youtube/thumbnail-blank-1280x720.png', doc(W, H, base()), 'YouTube thumbnail template: logo only.');
  }
}

// ---- App stores, desktop ----------------------------------------------------

async function stores() {
  // Play feature graphic 1024 x 500.
  {
    const W = 1024, H = 500;
    let b = heroGreen(W, H, { ringsX: 0.82, ringsY: 0.05, r0: 100, gap: 42, n: 9 }) + SH('sh', { blur: 30, dy: 14, op: 0.3 });
    b += lockup({ x: 64, y: 72, h: 48, variant: 'reversed' });
    b += para(COPY.tagline, { x: 64, y: 230, size: 50, weight: 800, fill: C.white, track: -0.03, lh: 1.12 }).svg;
    b += text(COPY.sub, { x: 64, y: 350, size: 22, weight: 500, fill: C.white, opacity: 0.9 });
    b += pill(COPY.trial, { x: 64, y: 384, size: 20, weight: 700, fill: C.amberLight, color: C.ink, track: 0.01, dot: C.ink }).svg;
    b += L.phone({ x: 740, y: 56, w: 220, filter: 'sh' }).svg;
    b += L.khataCard({ x: 560, y: 330, w: 260, filter: 'sh' }).svg;
    await raster('app-store/play-feature-1024x500.png', doc(W, H, b), 'Google Play feature graphic.', { full: true, flatten: C.green });
  }

  // Store icon 1024: the kit's master, guaranteed opaque (iOS rejects alpha).
  await sharp(path.join(ROOT, 'brand/logo/png/app-icon-1024.png')).flatten({ background: C.green }).removeAlpha().png({ compressionLevel: 9 }).toFile(path.join(OUT, 'app-store/app-icon-1024.png'));
  record('app-store/app-icon-1024.png', 'App Store and Google Play icon (full bleed, no alpha; the stores round the corners).');
  await sharp(path.join(OUT, 'app-store/app-icon-1024.png')).resize(512, 512, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'app-store/play-icon-512.png'));
  record('app-store/play-icon-512.png', 'Google Play hi-res icon (512 x 512, full bleed; Play applies its own mask and shadow).');

  // Notification icon: white silhouette on transparent, Android sizes.
  {
    const W = 96;
    const sil = doc(W, W, mark({ cx: 48, cy: 48, w: 80, bowl: C.white, dot: C.white }));
    writeSvg('app-store/notification/ic_stat_nafaa.svg', sil.replace('<svg ', '<!-- Nafaa notification icon: white silhouette, 24 dp. -->\n<svg '), 'Notification icon source (Android vector asset import).');
    const dens = { 24: 'mdpi', 36: 'hdpi', 48: 'xhdpi', 72: 'xxhdpi', 96: 'xxxhdpi' };
    for (const s of [96, 72, 48, 36, 24]) {
      await raster(`app-store/notification/ic_stat_nafaa-${s}.png`, sil, `Android notification icon, drawable-${dens[s]} (copy as res/drawable-${dens[s]}/ic_stat_nafaa.png).`, { w: s, h: s, ss: 4, full: true });
    }
  }

  // Splash screens: the mark on brand green, wordmark near the bottom.
  for (const [W, H, use] of [[1242, 2688, 'iPhone splash / launch image (also fine for Android 12+ with the icon on green).'], [2048, 2732, 'iPad splash / launch image.']]) {
    let b = `<rect width="${W}" height="${H}" fill="${C.green}"/>`;
    b += mark({ cx: W / 2, cy: H * 0.46, w: Math.min(W, H) * 0.3, variant: 'reversed' });
    b += L.wordmark({ x: W / 2, y: H - H * 0.08, h: Math.min(W, H) * 0.045, fill: C.white, anchor: 'middle' });
    await raster(`app-store/splash-${W}x${H}.png`, doc(W, H, b), use, { full: true, flatten: C.green });
  }
}

async function desktop() {
  fs.mkdirSync(path.join(OUT, 'desktop/tray'), { recursive: true });
  // Windows .ico: the rounded tile at 16-256.
  const tile = fs.readFileSync(path.join(ROOT, 'brand/logo/svg/nafaa-icon.svg'), 'utf8');
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const entries = [];
  for (const s of sizes) {
    const big = await sharp(Buffer.from(tile), { density: (72 * s * 4) / 512 }).png().toBuffer();
    entries.push({ size: s, png: await sharp(big).resize(s, s, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer() });
  }
  fs.writeFileSync(path.join(OUT, 'desktop/nafaa.ico'), icoFile(entries));
  record('desktop/nafaa.ico', 'Windows app icon (16, 24, 32, 48, 64, 128, 256). Use for the Electron Windows build and installer.');

  // macOS: the Big Sur grid (824 px tile centred on a 1024 canvas, soft shadow).
  const mac = doc(1024, 1024, `<defs><filter id="m" x="-10%" y="-10%" width="120%" height="125%"><feGaussianBlur in="SourceAlpha" stdDeviation="10"/><feOffset dy="10"/><feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#m)">${icon({ x: 100, y: 100, size: 824, rx: 185 })}</g>`);
  await raster('desktop/macos-icon-1024.png', mac, 'macOS app icon master (Big Sur grid with shadow). Source for nafaa.icns.', { full: true });
  const set = path.join(TMP, 'nafaa.iconset');
  fs.rmSync(set, { recursive: true, force: true });
  fs.mkdirSync(set, { recursive: true });
  for (const s of [16, 32, 128, 256, 512]) {
    for (const k of [1, 2]) {
      const px = s * k;
      const name = `icon_${s}x${s}${k === 2 ? '@2x' : ''}.png`;
      const big = await sharp(Buffer.from(mac), { density: Math.max(72, (72 * px * 2) / 1024) }).png().toBuffer();
      await sharp(big).resize(px, px, { kernel: 'lanczos3' }).png().toFile(path.join(set, name));
    }
  }
  try {
    execFileSync('iconutil', ['-c', 'icns', set, '-o', path.join(OUT, 'desktop/nafaa.icns')]);
    record('desktop/nafaa.icns', 'macOS app icon (16 to 1024, built with iconutil).');
  } catch (e) {
    console.warn('iconutil not available: nafaa.icns not built. Run iconutil -c icns on', set);
  }

  // Tray icons. macOS template images: black + alpha, macOS tints them.
  const silhouette = (fill, s) => doc(s, s, mark({ cx: s / 2, cy: s / 2, w: s * 0.94, bowl: fill, dot: fill }));
  await raster('desktop/tray/trayTemplate.png', silhouette('#000', 64), 'macOS menu bar icon, 16 pt @1x (template image: black + alpha, macOS tints it).', { w: 16, h: 16, ss: 4, full: true });
  await raster('desktop/tray/trayTemplate@2x.png', silhouette('#000', 64), 'macOS menu bar icon, 16 pt @2x.', { w: 32, h: 32, ss: 4, full: true });
  await raster('desktop/tray/trayTemplate-32.png', silhouette('#000', 64), 'Larger template tray icon, 32 pt @1x.', { w: 32, h: 32, ss: 4, full: true });
  await raster('desktop/tray/trayTemplate-32@2x.png', silhouette('#000', 64), 'Larger template tray icon, 32 pt @2x.', { w: 64, h: 64, ss: 4, full: true });
  await raster('desktop/tray/tray-white-16.png', silhouette('#fff', 64), 'Windows/Linux tray icon, white, 16 px (dark taskbars).', { w: 16, h: 16, ss: 4, full: true });
  await raster('desktop/tray/tray-white-32.png', silhouette('#fff', 64), 'Windows/Linux tray icon, white, 32 px.', { w: 32, h: 32, ss: 4, full: true });
  const trayIco = [];
  for (const s of [16, 32]) {
    const big = await sharp(Buffer.from(tile), { density: (72 * s * 4) / 512 }).png().toBuffer();
    trayIco.push({ size: s, png: await sharp(big).resize(s, s, { kernel: 'lanczos3' }).png().toBuffer() });
  }
  fs.writeFileSync(path.join(OUT, 'desktop/tray/tray.ico'), icoFile(trayIco));
  record('desktop/tray/tray.ico', 'Windows tray icon in full colour (16 + 32), readable on light and dark taskbars.');
}

function icoFile(entries) {
  const head = Buffer.alloc(6 + 16 * entries.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(entries.length, 4);
  let offset = head.length;
  entries.forEach(({ size, png }, i) => {
    const o = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, o);
    head.writeUInt8(size >= 256 ? 0 : size, o + 1);
    head.writeUInt16LE(1, o + 4);
    head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(png.length, o + 8);
    head.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...entries.map((e) => e.png)]);
}

// ---- Web: OG cards and email -------------------------------------------------

const OGW = 1200, OGH = 630;

// Light OG card with an accent panel on the right.
function ogCard({ eyebrow, title, sub, accent = C.green, panel }) {
  const acc = L.accessible(accent);
  let b = L.bgPaper(OGW, OGH) + SH('sh', { blur: 32, dy: 16, op: 0.22 });
  b += L.diamondGrid({ w: 640, h: OGH, step: 34, r: 2, fill: acc, opacity: 0.12, fade: { cx: 0, cy: OGH, r: 520 } });
  b += lockup({ x: 72, y: 64, h: 40 });
  b += pill(eyebrow.toUpperCase(), { x: 72, y: 170, size: 18, weight: 700, fill: L.tint(acc, 0.86), color: acc, track: 0.12, dot: C.amber }).svg;
  const t = para(title, { x: 72, y: 290, size: 60, weight: 800, fill: C.ink, track: -0.03, lh: 1.08, maxW: 560 });
  b += t.svg;
  b += para(sub, { x: 72, y: 290 + t.height + 12, size: 26, weight: 500, fill: C.slate600, lh: 1.35, maxW: 540 }).svg;
  b += text(COPY.url, { x: 72, y: 572, size: 22, weight: 700, fill: acc });
  // Panel.
  b += rect(700, 40, 460, 550, 40, acc);
  const cid = L.id('og');
  b += `<defs><clipPath id="${cid}"><rect x="700" y="40" width="460" height="550" rx="40"/></clipPath></defs><g clip-path="url(#${cid})">`;
  b += L.bowlRings({ cx: 1100, cy: 40, r0: 90, n: 8, gap: 46, opacity: 0.22 });
  b += `<g transform="translate(700 40)">${L.diamondGrid({ w: 460, h: 550, step: 30, r: 1.8, opacity: 0.16, fade: { cx: 460, cy: 0, r: 420 } })}</g>`;
  b += '</g>';
  b += panel ? panel(acc) : '';
  return doc(OGW, OGH, b);
}

async function web(industries) {
  // Default: the brand hero on green.
  {
    let b = heroGreen(OGW, OGH, { ringsX: 0.84, ringsY: 0.04, r0: 110, gap: 44, n: 9 }) + SH('sh', { blur: 34, dy: 18, op: 0.3 });
    b += lockup({ x: 72, y: 70, h: 50, variant: 'reversed' });
    b += para(COPY.tagline, { x: 72, y: 300, size: 62, weight: 800, fill: C.white, track: -0.03, lh: 1.1 }).svg;
    b += text(COPY.sub, { x: 72, y: 440, size: 26, weight: 500, fill: C.white, opacity: 0.9 });
    b += text(COPY.url, { x: 72, y: 560, size: 24, weight: 700, fill: C.white });
    b += L.billCard({ x: 820, y: 70, w: 300, filter: 'sh' }).svg;
    b += L.statCard({ x: 700, y: 400, w: 260, filter: 'sh' }).svg;
    await raster('og/og-default.png', doc(OGW, OGH, b), 'Default social share image (home page and any page without its own card).');
  }

  const names = industries.map((i) => i.shortName);
  const sections = [
    {
      key: 'pricing', eyebrow: 'Pricing', title: 'Saaf qeemat, har dukaan ke liye', sub: 'Plan chunein ya pehle 7 din free istemal karein.',
      panel: () => {
        let o = rect(760, 120, 340, 390, 30, C.white, ' filter="url(#sh)"');
        o += text('Free Trial', { x: 790, y: 180, size: 22, weight: 700, fill: C.slate500 });
        o += text('7 din', { x: 790, y: 262, size: 76, weight: 800, fill: C.ink, track: -0.03 });
        ['Bill aur receipt', 'Stock aur khata', 'Reports'].forEach((f, i) => {
          o += diamond(800, 320 + i * 44, 8, i === 0 ? C.amber : C.green);
          o += text(f, { x: 822, y: 328 + i * 44, size: 22, weight: 600, fill: C.ink });
        });
        o += rect(790, 440, 280, 46, 23, C.green) + text('Shuru karein', { x: 930, y: 471, size: 20, weight: 700, fill: C.white, anchor: 'middle' });
        return o;
      },
    },
    {
      key: 'industries', eyebrow: 'Industries', title: 'Har business ka apna setup', sub: `${industries.length} industries ke liye tayyar screens, bill aur reports.`,
      panel: () => {
        // Lay the chips out in rows, then centre the block in the panel.
        const rows = [[]];
        let x = 0;
        names.slice().sort().forEach((n) => {
          const w = L.measure(n, { size: 17, weight: 600 }) + 30;
          if (x + w > 400 && rows[rows.length - 1].length) { rows.push([]); x = 0; }
          rows[rows.length - 1].push({ n, w });
          x += w + 8;
        });
        const top = 315 - (rows.length * 46 - 8) / 2;
        let o = '';
        rows.forEach((row, ri) => {
          const rw = row.reduce((a, c) => a + c.w, 0) + 8 * (row.length - 1);
          let cx = 930 - rw / 2;
          row.forEach(({ n, w }, ci) => {
            const y = top + ri * 46;
            const hi = (ri + ci) % 7 === 3;
            o += rect(cx, y, w, 38, 19, hi ? C.amberLight : C.white) + text(n, { x: cx + 15, y: y + 25, size: 17, weight: 600, fill: C.ink });
            cx += w + 8;
          });
        });
        return o;
      },
    },
    { key: 'features', eyebrow: 'Features', title: 'Bill, stock, khata aur reports', sub: 'Dukaan ka har kaam ek app me, internet ke baghair bhi.', panel: () => L.statCard({ x: 760, y: 110, w: 340, filter: 'sh' }).svg + L.khataCard({ x: 760, y: 380, w: 340, filter: 'sh' }).svg },
    {
      key: 'blog', eyebrow: 'Blog', title: 'Dukaan chalane ke kaam ke tareeqay', sub: 'Hisaab, stock aur sale par aasaan guides.',
      panel: () => {
        let o = '';
        [['Khata kaise rakhein', '5 min'], ['Stock kam ho to kya karein', '4 min'], ['Roz ki sale ka hisaab', '6 min']].forEach(([t, m], i) => {
          const y = 110 + i * 140;
          o += rect(750, y, 360, 118, 24, C.white, ' filter="url(#sh)"');
          o += rect(772, y + 22, 74, 74, 18, C.green100) + diamond(809, y + 59, 12, i === 1 ? C.amber : C.green);
          o += text(t, { x: 866, y: y + 54, size: 17, weight: 700, fill: C.ink });
          o += text(`${m} read`, { x: 866, y: y + 84, size: 16, weight: 500, fill: C.slate500 });
        });
        return o;
      },
    },
    {
      key: 'developers', eyebrow: 'Developers', title: 'Nafaa API se apna system jorein', sub: 'Products, bills aur stock ke liye REST API aur webhooks.',
      panel: () => {
        let o = rect(745, 110, 370, 400, 26, '#04220f', ' filter="url(#sh)"');
        o += `<circle cx="775" cy="140" r="7" fill="#ef4444"/><circle cx="797" cy="140" r="7" fill="${C.amber}"/><circle cx="819" cy="140" r="7" fill="${C.greenLight}"/>`;
        const lines = [['GET', '/v1/products', C.green300], ['GET', '/v1/stock', C.green300], ['GET', '/v1/sales', C.green300], ['POST', '/v1/webhooks', C.amberLight]];
        lines.forEach(([m, p, col], i) => {
          const y = 210 + i * 52;
          o += text(m, { x: 772, y, size: 20, weight: 700, fill: col });
          o += text(p, { x: 852, y, size: 20, weight: 500, fill: C.paper });
        });
        o += text('200 OK', { x: 772, y: 450, size: 18, weight: 600, fill: C.slate400 });
        o += text('{ "total": 1890 }', { x: 772, y: 480, size: 18, weight: 600, fill: C.green300 });
        return o;
      },
    },
    {
      key: 'services', eyebrow: 'Services', title: 'Setup, training aur support', sub: 'Hum aap ki dukaan Nafaa par set karte hain.',
      panel: () => {
        let o = '';
        [['1', 'Products aur stock upload'], ['2', 'Staff ki training'], ['3', 'Support, jab zaroorat ho']].forEach(([n, t], i) => {
          const y = 120 + i * 130;
          o += rect(750, y, 360, 104, 24, C.white, ' filter="url(#sh)"');
          o += rect(772, y + 24, 56, 56, 16, C.green) + text(n, { x: 800, y: y + 62, size: 26, weight: 800, fill: C.white, anchor: 'middle' });
          o += text(t, { x: 848, y: y + 60, size: 18, weight: 700, fill: C.ink });
        });
        return o;
      },
    },
  ];
  for (const s of sections) {
    await raster(`og/og-${s.key}.png`, ogCard({ eyebrow: s.eyebrow, title: s.title, sub: s.sub, accent: C.green, panel: s.panel }), `Share image for /${s.key} and its child pages.`);
  }

  for (const [n, ind] of industries.entries()) {
    const items = SAMPLE[ind.id] || SAMPLE.retail;
    const svg = ogCard({
      eyebrow: 'Industry',
      title: ind.name.replace(/\s*\/\s*/g, ' / '),
      sub: `${ind.shortName} ke liye POS, stock aur khata.`,
      accent: ind.color,
      panel: () => {
        const h = ((150 + items.length * 44 + 150) * 320) / 420;
        return L.billCard({ x: 770, y: 315 - h / 2, w: 320, items, total: totalOf(items), no: String(1040 + n * 13), filter: 'sh' }).svg;
      },
    });
    await raster(`og/industry/og-${ind.id}.png`, svg, `Share image for /industries/${ind.id} (accent ${L.accessible(ind.color)}, from ${ind.color}).`, { meta: { group: 'industry' } });
  }

  // Email header 600 x 200 (+ @2x).
  {
    const W = 600, H = 200;
    let b = heroGreen(W, H, { ringsX: 0.5, ringsY: -0.1, r0: 70, gap: 26, n: 8 });
    b += lockup({ x: W / 2, y: 58, h: 52, variant: 'reversed', anchor: 'middle' });
    b += text(COPY.taglineOne, { x: W / 2, y: 152, size: 18, weight: 600, fill: C.white, anchor: 'middle', opacity: 0.92 });
    const svg = doc(W, H, b);
    await raster('email/email-header-600x200.png', svg, 'Email header (display at 600 x 200).');
    await raster('email/email-header-600x200@2x.png', svg, 'Email header for retina screens: use this file with width="600".', { w: 1200, h: 400 });
  }
  // Email signature 600 x 150 (+ @2x) and the logo used by the HTML snippet.
  {
    const W = 600, H = 150;
    let b = rect(0, 0, W, H, 0, C.white);
    b += icon({ x: 24, y: 30, size: 90 });
    b += `<path d="M138 30V120" stroke="${C.slate200}" stroke-width="1.5"/>`;
    b += text('Nafaa Team', { x: 160, y: 56, size: 22, weight: 700, fill: C.ink, track: -0.01 });
    b += text(COPY.what, { x: 160, y: 80, size: 14, weight: 500, fill: C.slate500 });
    b += text(`${COPY.phone}   ·   ${COPY.email}   ·   ${COPY.url}`, { x: 160, y: 114, size: 14, weight: 600, fill: C.greenDark });
    b += rect(0, 146, W, 4, 0, C.green) + diamond(587, 140, 6, C.amber);
    const svg = doc(W, H, b);
    await raster('email/email-signature-600x150.png', svg, 'Email signature as one image (team / generic). For a personal signature use the HTML snippet.');
    await raster('email/email-signature-600x150@2x.png', svg, 'Email signature image for retina screens: use with width="600".', { w: 1200, h: 300 });
    const logo = doc(480, 128, rect(0, 0, 480, 128, 0, C.white) + lockup({ x: 240, y: 24, h: 80, anchor: 'middle' }));
    await raster('email/signature-logo@2x.png', logo, 'Logo for the HTML signature (shown at 120 x 32). Host it at a public URL.', { full: true, flatten: C.white });
    const html = `<!--
  Nafaa email signature. Inline styles and a table only, so it survives Gmail,
  Outlook and Apple Mail. Before use:
  1. Upload email/signature-logo@2x.png to a public URL and put it in src below.
  2. Replace Full Name and Designation.
  3. Paste the rendered signature (open this file in a browser, select all,
     copy) into Gmail > Settings > Signature, or Outlook > Signatures.
-->
<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:Inter,Arial,Helvetica,sans-serif;color:${C.ink};">
  <tr>
    <td style="padding:0 16px 0 0;vertical-align:top;">
      <a href="https://${COPY.url}" style="text-decoration:none;"><img src="https://${COPY.url}/email/signature-logo@2x.png" width="120" height="32" alt="Nafaa" style="display:block;border:0;width:120px;height:32px;"></a>
    </td>
    <td style="padding:0 0 0 16px;border-left:2px solid ${C.green};vertical-align:top;">
      <div style="font-size:15px;line-height:20px;font-weight:700;color:${C.ink};">Full Name</div>
      <div style="font-size:13px;line-height:18px;color:${C.greenDark};font-weight:600;">Designation, Nafaa</div>
      <div style="font-size:13px;line-height:20px;color:${C.slate600};padding-top:6px;">
        <a href="tel:${COPY.phone.replace(/\s/g, '')}" style="color:${C.slate600};text-decoration:none;">${COPY.phone}</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:${COPY.email}" style="color:${C.slate600};text-decoration:none;">${COPY.email}</a>
        &nbsp;&middot;&nbsp;
        <a href="https://${COPY.url}" style="color:${C.greenDark};text-decoration:none;font-weight:600;">${COPY.url}</a>
      </div>
      <div style="font-size:12px;line-height:18px;color:${C.slate500};">${COPY.what}</div>
    </td>
  </tr>
</table>
`;
    fs.writeFileSync(path.join(OUT, 'email/email-signature.html'), html);
    record('email/email-signature.html', 'HTML email signature (inline styles, table layout). Steps are in the comment at the top of the file.');
  }
}

// ---- Print -------------------------------------------------------------------

async function print() {
  // Business card 3.5 x 2 in at 300 dpi; PDF adds 1/8 in bleed.
  const CW = 1050, CH = 600;
  const front = (b) => {
    let o = `<g transform="translate(${-b} ${-b})">${heroGreen(CW + 2 * b, CH + 2 * b, { ringsX: 0.9, ringsY: 0.0, r0: 80, gap: 40, n: 9 })}</g>`;
    o += lockup({ x: CW / 2, y: 232, h: 120, variant: 'reversed', anchor: 'middle' });
    o += text(COPY.url, { x: CW / 2, y: 500, size: 30, weight: 600, fill: C.white, anchor: 'middle', opacity: 0.9, track: 0.02 });
    return o;
  };
  const back = (b) => {
    let o = rect(-b, -b, CW + 2 * b, CH + 2 * b, 0, C.white);
    o += L.diamondGrid({ w: CW, h: CH, step: 30, r: 1.8, fill: C.green, opacity: 0.1, fade: { cx: CW, cy: CH, r: 520 } });
    o += mark({ cx: 130, cy: 128, w: 92 });
    o += text('Full Name', { x: 84, y: 270, size: 52, weight: 700, fill: C.ink, track: -0.02 });
    o += text('Designation', { x: 84, y: 318, size: 28, weight: 600, fill: C.greenDark });
    [COPY.phone, COPY.email, COPY.url].forEach((t, i) => {
      o += diamond(94, 410 + i * 54, 7, i === 0 ? C.amber : C.green);
      o += text(t, { x: 118, y: 420 + i * 54, size: 28, weight: 500, fill: C.slate700 });
    });
    o += rect(744, 300, 230, 230, 22, C.white, ` stroke="${C.slate200}" stroke-width="2"`);
    o += L.qr(`https://${COPY.url}`, { x: 764, y: 320, size: 190 });
    o += text('Scan karein', { x: 859, y: 268, size: 22, weight: 600, fill: C.slate500, anchor: 'middle' });
    o += rect(-b, CH - 16, CW + 2 * b, 16 + b, 0, C.green);
    return o;
  };
  await raster('print/business-card-front.png', pxDoc(CW, CH, 0, front(0)), 'Business card front, 3.5 x 2 in at 300 dpi (trim size).', { dpi: 300, full: true });
  await raster('print/business-card-back.png', pxDoc(CW, CH, 0, back(0)), 'Business card back, 3.5 x 2 in at 300 dpi. Replace Full Name / Designation in print() before printing.', { dpi: 300, full: true });
  pdf('print/business-card.pdf', [printDoc(CW, CH, 37.5, front(37.5), 'in'), printDoc(CW, CH, 37.5, back(37.5), 'in')], 'Business card, vector PDF, 2 pages, 3.75 x 2.25 in (1/8 in bleed on each side; trim to 3.5 x 2 in).');

  // Letterhead A4 at 300 dpi.
  {
    const W = 2480, H = 3508;
    let b = rect(0, 0, W, H, 0, C.white);
    b += lockup({ x: 200, y: 200, h: 120 });
    [COPY.url, COPY.email, COPY.phone].forEach((t, i) => (b += text(t, { x: 2280, y: 236 + i * 52, size: 36, weight: 500, fill: C.slate600, anchor: 'end' })));
    b += `<path d="M200 430H2280" stroke="${C.slate200}" stroke-width="4"/>` + rect(200, 426, 260, 8, 4, C.green) + diamond(480, 430, 10, C.amber);
    b += mark({ cx: 2080, cy: 3020, w: 760, bowl: C.green, dot: C.amber, opacity: 0.045 });
    b += `<path d="M200 3250H2280" stroke="${C.slate200}" stroke-width="3"/>`;
    b += text(`Nafaa  ·  ${COPY.what}  ·  ${COPY.url}`, { x: W / 2, y: 3330, size: 32, weight: 500, fill: C.slate500, anchor: 'middle' });
    b += rect(0, H - 60, W, 60, 0, C.green) + rect(0, H - 60, 620, 60, 0, C.greenDark);
    await raster('print/letterhead-a4.png', pxDoc(W, H, 0, b), 'Letterhead, A4 at 300 dpi (2480 x 3508). Write between y 560 and y 3150.', { dpi: 300, full: true });
    pdf('print/letterhead-a4.pdf', [printDoc(W, H, 0, b, 'mm')], 'Letterhead, vector A4 PDF (210 x 297 mm). Use as a page background in Word or Docs.');
  }

  // 80 mm thermal receipt header and footer: 576 px printable width at 203 dpi, 1-bit.
  for (const [w, label] of [[576, '80mm'], [384, '58mm']]) {
    const k = w / 576;
    let h = Math.round(210 * k);
    let b = rect(0, 0, w, h, 0, '#fff');
    b += lockup({ x: w / 2, y: 30 * k, h: 96 * k, variant: 'monoBlack', anchor: 'middle' });
    b += text(COPY.what, { x: w / 2, y: 180 * k, size: 26 * k, weight: 700, fill: '#000', anchor: 'middle' });
    await raster(`print/receipt-header-${label}.png`, doc(w, h, b), `Thermal receipt header, ${label} paper (${w} px wide at 203 dpi), pure black and white.`, { mono: true });
    const fh = Math.round(96 * k);
    let f = rect(0, 0, w, fh, 0, '#fff');
    f += `<path d="M${24 * k} ${10 * k}H${w - 24 * k}" stroke="#000" stroke-width="${2.5 * k}" stroke-dasharray="${8 * k} ${6 * k}"/>`;
    const lineW = L.measure(`${COPY.pitch}  ·  ${COPY.url}`, { size: 20 * k, weight: 700 });
    const markW = 34 * k;
    const startX = (w - (markW + 12 * k + lineW)) / 2;
    f += mark({ cx: startX + markW / 2, cy: 54 * k, w: markW, variant: 'monoBlack' });
    f += text(`${COPY.pitch}  ·  ${COPY.url}`, { x: startX + markW + 12 * k, y: 62 * k, size: 20 * k, weight: 700, fill: '#000' });
    await raster(`print/receipt-footer-${label}.png`, doc(w, fh, f), `Thermal receipt footer line (the Nafaa line), ${label} paper.`, { mono: true });
  }

  // Counter / window sticker, 100 x 100 mm (1181 px at 300 dpi); PDF adds 2 mm bleed.
  {
    const S = 1181;
    const body = (b) => {
      let o = `<g transform="translate(${-b} ${-b})">${heroGreen(S + 2 * b, S + 2 * b, { ringsX: 0.5, ringsY: 0.0, r0: 140, gap: 56, n: 9 })}</g>`;
      o += rect(40, 40, S - 80, S - 80, 90, 'none', ` stroke="${C.white}" stroke-opacity="0.45" stroke-width="5"`);
      o += mark({ cx: S / 2, cy: 250, w: 230, variant: 'reversed' });
      o += para(['Yahan Nafaa se', 'bill banta hai'], { x: S / 2, y: 530, size: 116, weight: 800, fill: C.white, anchor: 'middle', track: -0.03, lh: 1.1 }).svg;
      o += L.urdu('یہاں نفع سے بل بنتا ہے', { x: S / 2, y: 820, size: 76, fill: C.amberLight, anchor: 'middle' });
      o += rect(S / 2 - 270, 950, 540, 110, 55, C.white);
      o += text(COPY.url, { x: S / 2, y: 1023, size: 54, weight: 800, fill: C.greenDark, anchor: 'middle', track: -0.01 });
      return o;
    };
    await raster('print/counter-sticker-100mm.png', pxDoc(S, S, 0, body(0)), 'Shop window / counter sticker, 100 x 100 mm at 300 dpi.', { dpi: 300, full: true });
    pdf('print/counter-sticker-100mm.pdf', [printDoc(S, S, 23.6, body(23.6), 'mm')], 'Counter sticker, vector PDF, 104 x 104 mm (2 mm bleed; trim to 100 x 100 mm, rounded corners optional).');
  }

  // A5 flyer at 300 dpi (1748 x 2480) and a blank version.
  {
    const W = 1748, H = 2480;
    const head = () => {
      let o = rect(0, 0, W, H, 0, C.white);
      o += `<g>${heroGreen(W, 1240, { ringsX: 0.86, ringsY: 0.02, r0: 170, gap: 66, n: 9 })}</g>`;
      o += SH('sh', { blur: 70, dy: 34, op: 0.25 });
      o += lockup({ x: 140, y: 150, h: 110, variant: 'reversed' });
      return o;
    };
    const foot = () => {
      let o = rect(0, 2140, W, 340, 0, C.ink);
      o += L.qr(`https://${COPY.url}`, { x: 1418, y: 2190, size: 210, fill: C.white });
      o += text(COPY.trial, { x: 140, y: 2262, size: 64, weight: 800, fill: C.amberLight, track: -0.02 });
      o += text(`${COPY.url}   ·   WhatsApp ${COPY.phone}`, { x: 140, y: 2350, size: 44, weight: 600, fill: C.white });
      return o;
    };
    let b = head();
    b += para(COPY.tagline, { x: 140, y: 500, size: 128, weight: 800, fill: C.white, track: -0.035, lh: 1.08 }).svg;
    b += text(COPY.sub, { x: 140, y: 770, size: 52, weight: 500, fill: C.white, opacity: 0.92 });
    b += L.phone({ x: 1060, y: 860, w: 520, filter: 'sh' }).svg;
    b += L.billCard({ x: 560, y: 930, w: 450, filter: 'sh' }).svg;
    const feats = [['Tez billing', 'Barcode scan, receipt aur WhatsApp par bill.'], ['Stock ka hisaab', 'Har cheez ki ginti, kam ho to pata chal jaye.'], ['Khata', 'Udhaar aur wapsi ka saaf record.'], ['Offline bhi', 'Internet chala jaye, bill phir bhi bante rahein.']];
    feats.forEach(([t, d], i) => {
      const y = 1660 + i * 118;
      b += rect(140, y - 50, 76, 76, 20, C.green100) + diamond(178, y - 12, 15, i % 2 ? C.amber : C.green);
      b += text(t, { x: 250, y: y - 16, size: 42, weight: 800, fill: C.ink, track: -0.015 });
      b += text(d, { x: 250, y: y + 28, size: 30, weight: 500, fill: C.slate600 });
    });
    b += foot();
    await raster('print/flyer-a5.png', pxDoc(W, H, 0, b), 'A5 flyer at 300 dpi (148 x 210 mm).', { dpi: 300, full: true });
    pdf('print/flyer-a5.pdf', [printDoc(W, H, 0, b, 'mm')], 'A5 flyer, vector PDF (148 x 210 mm). Ask the printer to scale to fit with 3 mm bleed if needed.');
    await raster('print/flyer-a5-blank.png', pxDoc(W, H, 0, head() + foot()), 'A5 flyer template: header and footer only; fill the middle in Canva or Word.', { dpi: 300, full: true });
  }
}

// ---- Guides (safe-zone overlays for checking layouts) ------------------------

async function guides() {
  const over = async (src, rel, shapes, use) => {
    const meta = await sharp(path.join(OUT, src)).metadata();
    const o = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">${shapes}</svg>`;
    const file = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await sharp(path.join(OUT, src)).composite([{ input: Buffer.from(o) }]).png({ palette: true, quality: 80 }).toFile(file);
    record(rel, use);
  };
  const box = (x, y, w, h, c = '#ef4444') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="16 10"/>`;
  const shade = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" opacity="0.35"/>`;
  await over('social/facebook/cover-1640x624.png', 'guides/facebook-cover-guide.png', shade(0, 0, 265, 624) + shade(1375, 0, 265, 624) + box(265, 77, 1110, 470) + `<circle cx="250" cy="600" r="170" fill="#ef4444" opacity="0.35"/>`, 'Check: Facebook cover with the mobile crop shaded and the desktop profile picture area in red.');
  await over('social/youtube/banner-2560x1440.png', 'guides/youtube-banner-guide.png', shade(0, 0, 2560, 508) + shade(0, 932, 2560, 508) + box(507, 508, 1546, 423) + box(0, 508, 2560, 423, '#f59e0b'), 'Check: YouTube banner; red = safe area on all devices, amber = desktop band, shaded = TV only.');
  await over('whatsapp/profile-640.png', 'guides/whatsapp-profile-guide.png', `<path d="M0 0H640V640H0Z M320 0A320 320 0 1 0 320 640A320 320 0 1 0 320 0Z" fill="#000" opacity="0.45" fill-rule="evenodd"/>`, 'Check: WhatsApp profile photo with the circle crop applied.');
  await over('social/x/header-1500x500.png', 'guides/x-header-guide.png', `<circle cx="200" cy="470" r="170" fill="#ef4444" opacity="0.35"/>` + shade(0, 0, 1500, 70) + shade(0, 430, 1500, 70), 'Check: X header with the profile picture overlap and the top/bottom crop.');
}

// ---- Asset index -------------------------------------------------------------

async function writeIndex() {
  const rows = [];
  for (const m of manifest) {
    const file = path.join(OUT, m.rel);
    const bytes = fs.statSync(file).size;
    let dims = '';
    if (/\.(png|webp|jpg)$/.test(m.rel)) {
      const md = await sharp(file).metadata();
      dims = `${md.width} x ${md.height}`;
    } else if (m.rel.endsWith('.ico')) dims = 'multi-size';
    else if (m.rel.endsWith('.icns')) dims = '16 to 1024';
    else if (m.rel.endsWith('.pdf')) dims = 'vector';
    else if (m.rel.endsWith('.svg')) dims = 'vector';
    else if (m.rel.endsWith('.html')) dims = 'HTML';
    rows.push({ ...m, bytes, dims });
  }
  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(rows.map(({ rel, dims, bytes, use }) => ({ file: rel, dims, bytes, use })), null, 2) + '\n');

  const groups = [
    ['WhatsApp Business', (r) => r.rel.startsWith('whatsapp/')],
    ['Social: Facebook', (r) => r.rel.startsWith('social/facebook/')],
    ['Social: Instagram', (r) => r.rel.startsWith('social/instagram/')],
    ['Social: LinkedIn', (r) => r.rel.startsWith('social/linkedin/')],
    ['Social: X (Twitter)', (r) => r.rel.startsWith('social/x/')],
    ['Social: YouTube', (r) => r.rel.startsWith('social/youtube/')],
    ['Social: TikTok', (r) => r.rel.startsWith('social/tiktok/')],
    ['App stores and mobile', (r) => r.rel.startsWith('app-store/')],
    ['Desktop app', (r) => r.rel.startsWith('desktop/')],
    ['Web: share (OG) images', (r) => r.rel.startsWith('og/') && !r.group],
    ['Web: industry share images', (r) => r.group === 'industry'],
    ['Email', (r) => r.rel.startsWith('email/')],
    ['Print', (r) => r.rel.startsWith('print/')],
    ['Layout check overlays', (r) => r.rel.startsWith('guides/')],
  ];
  let md = `# Nafaa brand asset index\n\nEvery file in \`brand/\`, its size and where it goes. All of it uses the Noon logo from \`brand/logo/\`.\n\n`;
  md += `This file is generated by \`node brand/source/build-assets.cjs\`, together with the assets. Don't edit it by hand: change the script and run it again.\n\n`;
  md += `- Logo files (SVG, favicons, PWA and app icons): see [\`logo/README.md\`](logo/README.md).\n- Rules for using them: see [\`BRAND-GUIDELINES.md\`](BRAND-GUIDELINES.md).\n- Everything in context: open [\`preview.html\`](preview.html) in a browser.\n\n`;
  md += `## Logo kit (\`brand/logo/\`)\n\n| File | Size | Use |\n| --- | --- | --- |\n`;
  md += `| \`logo/svg/*.svg\` | vector | Logo, mark, wordmark, app icon tile, dark, reversed and mono versions. |\n`;
  md += `| \`logo/png/favicon-16/32/48.png\`, \`favicon.ico\` | 16-48 | Website favicon set. |\n| \`logo/png/apple-touch-icon.png\` | 180 x 180 | iOS home screen icon for the website. |\n| \`logo/png/icon-192.png\`, \`icon-512.png\`, \`icon-maskable-512.png\` | 192, 512 | PWA manifest icons. |\n| \`logo/png/android-adaptive-foreground.png\`, \`-background.png\` | 432 x 432 | Android adaptive icon layers (mobile app). |\n\n`;
  for (const [title, test] of groups) {
    const list = rows.filter(test);
    if (!list.length) continue;
    md += `## ${title}\n\n| File | Pixels | File size | Where to use it |\n| --- | --- | --- | --- |\n`;
    for (const r of list) md += `| \`${r.rel}\` | ${r.dims} | ${kb(r.bytes)} | ${r.use} |\n`;
    md += '\n';
  }
  md += `## Source\n\n| File | Use |\n| --- | --- |\n| \`source/build-assets.cjs\` | Builds every file above. Copy (taglines, phone, links) is in \`COPY\` at the top; industry names and colours are read from \`apps/web/src/industries/*/*Pack.tsx\`. |\n| \`source/lib.cjs\` | Drawing helpers: outlined text (Inter, Noto Nastaliq Urdu), logo placement, patterns, UI cards. |\n| \`source/manifest.json\` | Machine-readable list of the generated files. |\n\nRebuild from the repo root:\n\n\`\`\`sh\nnode brand/logo/source/build.cjs     # logo kit (only when the logo changes)\nnode brand/source/build-assets.cjs   # everything else\n\`\`\`\n`;
  fs.writeFileSync(path.join(OUT, 'ASSET-INDEX.md'), md);
}

// ---- Main --------------------------------------------------------------------

(async () => {
  const industries = readIndustries();
  if (industries.length < 10) throw new Error(`Only ${industries.length} industry packs found`);
  // Clear generated folders so removed assets do not linger.
  for (const d of ['whatsapp', 'social', 'app-store', 'desktop', 'og', 'email', 'print', 'guides']) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
  await whatsapp();
  await social();
  await stores();
  await desktop();
  await web(industries);
  await print();
  await guides();
  await writeIndex();
  require('./preview.cjs')({ OUT, manifest, industries, COPY, C, kb });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`${manifest.length} files, ${industries.length} industries`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
