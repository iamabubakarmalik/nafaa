// Builds the self-contained preview page (all SVGs embedded as data URIs).
const fs = require('fs');
const path = require('path');
const OUT = '/Users/abubakarmalik/Projects/nafaa/brand/logo-concepts';
const BRAND = '/Users/abubakarmalik/Projects/nafaa/brand';
const all = JSON.parse(fs.readFileSync(path.join(__dirname, 'concepts.json'), 'utf8'));
const round2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'concepts2.json'), 'utf8'));
const BASE = {};
all.forEach((c) => { BASE[c.id] = OUT; });
round2.forEach((c) => { BASE[c.id] = path.join(OUT, 'round-2'); });
// New directions first; the refined current mark comes last as a baseline.
const concepts = [...all.filter((c) => !c.baseline), ...all.filter((c) => c.baseline)];

const uri = (file) => 'data:image/svg+xml;base64,' + fs.readFileSync(file).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Isolate Urdu script runs so they do not reorder the surrounding English.
const bidi = (s) => s.replace(/[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)*/g, (m) => `<bdi lang="ur">${m}</bdi>`);
const src = (id, f) => uri(path.join(BASE[id], id, f));

const ORIGINAL_ICON = uri(path.join(BRAND, 'svg1/nafaa-icon.svg'));
const ORIGINAL_FULL = uri(path.join(BRAND, 'svg/nafaa-logo-full.svg'));

const TOP = ['A1-noon-bold', 'B3-noon-arrow'];

function section(c, i) {
  const icon = src(c.id, 'icon.svg');
  const hz = src(c.id, 'logo-horizontal.svg');
  const dk = src(c.id, 'logo-dark.svg');
  const mono = src(c.id, 'mono.svg');
  const sizes = [16, 24, 32, 48].map((s) => `<figure class="sz"><img src="${icon}" width="${s}" height="${s}" alt=""><figcaption>${s}</figcaption></figure>`).join('');
  const pick = c.baseline ? '<span class="badge base">Baseline only</span>' : TOP.includes(c.id) ? `<span class="badge">Top ${TOP.indexOf(c.id) + 1} pick</span>` : '';
  const filler = ['#fde68a', '#bfdbfe', '#fecaca', '#ddd6fe', '#a7f3d0', '#fbcfe8', '#e2e8f0'];
  const apps = filler.map((col, k) => `<div class="app"><i style="background:${col}"></i><span>${['Camera', 'Maps', 'Bank', 'Notes', 'Pay', 'Photos', 'Settings'][k]}</span></div>`);
  apps.splice(5, 0, `<div class="app"><img src="${icon}" alt="Nafaa app icon"><span>Nafaa</span></div>`);
  return `
<section class="concept" id="${c.id}">
  <header class="c-head">
    <div class="c-num">${c.id.slice(0, 2)}</div>
    <div>
      <h2>${bidi(esc(c.name))} ${pick}</h2>
      <p class="idea">${bidi(esc(c.idea))}</p>
    </div>
  </header>
  <div class="c-body">
    <div class="hero-row">
      <div class="panel big-icon"><img src="${icon}" alt="${esc(c.name)} icon"></div>
      <div class="lockups">
        <div class="panel light"><img class="hz" src="${hz}" alt="${esc(c.name)} horizontal logo"></div>
        <div class="panel dark"><img class="hz" src="${dk}" alt="${esc(c.name)} logo on dark"></div>
        <div class="panel light mono"><img class="hz" src="${mono}" alt="${esc(c.name)} one-colour logo"><span class="tag">One colour</span></div>
      </div>
    </div>
    <div class="why">
      <p>${bidi(esc(c.rationale))}</p>
      <p class="ur">${bidi(esc(c.urdu))}</p>
    </div>
    <div class="label">Small sizes (actual pixels)</div>
    <div class="sizes">
      <div class="panel light row">${sizes}<span class="sep"></span><img src="${hz}" height="20" alt=""><img src="${hz}" height="28" alt=""></div>
      <div class="panel dark row">${sizes}<span class="sep"></span><img src="${dk}" height="20" alt=""><img src="${dk}" height="28" alt=""></div>
    </div>
    <div class="label">In use, across every kind of business</div>
    <div class="mocks">
      <div class="mock phone-wrap">
        <div class="phone"><div class="notch"></div><div class="clock">9:41</div><div class="grid">${apps.join('')}</div></div>
        <div class="cap">Mobile app icon</div>
      </div>
      <div class="mock">
        <div class="browser">
          <div class="tabs">
            <div class="tab active"><img src="${icon}" width="16" height="16" alt=""><span>Overview · Nafaa</span><b>×</b></div>
            <div class="tab"><i></i><span>Inbox</span><b>×</b></div>
          </div>
          <div class="bar"><span class="url">app.nafaa.pk/overview</span></div>
          <div class="dash">
            <div class="d-top"><img src="${hz}" height="22" alt=""><span class="d-search">Search orders, items, customers</span><span class="d-org">Indus Foods Ltd</span><i class="d-av"></i></div>
            <div class="d-main">
              <ul class="d-side"><li class="on">Overview</li><li>Sales</li><li>Purchases</li><li>Inventory</li><li>Production</li><li>Accounts</li><li>Reports</li></ul>
              <div class="d-cards">
                <div class="kpi"><span>Revenue</span><b>Rs 48.2M</b></div>
                <div class="kpi"><span>Gross profit</span><b>Rs 11.6M</b></div>
                <div class="kpi"><span>Open orders</span><b>312</b></div>
                <div class="d-panel"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="cap">Favicon and SaaS dashboard header</div>
      </div>
      <div class="mock">
        <div class="social">
          <div class="s-cover"></div>
          <img class="s-av" src="${icon}" alt="">
          <div class="s-name">Nafaa <span class="s-tick">✓</span></div>
          <div class="s-handle">@nafaa · Business software</div>
          <div class="s-bio">One system for the whole business. Sales, stock, production and accounts.</div>
          <span class="s-btn">Follow</span>
        </div>
        <div class="cap">Social avatar</div>
      </div>
    </div>
    <div class="mocks mocks-2">
      <div class="mock">
        <div class="checkout">
          <div class="co-h">Checkout</div>
          <div class="co-ln"><span>Linen shirt, sand · M</span><span>Rs 6,450</span></div>
          <div class="co-ln"><span>Leather belt</span><span>Rs 5,200</span></div>
          <div class="co-ln"><span>Delivery</span><span>Rs 800</span></div>
          <div class="co-ln co-tot"><span>Total</span><span>Rs 12,450</span></div>
          <div class="co-pay">Pay Rs 12,450</div>
          <div class="co-badge">Secured by <img src="${icon}" width="16" height="16" alt=""><b>Nafaa</b></div>
        </div>
        <div class="cap">E-commerce checkout badge</div>
      </div>
      <div class="mock">
        <div class="invoice">
          <div class="iv-top"><img src="${hz}" height="26" alt=""><div class="iv-title"><b>TAX INVOICE</b><span>INV-2026-0418 · 20 Oct 2026</span></div></div>
          <div class="iv-to"><span>Bill to</span><b>Indus Textile Mills (Pvt) Ltd</b><span>Plot 14, Industrial Estate, Faisalabad</span></div>
          <table>
            <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
            <tr><td>Cotton yarn 30s, combed</td><td>2,000 kg</td><td>610</td><td>1,220,000</td></tr>
            <tr><td>Reactive dyeing, batch 7</td><td>1</td><td>85,000</td><td>85,000</td></tr>
            <tr><td>Freight, Karachi port</td><td>1</td><td>42,500</td><td>42,500</td></tr>
            <tr class="iv-tot"><td colspan="3">Total (incl. 18% GST)</td><td>Rs 1,590,050</td></tr>
          </table>
          <div class="iv-foot"><img src="${mono}" height="14" alt=""><span>Generated with Nafaa ERP</span></div>
        </div>
        <div class="cap">Factory / ERP invoice</div>
      </div>
      <div class="mock">
        <div class="bcard"><img src="${dk}" height="34" alt=""></div>
        <div class="bcard bcard-back"><b>Ayesha Khan</b><span>Head of Partnerships</span><span class="bc-sp">ayesha@nafaa.pk</span><span>nafaa.pk</span><img src="${icon}" width="26" height="26" alt=""></div>
        <div class="cap">Business card, front and back</div>
      </div>
    </div>
    <div class="mock web">
      <div class="site">
        <img src="${hz}" height="30" alt="">
        <nav><span>Product</span><span>Industries</span><span>Pricing</span><span>Login</span></nav>
        <a class="cta">Start free</a>
      </div>
      <div class="site site-dark">
        <img src="${dk}" height="30" alt="">
        <nav><span>Product</span><span>Industries</span><span>Pricing</span><span>Login</span></nav>
        <a class="cta">Start free</a>
      </div>
      <div class="cap">Website header, light and dark</div>
    </div>
  </div>
</section>`;
}

const nav = round2.map((c) => `<a href="#${c.id}"><img src="${src(c.id, 'icon.svg')}" width="20" height="20" alt="">${c.id.slice(0, 2)} · ${bidi(esc(c.name))}</a>`).join('') + '<a href="#round-1" class="r1-chip">Round 1</a>';

const ROUND1_INTRO = `<div class="r1-intro">
  
  <h2 class="r1-h">Round 1: a mark for every kind of business</h2>
  <p class="lead">Six new directions for the Nafaa symbol, plus today's mark redrawn as a baseline for comparison. Nafaa serves retail, e-commerce, manufacturing, wholesale and distribution, services and restaurants, so none of these is a picture of a shop. Each is one idea, drawn by hand on a construction grid, and works in one colour. The wordmark is Inter Bold, outlined to paths, so it renders the same everywhere.</p>
  <p class="lead ur">Chhe naye nishan, har karobar ke liye. Har ek ko chhote size, dark background aur asal jagah par dekh kar faisla karein.</p>
  <div class="lineup">${concepts.filter((c) => !c.baseline).map((c) => `<a href="#${c.id}"><img src="${src(c.id, 'icon.svg')}" width="72" height="72" alt=""><span>${bidi(esc(c.name))}</span></a>`).join('')}</div>
  <div class="grid2">
    <div class="box rec">
      <h3>Round 1 recommendation (superseded)</h3>
      <ol>
        <li><b>01 · Ascend N.</b> One solid shape that is both the name (an N) and the promise (it climbs up and to the right). It has the cleanest silhouette in the set, stays sharp at 16 px, and engraves, embroiders and prints in one colour without losing anything. It reads the same to a textile mill in Faisalabad and a café in Dubai. It is the safest route to a global, Notion- or Stripe-grade monogram.</li>
        <li><b>06 · Flow.</b> The most memorable gesture: one unbroken line that draws an n and ends higher than it started, which is "one system" and "growth" in a single stroke. It is the friendliest mark here and the easiest to draw from memory, the way people can draw Airbnb's Bélo. Before adopting it, run a trademark check against Nubank's joined "nu", the closest existing mark.</li>
      </ol>
      <p style="margin:6px 0 0;color:var(--muted);font-size:14px">If the brand should lead with its Pakistani roots, <b>02 · Noon</b> is the bold alternative: it is the most ownable of all, but it is less obviously "N" to people outside the region.</p>
      <p style="margin:6px 0 0;color:var(--muted);font-size:14px">Next step: show the top two to 8 to 10 owners from different industries on a phone home screen. Ask what they see, and which one they can still describe the next day.</p>
      <p style="margin:6px 0 0;color:var(--green-d);font-size:14px;font-style:italic">Meri raaye: Ascend N sab se mazboot aur saaf hai; Flow sab se yaadgaar hai.</p>
    </div>
    <div class="box">
      <h3>Today's mark, for comparison</h3>
      <div class="compare">
        <figure><img src="${ORIGINAL_ICON}" alt="Current Nafaa icon">Current</figure>
        <span class="arrow">→</span>
        <figure><img src="${src('00-original-refined', 'icon.svg')}" alt="Refined Nafaa icon">Refined (00)</figure>
      </div>
      <p style="margin:14px 0 0;color:var(--muted);font-size:14px">The current diagonal runs from bottom-left to top-right, so the letter is a mirrored N ("И"). The refined version fixes this, but it is still a letter with a dot. It is shown only as a baseline, not as a recommendation.</p>
      <img src="${ORIGINAL_FULL}" alt="Current full logo" style="width:100%;max-width:420px;margin-top:12px;opacity:.9">
    </div>
  </div>
</div>
`;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nafaa Logo Concepts</title>
<link rel="icon" href="${src('A1-noon-bold', 'icon.svg')}">
<style>
:root{
  --bg:#f5f6f4; --card:#ffffff; --ink:#0b1510; --muted:#5b6660; --line:#e4e8e3;
  --green:#16a34a; --green-d:#15803d; --amber:#f59e0b; --dark:#0b1210; --dark-2:#121a17;
  --radius:18px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
img{display:block}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.top{padding:56px 0 24px}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--green-d);font-weight:700}
h1{font-size:44px;line-height:1.1;letter-spacing:-.03em;margin:10px 0 14px}
.lead{max-width:720px;color:var(--muted);font-size:17px;margin:0}
.lead.ur{font-style:italic;margin-top:8px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:32px}
.box{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:24px}
.box h3{margin:0 0 12px;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.compare{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.compare figure{margin:0;text-align:center;font-size:12px;color:var(--muted)}
.compare img{width:96px;height:96px;margin-bottom:6px}
.compare .arrow{font-size:22px;color:var(--muted)}
.rec ol{margin:0;padding-left:20px}
.rec li{margin-bottom:10px}
.rec li b{color:var(--green-d)}
.nav{position:sticky;top:0;z-index:5;background:rgba(245,246,244,.86);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);margin-top:32px}
.nav .wrap{display:flex;gap:6px;overflow-x:auto;padding-top:10px;padding-bottom:10px}
.nav a{display:flex;align-items:center;gap:8px;white-space:nowrap;text-decoration:none;color:var(--ink);font-size:13px;font-weight:600;padding:6px 12px 6px 6px;border-radius:999px;border:1px solid var(--line);background:var(--card)}
.nav a:hover{border-color:var(--green)}
.nav img{border-radius:5px}
.concept{background:var(--card);border:1px solid var(--line);border-radius:24px;margin:28px 0;overflow:hidden;scroll-margin-top:70px}
.c-head{display:flex;gap:18px;align-items:flex-start;padding:28px 28px 0}
.c-num{font:700 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);border:1px solid var(--line);border-radius:8px;padding:8px 9px;margin-top:4px}
.c-head h2{margin:0;font-size:26px;letter-spacing:-.02em;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.badge{font-size:11px;letter-spacing:.06em;text-transform:uppercase;background:#fef3c7;color:#92400e;border-radius:999px;padding:3px 10px;font-weight:700}
.badge.base{background:#e2e8f0;color:#334155}
.lineup{display:flex;gap:14px;flex-wrap:wrap;margin-top:28px}
.lineup a{display:flex;flex-direction:column;align-items:center;gap:8px;text-decoration:none;color:var(--ink);font-size:13px;font-weight:600;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 16px 12px;min-width:116px}
.lineup a:hover{border-color:var(--green)}
.lineup-group{margin-top:24px}
.lineup-group .lineup{margin-top:10px}
.lg-label{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700}
.diff{margin:0;padding-left:18px;color:#334155;font-size:14px}
.diff li{margin-bottom:6px}
.group-h{font-size:22px;letter-spacing:-.02em;margin:40px 0 0}
.r1-chip{background:#e9ece8 !important;padding:6px 12px !important}
.round1{margin:48px 0 0;border-top:1px solid var(--line);padding-top:20px}
.round1 summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 22px;font-weight:700;font-size:17px}
.round1 summary::-webkit-details-marker{display:none}
.round1 summary em{font-style:normal;font-size:13px;color:var(--green-d)}
.round1[open] summary em{visibility:hidden}
.round1[open] summary em::before{content:"Hide";visibility:visible}
.r1-intro{padding:24px 0 0}
.r1-h{font-size:28px;letter-spacing:-.02em;margin:0 0 10px}
.idea{margin:4px 0 0;color:var(--muted);font-size:16px}
.c-body{padding:24px 28px 28px}
.hero-row{display:grid;grid-template-columns:260px 1fr;gap:16px}
.panel{border-radius:16px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;position:relative}
.panel.light{background:#fff}
.panel.dark{background:var(--dark);border-color:var(--dark)}
.big-icon{background:repeating-linear-gradient(0deg,transparent 0 23px,#eef1ed 23px 24px),repeating-linear-gradient(90deg,transparent 0 23px,#eef1ed 23px 24px);padding:20px}
.big-icon img{width:100%;max-width:220px;height:auto;filter:drop-shadow(0 10px 24px rgba(21,128,61,.22))}
.lockups{display:grid;grid-template-rows:1fr 1fr;grid-template-columns:1fr 1fr;gap:16px}
.lockups .panel{padding:28px 20px;min-height:120px}
.lockups .panel:first-child{grid-column:1 / span 2}
.lockups .panel:first-child .hz{height:84px}
.hz{height:52px;width:auto;max-width:100%}
.tag{position:absolute;top:10px;left:12px;font-size:11px;color:var(--muted);letter-spacing:.04em}
.why{display:grid;grid-template-columns:1fr;gap:4px;margin:22px 0 4px;max-width:860px}
.why p{margin:0}
.why .ur{color:var(--green-d);font-style:italic}
.label{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:22px 0 10px}
.sizes{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.row{justify-content:flex-start;gap:18px;padding:16px 20px;flex-wrap:wrap}
.sz{margin:0;display:flex;flex-direction:column;align-items:center;gap:4px;font:600 10px/1 ui-monospace,Menlo,monospace;color:var(--muted)}
.panel.dark .sz{color:#7d8a84}
.sep{width:1px;align-self:stretch;background:var(--line)}
.panel.dark .sep{background:#26302c}
.row img[height]{width:auto}
.mocks{display:grid;grid-template-columns:230px 1fr 240px;gap:16px;align-items:start}
.mock-col{display:grid;gap:16px}
.cap{font-size:12px;color:var(--muted);margin-top:8px;text-align:center}
.phone{width:210px;height:390px;margin:0 auto;border-radius:36px;background:linear-gradient(160deg,#134e4a,#0f172a 60%,#3b0764);border:8px solid #0b0f0d;position:relative;padding:44px 14px 0;box-shadow:0 18px 40px rgba(0,0,0,.18)}
.notch{position:absolute;top:8px;left:50%;transform:translateX(-50%);width:70px;height:20px;border-radius:12px;background:#0b0f0d}
.clock{position:absolute;top:10px;left:18px;color:#fff;font-size:11px;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 8px}
.app{display:flex;flex-direction:column;align-items:center;gap:4px}
.app i,.app img{width:38px;height:38px;border-radius:10px;display:block}
.app img{border-radius:9px}
.app span{color:#fff;font-size:8.5px;opacity:.9}
.browser{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#dfe3e8}
.tabs{display:flex;gap:2px;padding:8px 8px 0}
.tab{display:flex;align-items:center;gap:8px;font-size:12px;padding:8px 12px;border-radius:9px 9px 0 0;color:#475569;min-width:0;max-width:240px}
.tab span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tab b{font-weight:400;color:#94a3b8;margin-left:auto;padding-left:10px}
.tab.active{background:#fff;color:#0f172a}
.tab i{width:16px;height:16px;border-radius:4px;background:#94a3b8;flex:none}
.tab img{flex:none}
.bar{background:#fff;padding:8px 10px;border-top:1px solid #eef0f2}
.url{display:block;background:#f1f3f5;border-radius:999px;padding:5px 14px;font-size:12px;color:#475569}
.site{display:flex;align-items:center;gap:20px;padding:16px 20px;border:1px solid var(--line);border-radius:12px;background:#fff}
.site + .site{margin-top:10px}
.site img{width:auto}
.site nav{display:flex;gap:16px;font-size:13px;color:#334155;margin-left:auto}
.site .cta{background:var(--green);color:#fff;font-size:13px;font-weight:600;padding:8px 14px;border-radius:9px;white-space:nowrap}
.site-dark{background:var(--dark);border-color:var(--dark)}
.site-dark nav{color:#cbd5e1}
.mocks-2{grid-template-columns:1fr 1.35fr 1fr;margin-top:16px}
.web{margin-top:16px}
.dash{background:#f8faf9;border-top:1px solid #eef0f2}
.d-top{display:flex;align-items:center;gap:14px;padding:10px 14px;background:#fff;border-bottom:1px solid #eef0f2}
.d-top img{width:auto}
.d-search{flex:1;background:#f1f3f5;border-radius:8px;padding:5px 10px;font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.d-org{font-size:11px;font-weight:600;color:#334155;white-space:nowrap}
.d-av{width:22px;height:22px;border-radius:50%;background:#cbd5e1;flex:none}
.d-main{display:grid;grid-template-columns:118px 1fr;min-height:150px}
.d-side{list-style:none;margin:0;padding:10px 8px;border-right:1px solid #eef0f2;background:#fff;font-size:11px;color:#475569}
.d-side li{padding:4px 8px;border-radius:6px}
.d-side li.on{background:#dcfce7;color:#14532d;font-weight:600}
.d-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px;align-content:start}
.kpi{background:#fff;border:1px solid #eef0f2;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column}
.kpi span{font-size:10px;color:#64748b}
.kpi b{font-size:14px;letter-spacing:-.01em}
.d-panel{grid-column:1 / -1;height:58px;background:#fff;border:1px solid #eef0f2;border-radius:8px}
.social{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;text-align:center;padding-bottom:16px}
.s-cover{height:64px;background:linear-gradient(120deg,#052e16,#15803d)}
.s-av{width:76px;height:76px;border-radius:50%;margin:-38px auto 8px;border:4px solid #fff;box-sizing:content-box}
.s-name{font-weight:700;font-size:16px}
.s-tick{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;background:#16a34a;color:#fff;font-size:10px;vertical-align:2px}
.s-handle{font-size:12px;color:var(--muted)}
.s-bio{font-size:12px;color:#334155;margin:8px 16px 12px;line-height:1.45}
.s-btn{display:inline-block;background:#0b1510;color:#fff;font-size:12px;font-weight:600;border-radius:999px;padding:6px 18px}
.checkout{border:1px solid var(--line);border-radius:14px;background:#fff;padding:18px}
.co-h{font-weight:700;font-size:15px;margin-bottom:10px}
.co-ln{display:flex;justify-content:space-between;font-size:12.5px;color:#334155;padding:3px 0}
.co-tot{border-top:1px solid #eef0f2;margin-top:6px;padding-top:8px;font-weight:700;color:var(--ink)}
.co-pay{background:#0b1510;color:#fff;text-align:center;font-weight:600;font-size:13px;border-radius:10px;padding:10px;margin-top:12px}
.co-badge{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;font-size:11.5px;color:#64748b}
.co-badge img{border-radius:4px}
.co-badge b{color:var(--ink)}
.invoice{border:1px solid var(--line);border-radius:6px;background:#fff;padding:18px 18px 12px;font-size:11.5px;box-shadow:0 1px 0 #eef0f2,0 8px 24px rgba(15,23,42,.05)}
.iv-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #052e16;padding-bottom:10px}
.iv-top img{width:auto}
.iv-title{text-align:right;display:flex;flex-direction:column}
.iv-title b{letter-spacing:.08em;font-size:12px}
.iv-title span{color:#64748b;font-size:10.5px}
.iv-to{display:flex;flex-direction:column;margin:10px 0;color:#475569}
.iv-to span:first-child{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8}
.iv-to b{color:var(--ink)}
.invoice table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
.invoice th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-weight:600;border-bottom:1px solid #e2e8f0;padding:4px 4px}
.invoice td{padding:5px 4px;border-bottom:1px solid #f1f5f9;color:#334155}
.invoice th:not(:first-child),.invoice td:not(:first-child){text-align:right;white-space:nowrap}
.iv-tot td{font-weight:700;color:var(--ink);border-bottom:none}
.iv-foot{display:flex;align-items:center;gap:8px;margin-top:10px;color:#94a3b8;font-size:10px}
.iv-foot img{width:auto}
.bcard{aspect-ratio:1.75;border-radius:10px;background:#052e16;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(5,46,22,.22)}
.bcard img{width:auto}
.bcard-back{background:#fff;border:1px solid var(--line);box-shadow:0 6px 18px rgba(15,23,42,.06);margin-top:12px;flex-direction:column;align-items:flex-start;justify-content:center;padding:0 20px;font-size:11.5px;color:#475569;position:relative;line-height:1.5}
.bcard-back b{color:var(--ink);font-size:14px}
.bc-sp{margin-top:8px}
.bcard-back img{position:absolute;right:16px;bottom:16px;border-radius:7px}
footer{color:var(--muted);font-size:13px;padding:24px 0 60px}
footer code{font-size:12px;background:#e9ece8;padding:1px 6px;border-radius:5px}
@media (max-width:980px){
  .hero-row,.mocks,.mocks-2{grid-template-columns:1fr}
  .d-org{display:none}
  .sizes,.grid2{grid-template-columns:1fr}
  .site nav{display:none}
}
@media (max-width:560px){
  .lineup{gap:8px}
  .lineup a{min-width:0;flex:1 1 28%;padding:12px 6px 10px;font-size:12px}
  .lineup img{width:52px;height:52px}
  .compare img{width:72px;height:72px}
  .compare{gap:10px}
  .tab{max-width:170px}
  .site{gap:12px;padding:14px}
  .site .cta{font-size:12px;padding:7px 10px}
  .site img{height:24px}
  .row{gap:12px;padding:14px}
  .d-main{grid-template-columns:1fr}
  .d-side{display:none}
  .d-cards{grid-template-columns:1fr 1fr}
  .invoice{font-size:10.5px;padding:14px 12px}
  .iv-top{flex-direction:column}
  .iv-title{text-align:left}
  .wrap{padding:0 16px}
  h1{font-size:32px}
  .c-head,.c-body{padding-left:16px;padding-right:16px}
  .lockups{grid-template-columns:1fr}
  .lockups .panel:first-child{grid-column:auto}
  .lockups .panel:first-child .hz{height:56px}
  .hz{height:44px}
}
</style>
</head>
<body>
<div class="wrap top">
  <div class="eyebrow">Nafaa · Brand exploration · Round 2 · October 2026</div>
  <h1>Round 2: building on Noon</h1>
  <p class="lead">In round 1, the Noon (ن) was the mark that made sense, so round 2 starts there. Group A develops the Noon in five ways. Group B adds four new marks chosen to be understood in one second, with nothing to explain. Every mark is simple geometry, works in one colour, reads at 16 px, and uses only the brand green and amber. None of them shows a shop, cart, coin or chart.</p>
  <p class="lead ur">Round 1 me sirf Noon samajh aaya, is liye round 2 usi se shuru hota hai. Group A: Noon ke paanch roop. Group B: chaar naye nishan jo ek nazar me samajh aa jayein.</p>
  <div class="lineup-group"><div class="lg-label">A · Noon developments</div><div class="lineup">${round2.filter((c) => c.group === 'A').map((c) => `<a href="#${c.id}"><img src="${src(c.id, 'icon.svg')}" width="72" height="72" alt=""><span>${bidi(esc(c.name))}</span></a>`).join('')}</div></div>
  <div class="lineup-group"><div class="lg-label">B · New, instantly clear</div><div class="lineup">${round2.filter((c) => c.group === 'B').map((c) => `<a href="#${c.id}"><img src="${src(c.id, 'icon.svg')}" width="72" height="72" alt=""><span>${bidi(esc(c.name))}</span></a>`).join('')}</div></div>
  <div class="grid2">
    <div class="box rec">
      <h3>Recommendation</h3>
      <ol>
        <li><b>A1 · Noon, bold.</b> This is the idea that already landed, made strong enough to be the final mark. The heavier bowl and larger amber nuqta hold up at 16 px, and the meaning (a business, and what it gains) needs no caption. Pair it with the <b>A5 bilingual lockup</b>, "Nafaa | <bdi lang="ur">نفع</bdi>", as the full logo, so it works in Pakistan and abroad from day one.</li>
        <li><b>B3 · Noon rising.</b> The same Noon with its dot turned into an amber up-arrowhead. A green triangle pointing up means "going up" on every price screen in the world, so people get "growth" in one second. Urdu readers still see ن. Choose this one if the owner wants the growth message to be louder than the warmth.</li>
      </ol>
      <p style="margin:6px 0 0;color:var(--muted);font-size:14px">The safest fallback is <b>B4 · N-Up</b>: it is the most literal mark and the most legible at tiny sizes, but arrow marks are common in finance, so it is less ownable.</p>
      <p style="margin:6px 0 0;color:var(--green-d);font-size:14px;font-style:italic">Meri raaye: A1 Noon bold, saath me A5 wala "Nafaa | <bdi lang="ur">نفع</bdi>" logo. Agar barhat zyada zor se dikhani ho to B3.</p>
    </div>
    <div class="box">
      <h3>How round 2 differs</h3>
      <ul class="diff">
        <li>Every mark comes from the one idea that landed (Noon) or must be understood in one second.</li>
        <li>No abstractions that need a caption: Lift, Exchange and Flow are gone.</li>
        <li>Each one is tested at 16 px and in one colour (below).</li>
        <li>Round 1 is kept at the bottom of this page, collapsed, for reference.</li>
      </ul>
      <div class="compare" style="margin-top:14px">
        <figure><img src="${ORIGINAL_ICON}" alt="Current Nafaa icon">Today</figure>
        <span class="arrow">→</span>
        <figure><img src="${src('A1-noon-bold', 'icon.svg')}" alt="">A1</figure>
        <figure><img src="${src('B3-noon-arrow', 'icon.svg')}" alt="">B3</figure>
      </div>
    </div>
  </div>
</div>
<div class="nav"><div class="wrap">${nav}</div></div>
<main class="wrap">
<h2 class="group-h">A · Noon developments</h2>
${round2.filter((c) => c.group === 'A').map(section).join('\n')}
<h2 class="group-h">B · New marks, instantly clear</h2>
${round2.filter((c) => c.group === 'B').map(section).join('\n')}
<details class="round1" id="round-1">
  <summary><span>Round 1 · 6 concepts and the refined current mark</span><em>Show</em></summary>
  ${ROUND1_INTRO}
  ${concepts.map(section).join('\n')}
</details>
<footer>Round 2 files are in <code>round-2/&lt;concept&gt;/</code> and round 1 files in <code>&lt;concept&gt;/</code> next to this page. Each folder has <code>icon.svg</code> (app icon on a 512 tile), <code>logo-horizontal.svg</code>, <code>logo-dark.svg</code> and <code>mono.svg</code>. Wordmarks are Inter, outlined to paths; the Urdu in A5 is Noto Nastaliq Urdu Bold, also outlined. B2 is wordmark-led, so its horizontal logo is the dotted wordmark on its own. Colours: green #16a34a, light #22c55e, amber #f59e0b / #fbbf24, wordmark #052e16, one colour #020617.</footer>
</main>
<script>document.querySelectorAll('a[href="#round-1"]').forEach((a) => a.addEventListener('click', () => { document.getElementById('round-1').open = true; }));</script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('index.html', Math.round(html.length / 1024) + ' KB');
