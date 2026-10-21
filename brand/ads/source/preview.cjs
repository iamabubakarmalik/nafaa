// Writes brand/ads/preview.html from brand/ads/manifest.json and copy.cjs.
// The page has no external dependencies; images load from the industry folders
// next to it, so open it straight from disk.
//
//   node brand/ads/source/preview.cjs     (build.cjs also runs it at the end)

const fs = require('fs');
const path = require('path');
const { COPY, COMMON } = require('./copy.cjs');
const { INDUSTRIES } = require('./data.cjs');

const OUT = path.resolve(__dirname, '..');
const ROOT = path.resolve(__dirname, '../../..');

function build() {
  const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
  const icon = fs.readFileSync(path.join(ROOT, 'brand/logo/svg/nafaa-icon.svg'), 'utf8').replace(/<!--.*?-->/gs, '').trim();
  const logo = fs.readFileSync(path.join(ROOT, 'brand/logo/svg/nafaa-logo.svg'), 'utf8').replace(/<!--.*?-->/gs, '').replace(/ width="[\d.]+" height="[\d.]+"/, ' height="30"').trim();
  const logoDark = fs.readFileSync(path.join(ROOT, 'brand/logo/svg/nafaa-logo-dark.svg'), 'utf8').replace(/<!--.*?-->/gs, '').replace(/ width="[\d.]+" height="[\d.]+"/, ' height="30"').trim();
  const data = INDUSTRIES.filter((i) => manifest.industries[i.key]).map((i) => ({
    key: i.key,
    name: i.name,
    pill: i.pill,
    concepts: { problem: i.a.headline, dashboard: i.b.headline, trio: i.c.headline },
    ...manifest.industries[i.key],
    copy: COPY[i.key] ?? null,
  }));
  for (const d of data) for (const h of d.copy?.headlines ?? []) if (h.length > 40) console.warn(`headline over 40 characters (${d.key}): ${h}`);
  const total = data.reduce((n, d) => n + d.creatives.length + d.carousel.length + (d.cover ? 1 : 0), 0);
  const html = TEMPLATE.replace('/*DATA*/null', JSON.stringify({ industries: data, total, built: manifest.built, cta: COMMON.cta }))
    .replace('<!--ICON-->', icon)
    .replace('<!--LOGO-->', logo)
    .replace('<!--LOGODARK-->', logoDark);
  fs.writeFileSync(path.join(OUT, 'preview.html'), html);
  return { file: path.join(OUT, 'preview.html'), total };
}

const TEMPLATE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nafaa Meta Ads</title>
<style>
:root{--bg:#f6f8f7;--panel:#ffffff;--ink:#0b1f14;--sub:#4b5d53;--muted:#7a8a81;--line:#e3e9e5;--brand:#16a34a;--brand-d:#15803d;--mint:#ecfdf3;--amber:#f59e0b;--fb:#f0f2f5;--shadow:0 1px 2px rgba(5,46,22,.05),0 8px 30px -12px rgba(5,46,22,.18)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#0b1310;--panel:#121c17;--ink:#eef5f0;--sub:#a9bbb1;--muted:#7f9187;--line:#22302a;--mint:#13261b;--fb:#1b2420;--shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px -12px rgba(0,0,0,.6)}}
:root[data-theme="dark"]{--bg:#0b1310;--panel:#121c17;--ink:#eef5f0;--sub:#a9bbb1;--muted:#7f9187;--line:#22302a;--mint:#13261b;--fb:#1b2420;--shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px -12px rgba(0,0,0,.6)}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:120px}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.ur{font-family:"Noto Nastaliq Urdu","Jameel Noori Nastaleeq",serif;direction:rtl;line-height:2.1;font-size:15px}
a{color:var(--brand-d)}
header.top{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.wrap{max-width:1360px;margin:0 auto;padding:0 24px}
.bar{display:flex;align-items:center;gap:16px;height:64px}
.bar .logo-l{display:block}.bar .logo-d{display:none}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .bar .logo-l{display:none}:root:not([data-theme="light"]) .bar .logo-d{display:block}}
:root[data-theme="dark"] .bar .logo-l{display:none}:root[data-theme="dark"] .bar .logo-d{display:block}
.bar h1{font-size:16px;margin:0;font-weight:650;letter-spacing:-.01em}
.bar .meta{color:var(--muted);font-size:13px}
.bar .sp{flex:1}
.btn{appearance:none;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:999px;height:34px;padding:0 14px;font:600 13px/1 inherit;cursor:pointer}
.btn[aria-pressed="true"]{background:var(--brand);border-color:var(--brand);color:#fff}
nav.chips{display:flex;gap:8px;overflow-x:auto;padding:0 0 12px;scrollbar-width:none}
nav.chips a{flex:none;text-decoration:none;color:var(--sub);border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:6px 12px;font-size:13px;font-weight:600}
nav.chips a:hover{color:var(--brand-d);border-color:var(--brand)}
.hero{padding:40px 0 8px}
.hero h2{font-size:clamp(28px,4vw,40px);letter-spacing:-.03em;margin:0 0 8px;line-height:1.1}
.hero p{color:var(--sub);max-width:760px;margin:0}
.legend{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 0}
.legend span{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:6px 10px;font-size:13px;color:var(--sub)}
section.ind{padding:44px 0 12px;border-bottom:1px solid var(--line)}
.ind-h{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.ind-h h3{font-size:26px;letter-spacing:-.02em;margin:0}
.ind-h .count{color:var(--muted);font-size:13px}
.ind-h code{font-size:12px;background:var(--mint);color:var(--brand-d);padding:2px 8px;border-radius:6px}
.layout{display:grid;grid-template-columns:340px minmax(0,1fr);gap:28px;align-items:start}
@media (max-width:980px){.layout{grid-template-columns:1fr}}
.copy{position:sticky;top:132px;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:var(--shadow)}
@media (max-width:980px){.copy{position:static}}
.copy h4{margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.tabs{display:flex;gap:6px;margin-bottom:10px}
.tabs button{border:1px solid var(--line);background:transparent;color:var(--sub);border-radius:8px;padding:4px 10px;font:600 12px/1.4 inherit;cursor:pointer}
.tabs button[aria-selected="true"]{background:var(--mint);color:var(--brand-d);border-color:transparent}
.ptext{font-size:14px;color:var(--ink);white-space:pre-wrap;margin:0 0 16px}
.list{list-style:none;padding:0;margin:0 0 16px;display:grid;gap:6px}
.list li{display:flex;justify-content:space-between;gap:10px;font-size:14px;border:1px solid var(--line);border-radius:10px;padding:7px 10px}
.list li small{color:var(--muted);font-variant-numeric:tabular-nums;flex:none}
.kv{font-size:13px;color:var(--sub);margin:0 0 6px}
.kv b{color:var(--ink);font-weight:600}
.concept{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:20px;margin-bottom:22px;box-shadow:var(--shadow)}
.concept-h{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap}
.concept-h .tag{background:var(--brand);color:#fff;font-weight:800;border-radius:8px;width:28px;height:28px;display:grid;place-items:center;font-size:13px;text-transform:uppercase}
.concept-h b{font-size:16px}
.concept-h span{color:var(--muted);font-size:13px}
.mocks{display:flex;gap:22px;flex-wrap:wrap;align-items:flex-start}
.fb{width:340px;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden;flex:none}
.fb .ph{display:flex;align-items:center;gap:10px;padding:10px 12px}
.fb .av{width:36px;height:36px;border-radius:50%;overflow:hidden;flex:none}
.fb .av svg{width:100%;height:100%;display:block}
.fb .nm{font-weight:650;font-size:14px;line-height:1.2}
.fb .sp2{font-size:12px;color:var(--muted)}
.fb .tx{padding:0 12px 10px;font-size:14px}
.fb .tx .more{color:var(--muted)}
.fb img{display:block;width:100%;height:auto;cursor:zoom-in;background:#e5e7eb}
.fb .ft{display:flex;align-items:center;gap:10px;background:var(--fb);padding:10px 12px}
.fb .ft .t{flex:1;min-width:0}
.fb .ft .d{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.fb .ft .hl{font-weight:650;font-size:14px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fb .ft .cta{flex:none;background:var(--line);color:var(--ink);border-radius:6px;padding:7px 10px;font-weight:650;font-size:13px}
.story{position:relative;width:236px;aspect-ratio:9/16;border-radius:20px;overflow:hidden;flex:none;background:#000;box-shadow:var(--shadow)}
.story img{width:100%;height:100%;display:block;cursor:zoom-in}
.story::before{content:"";position:absolute;left:0;right:0;top:0;height:64px;background:linear-gradient(180deg,rgba(0,0,0,.45),rgba(0,0,0,0));pointer-events:none}
.story .sb{position:absolute;left:10px;right:10px;top:8px;height:2px;border-radius:2px;background:rgba(255,255,255,.45)}
.story .sb::after{content:"";position:absolute;left:0;top:0;bottom:0;width:38%;background:#fff;border-radius:2px}
.story .sh{position:absolute;left:10px;top:18px;display:flex;align-items:center;gap:6px;color:#fff;font-size:11px;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,.4)}
.story .sh .av{width:22px;height:22px;border-radius:50%;overflow:hidden}
.story .sh .av svg{width:100%;height:100%;display:block}
.story .sc{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:#fff;color:#111;border-radius:999px;padding:6px 14px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.story .safe{display:none;position:absolute;left:0;right:0;background:rgba(239,68,68,.22);border:1px dashed rgba(239,68,68,.8);pointer-events:none}
body.show-safe .story .safe{display:block}
.thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;flex:1 1 100%;min-width:260px}
.thumb{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:8px;margin:0}
.thumb img{width:100%;height:auto;display:block;border-radius:6px;cursor:zoom-in}
.thumb figcaption{font-size:12px;color:var(--sub);margin-top:6px;display:flex;justify-content:space-between;gap:6px}
.thumb figcaption small{color:var(--muted)}
.strip{display:flex;gap:0;overflow-x:auto;border-radius:16px;border:1px solid var(--line);scroll-snap-type:x mandatory}
.strip img{width:300px;height:300px;flex:none;scroll-snap-align:start;cursor:zoom-in}
.extras{display:grid;grid-template-columns:minmax(0,1fr) 200px;gap:22px;align-items:start}
@media (max-width:700px){.extras{grid-template-columns:1fr}}
.cover img{width:100%;border-radius:14px;display:block;cursor:zoom-in}
.lb{position:fixed;inset:0;background:rgba(3,10,6,.88);display:none;align-items:center;justify-content:center;z-index:50;padding:24px;cursor:zoom-out}
.lb.on{display:flex}
.lb img{max-width:100%;max-height:100%;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.lb .cap{position:absolute;left:0;right:0;bottom:12px;text-align:center;color:#d1fae5;font-size:13px}
footer{padding:40px 0 60px;color:var(--muted);font-size:13px}
@media (max-width:600px){.wrap{padding:0 16px}.fb{width:100%}.story{width:100%;max-width:300px}.bar .meta{display:none}}
</style>
</head>
<body>
<header class="top"><div class="wrap">
  <div class="bar">
    <span class="logo-l"><!--LOGO--></span><span class="logo-d"><!--LOGODARK--></span>
    <h1>Meta ads</h1><span class="meta" id="meta"></span><span class="sp"></span>
    <button class="btn" id="safe" aria-pressed="false">Safe zones</button>
    <button class="btn" id="theme" aria-label="Switch theme">Theme</button>
  </div>
  <nav class="chips" id="nav"></nav>
</div></header>
<main class="wrap">
  <div class="hero">
    <h2>Every creative, by industry</h2>
    <p>Real Nafaa screens from local demo shops, in phone-first layouts. Each concept is shown as a Facebook feed post (4:5) and a Story (9:16), followed by its 1:1, 1.91:1 and Urdu files. Click any image to see it full size. "Safe zones" marks the Story areas Meta covers with its own labels and buttons.</p>
    <div class="legend"><span>a: Problem to solution</span><span>b: Dashboard showcase</span><span>c: Feature trio</span><span>4:5 feed (main) · 9:16 Stories/Reels · 1:1 · 1.91:1 link</span></div>
  </div>
  <div id="root"></div>
  <footer>Built from <code>brand/ads/source</code>. Rebuild with <code>node brand/ads/source/build.cjs</code>. Copy and targeting: <code>ADS-GUIDE.md</code>.</footer>
</main>
<div class="lb" id="lb"><img alt=""><div class="cap"></div></div>
<script>
const D = /*DATA*/null;
const ICON = document.createElement('div'); ICON.innerHTML = ${'`'}<!--ICON-->${'`'};
const iconHTML = ICON.innerHTML;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const kb = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';
const fmtName = { '4x5': '4:5', '9x16': '9:16', '1x1': '1:1', link: '1.91:1' };
document.getElementById('meta').textContent = D.total + ' images · built ' + new Date(D.built).toLocaleString();
const nav = document.getElementById('nav');
const root = document.getElementById('root');
const concepts = [['problem', 'a', 'Problem to solution'], ['dashboard', 'b', 'Dashboard showcase'], ['trio', 'c', 'Feature trio']];
for (const ind of D.industries) {
  nav.insertAdjacentHTML('beforeend', '<a href="#' + ind.key + '">' + esc(ind.name) + '</a>');
  const c = ind.copy || {};
  const n = ind.creatives.length + ind.carousel.length + (ind.cover ? 1 : 0);
  let h = '<section class="ind" id="' + ind.key + '"><div class="ind-h"><h3>' + esc(ind.name) + '</h3><span class="count">' + n + ' images</span><code>brand/ads/' + ind.key + '/</code></div><div class="layout">';
  h += '<aside class="copy"><h4>Primary text</h4><div class="tabs" role="tablist">' +
    ['ru', 'en', 'ur'].map((l, i) => '<button role="tab" aria-selected="' + (i === 0) + '" data-l="' + l + '">' + ({ ru: 'Roman Urdu', en: 'English', ur: 'Urdu' })[l] + '</button>').join('') +
    '</div><p class="ptext" data-ru="' + esc(c.ru || '') + '" data-en="' + esc(c.en || '') + '" data-ur="' + esc(c.ur || '') + '">' + esc(c.ru || '') + '</p>';
  h += '<h4>Headlines</h4><ul class="list">' + (c.headlines || []).map((x) => '<li><span' + (/[؀-ۿ]/.test(x) ? ' class="ur"' : '') + '>' + esc(x) + '</span><small>' + x.length + '/40</small></li>').join('') + '</ul>';
  h += '<h4>Descriptions</h4><ul class="list">' + (c.descriptions || []).map((x) => '<li><span>' + esc(x) + '</span><small>' + x.length + '</small></li>').join('') + '</ul>';
  h += '<h4>Setup</h4><p class="kv"><b>Button:</b> ' + esc(D.cta) + '</p><p class="kv"><b>Age:</b> ' + esc(c.age || '') + '</p><p class="kv"><b>Interests:</b> ' + esc(c.interests || '') + '</p></aside><div>';
  for (const [key, letter, label] of concepts) {
    const items = ind.creatives.filter((x) => x.concept === key);
    if (!items.length) continue;
    const feed = items.find((x) => x.format === '4x5' && x.lang === 'en');
    const story = items.find((x) => x.format === '9x16' && x.lang === 'en');
    const head = (c.headlines || [''])[0];
    h += '<div class="concept"><div class="concept-h"><span class="tag">' + letter + '</span><b>' + label + '</b><span>' + items.length + ' files</span></div><div class="mocks">';
    if (feed) {
      const t = c.ru || '';
      h += '<div class="fb"><div class="ph"><div class="av">' + iconHTML + '</div><div><div class="nm">Nafaa</div><div class="sp2">Sponsored</div></div></div><div class="tx">' + esc(t.slice(0, 125)) + (t.length > 125 ? '<span class="more">... See more</span>' : '') + '</div><img loading="lazy" src="' + feed.file + '" alt="' + esc(label) + ' 4:5" data-cap="' + feed.file + '"><div class="ft"><div class="t"><div class="d">WhatsApp</div><div class="hl">' + esc(head) + '</div></div><div class="cta">Send message</div></div></div>';
    }
    if (story) {
      h += '<div class="story"><img loading="lazy" src="' + story.file + '" alt="' + esc(label) + ' 9:16" data-cap="' + story.file + '"><div class="sb"></div><div class="sh"><div class="av">' + iconHTML + '</div>Nafaa · Sponsored</div><div class="sc">Send WhatsApp message</div><div class="safe" style="top:0;height:14%"></div><div class="safe" style="bottom:0;height:20%"></div></div>';
    }
    h += '<div class="thumbs">' + items.filter((x) => x !== feed && x !== story).map((x) => '<figure class="thumb"><img loading="lazy" src="' + x.file + '" alt="" data-cap="' + x.file + '"><figcaption><span>' + fmtName[x.format] + (x.lang === 'ur' ? ' · Urdu' : '') + '</span><small>' + x.w + '×' + x.h + ' · ' + kb(x.bytes) + '</small></figcaption></figure>').join('') + '</div>';
    h += '</div></div>';
  }
  if (ind.carousel.length || ind.cover) {
    h += '<div class="concept"><div class="concept-h"><span class="tag">+</span><b>Carousel and Reels cover</b><span>swipe the strip</span></div><div class="extras"><div class="strip">' + ind.carousel.map((x) => '<img loading="lazy" src="' + x.file + '" alt="Card ' + x.card + '" data-cap="' + x.file + '">').join('') + '</div>' + (ind.cover ? '<div class="cover"><img loading="lazy" src="' + ind.cover.file + '" alt="Reels cover" data-cap="' + ind.cover.file + '"></div>' : '') + '</div></div>';
  }
  h += '</div></div></section>';
  root.insertAdjacentHTML('beforeend', h);
}
root.addEventListener('click', (e) => {
  const tab = e.target.closest('.tabs button');
  if (tab) {
    const box = tab.closest('.copy');
    box.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', b === tab));
    const p = box.querySelector('.ptext');
    p.textContent = p.dataset[tab.dataset.l];
    p.classList.toggle('ur', tab.dataset.l === 'ur');
    return;
  }
  const img = e.target.closest('img[data-cap]');
  if (img) {
    const lb = document.getElementById('lb');
    lb.querySelector('img').src = img.src;
    lb.querySelector('.cap').textContent = img.dataset.cap;
    lb.classList.add('on');
  }
});
document.getElementById('lb').addEventListener('click', () => document.getElementById('lb').classList.remove('on'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.getElementById('lb').classList.remove('on'); });
const safe = document.getElementById('safe');
safe.addEventListener('click', () => { const on = safe.getAttribute('aria-pressed') !== 'true'; safe.setAttribute('aria-pressed', on); document.body.classList.toggle('show-safe', on); });
document.getElementById('theme').addEventListener('click', () => {
  const r = document.documentElement;
  const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  r.dataset.theme = dark ? 'light' : 'dark';
});
</script>
</body>
</html>`;

if (require.main === module) {
  const r = build();
  console.log(`preview: ${path.relative(process.cwd(), r.file)} (${r.total} images)`);
}

module.exports = { build };
