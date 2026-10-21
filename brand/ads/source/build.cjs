#!/usr/bin/env node
// Builds the Nafaa Meta ad set: every creative in brand/ads/<industry>/,
// brand/ads/manifest.json (read by preview.html) and the carousel slices.
//
//   node brand/ads/source/build.cjs                      everything
//   node brand/ads/source/build.cjs --only=kiryana,salon  some industries
//   node brand/ads/source/build.cjs --concept=trio --format=1x1 --no-carousel
//
// Rendering uses headless Chrome through Playwright (playwright or
// playwright-core, resolved from the repo or from NAFAA_PLAYWRIGHT=<package dir>)
// with the installed Google Chrome. Screens come from brand/ads/source/screens.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.resolve(__dirname, '..');
const SCREENS = path.join(__dirname, 'screens');
const C = require('./concepts.cjs');
const { FORMATS } = require('./templates.cjs');
const { INDUSTRIES } = require('./data.cjs');

const req = (name) => require(require.resolve(name, { paths: [ROOT, __dirname, path.join(ROOT, 'node_modules/.pnpm/node_modules')] }));
const sharp = (() => {
  try {
    return req('sharp');
  } catch {
    const pnpm = path.join(ROOT, 'node_modules/.pnpm');
    const dir = fs.readdirSync(pnpm).filter((d) => d.startsWith('sharp@')).sort().pop();
    return require(path.join(pnpm, dir, 'node_modules/sharp'));
  }
})();

function loadChromium() {
  const tries = [];
  if (process.env.NAFAA_PLAYWRIGHT) tries.push(path.resolve(process.env.NAFAA_PLAYWRIGHT));
  tries.push('playwright', 'playwright-core');
  for (const t of tries) {
    try {
      const mod = req(t);
      if (mod.chromium) return mod.chromium;
    } catch {
      // next
    }
  }
  throw new Error('Playwright not found. Install playwright-core (npm i -g playwright-core) or set NAFAA_PLAYWRIGHT=/path/to/node_modules/playwright-core. Google Chrome must be installed.');
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }),
);
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()) : null);
const onlyInd = list(args.only);
const onlyConcept = list(args.concept);
const onlyFormat = list(args.format);
const onlyLang = list(args.lang);

// ---- Screens -------------------------------------------------------------------

const imgCache = new Map();
async function prepareImages(ind) {
  const names = new Set();
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if ((k === 'img' || k === 'phone' || k === 'laptop') && typeof v === 'string' && !v.includes(' ')) names.add(v);
      else walk(v);
    }
  };
  walk(ind);
  for (const n of names) {
    const ref = n.includes('/') ? n : `${ind.screens}/${n}`;
    if (imgCache.has(ref)) continue;
    const file = path.join(SCREENS, `${ref}.png`);
    if (!fs.existsSync(file)) throw new Error(`missing screen ${path.relative(ROOT, file)}`);
    const m = await sharp(file).metadata();
    imgCache.set(ref, { url: pathToFileURL(file).href, w: m.width, h: m.height, file });
  }
  return (n) => {
    const ref = n.includes('/') ? n : `${ind.screens}/${n}`;
    const v = imgCache.get(ref);
    if (!v) throw new Error(`screen not prepared: ${ref}`);
    return v;
  };
}

// ---- Render ----------------------------------------------------------------------

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nafaa-ads-'));
let browser;
let ctx;

async function render(html, w, h, outFile) {
  const htmlFile = path.join(TMP, `${path.basename(outFile, '.png')}.html`);
  fs.writeFileSync(htmlFile, html);
  const page = await ctx.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; }))));
  });
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  return buf;
}

async function savePng(buf, outFile, w, h) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  // Rendered at 2x, downsampled with Lanczos for crisp type and screens.
  await sharp(buf).resize(w, h, { kernel: 'lanczos3' }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outFile);
  return fs.statSync(outFile).size;
}

const CONCEPTS = [
  { key: 'problem', letter: 'a', fn: C.problem, label: 'Problem → solution' },
  { key: 'dashboard', letter: 'b', fn: C.dashboard, label: 'Dashboard showcase' },
  { key: 'trio', letter: 'c', fn: C.trio, label: 'Feature trio' },
];

async function pool(jobs, n) {
  let i = 0;
  const worker = async () => {
    while (i < jobs.length) await jobs[i++]();
  };
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, worker));
}

async function main() {
  const chromium = loadChromium();
  browser = await chromium.launch({ channel: process.env.NAFAA_CHROME_CHANNEL || 'chrome' });
  ctx = await browser.newContext({ deviceScaleFactor: 2 });
  const manifestFile = path.join(OUT, 'manifest.json');
  const manifest = fs.existsSync(manifestFile) && (onlyInd || onlyConcept || onlyFormat || onlyLang || args['no-carousel'])
    ? JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
    : { built: null, industries: {} };
  const t0 = Date.now();
  let count = 0;

  for (const ind of INDUSTRIES) {
    if (onlyInd && !onlyInd.includes(ind.key)) continue;
    const img = await prepareImages(ind);
    const entry = manifest.industries[ind.key] ?? { name: ind.name, folder: ind.key, creatives: [], carousel: [] };
    entry.name = ind.name;
    const langs = ind.ur ? ['en', 'ur'] : ['en'];
    const jobs = [];
    for (const c of CONCEPTS) {
      if (onlyConcept && !onlyConcept.includes(c.key)) continue;
      for (const lang of langs) {
        if (onlyLang && !onlyLang.includes(lang)) continue;
        for (const fk of Object.keys(FORMATS)) {
          if (onlyFormat && !onlyFormat.includes(fk)) continue;
          const f = FORMATS[fk];
          const name = `${ind.key}-${c.letter}-${c.key}${lang === 'ur' ? '-urdu' : ''}-${fk === 'link' ? '1200x628' : `${f.w}x${f.h}`}.png`;
          const outFile = path.join(OUT, ind.key, name);
          jobs.push(async () => {
            const html = c.fn(ind, fk, img, { ur: lang === 'ur' });
            const bytes = await savePng(await render(html, f.w, f.h, outFile), outFile, f.w, f.h);
            entry.creatives = entry.creatives.filter((x) => x.file !== `${ind.key}/${name}`);
            entry.creatives.push({ file: `${ind.key}/${name}`, concept: c.key, letter: c.letter, label: c.label, lang, format: fk, formatLabel: f.label, w: f.w, h: f.h, bytes });
            count += 1;
            console.log(`  ${name}  ${(bytes / 1024).toFixed(0)} KB`);
          });
        }
      }
    }
    if (ind.cover && (!onlyConcept || onlyConcept.includes('cover')) && (!onlyLang || onlyLang.includes('en'))) {
      jobs.push(async () => {
        const name = `${ind.key}-reels-cover-1080x1920.png`;
        const outFile = path.join(OUT, ind.key, name);
        const bytes = await savePng(await render(C.cover(ind, img), 1080, 1920, outFile), outFile, 1080, 1920);
        entry.cover = { file: `${ind.key}/${name}`, w: 1080, h: 1920, bytes };
        count += 1;
        console.log(`  ${name}  ${(bytes / 1024).toFixed(0)} KB`);
      });
    }
    await pool(jobs, Number(process.env.NAFAA_ADS_JOBS || 4));
    if (!args['no-carousel'] && !onlyConcept && !onlyFormat && ind.carousel) {
      const html = C.carousel(ind, img);
      const pano = await render(html, 5400, 1080, path.join(TMP, `${ind.key}-carousel.png`));
      const full = await sharp(pano).resize(5400, 1080, { kernel: 'lanczos3' }).png().toBuffer();
      entry.carousel = [];
      for (let i = 0; i < 5; i += 1) {
        const name = `${ind.key}-carousel-${i + 1}-1080x1080.png`;
        const outFile = path.join(OUT, ind.key, 'carousel', name);
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        await sharp(full).extract({ left: i * 1080, top: 0, width: 1080, height: 1080 }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outFile);
        const bytes = fs.statSync(outFile).size;
        entry.carousel.push({ file: `${ind.key}/carousel/${name}`, card: i + 1, w: 1080, h: 1080, bytes });
        count += 1;
        console.log(`  carousel/${name}  ${(bytes / 1024).toFixed(0)} KB`);
      }
    }
    entry.creatives.sort((a, b) => a.file.localeCompare(b.file));
    manifest.industries[ind.key] = entry;
  }
  manifest.built = new Date().toISOString();
  // Keep the industry order of data.cjs.
  const ordered = {};
  for (const ind of INDUSTRIES) if (manifest.industries[ind.key]) ordered[ind.key] = manifest.industries[ind.key];
  manifest.industries = ordered;
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 1)}\n`);
  const pv = require('./preview.cjs').build();
  console.log(`preview: ${path.relative(process.cwd(), pv.file)}`);
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n${count} images in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${path.relative(process.cwd(), OUT)}`);
}

main().catch(async (e) => {
  console.error(e.stack || e.message);
  if (browser) await browser.close();
  process.exit(1);
});
