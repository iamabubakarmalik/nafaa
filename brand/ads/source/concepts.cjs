// The ad concepts, laid out for each format. Mobile-first: the phone screen
// leads, type is sized for a feed seen on a phone (headlines 76-96 px on a
// 1080 canvas), and each creative carries one message.
//
//   problem   (a) Problem -> solution: the old way struck out, the Nafaa phone screen.
//   dashboard (b) Dashboard showcase: phone dashboard plus a zoomed crop of its numbers.
//   trio      (c) Feature trio: three rows, each a zoomed crop of a real phone screen.
//   cover     Reels cover: title and phone, key text inside the centre 1:1 area.
//   carousel  5 cards, drawn as one 5400 px panorama and sliced, so the swipe is seamless.
//
// Urdu variants mirror the layout (text column on the right) and use Nastaliq.

const T = require('./templates.cjs');

const { FORMATS, THEMES, esc, lines, cta, background, phone, laptop, tablet, crop, cropH, icon, logo, page, LOGO_RATIO } = T;

// ---- Shared pieces ------------------------------------------------------------------

function headline(t, list, x, y, size, opts = {}) {
  if (opts.ur) {
    return `<div class="abs ur" style="right:${opts.right}px;top:${y}px;color:${t.ink};font-size:${size}px;line-height:${opts.lh ?? 1.62};text-align:right;white-space:nowrap">${lines(list, t.accent)}</div>`;
  }
  const align = opts.center ? `left:0;width:${opts.width}px;text-align:center;` : `left:${x}px;`;
  return `<div class="abs h1" style="${align}top:${y}px;color:${t.ink};font-size:${size}px">${lines(list, t.accent)}</div>`;
}

function subline(t, text, x, y, size, width, opts = {}) {
  if (!text) return '';
  if (opts.ur) {
    return `<div class="abs ur" style="right:${opts.right}px;top:${y}px;width:${width}px;color:${t.sub};font-size:${size}px;line-height:1.75;text-align:right;font-weight:400">${esc(text)}</div>`;
  }
  const align = opts.center ? 'text-align:center;' : '';
  return `<div class="abs sub" style="left:${x}px;top:${y}px;width:${width}px;color:${t.sub};font-size:${size}px;${align}">${esc(text)}</div>`;
}

/** Header: logo left, industry pill right (pill text in Urdu for Urdu variants). */
function header(theme, f, ind, opts = {}) {
  const t = THEMES[theme];
  const link = f === FORMATS.link;
  const y = (f.safeTop || 0) + (link ? 40 : f === FORMATS['1x1'] ? 56 : 64);
  const lh = link ? 40 : 54;
  let out = logo(theme, f.pad, y, lh);
  if (link || opts.noPill) return out;
  const ps = 25;
  const ph = 60;
  const amber = theme === 'green' ? '#fbbf24' : '#f59e0b';
  const diamond = `<span style="width:12px;height:12px;transform:rotate(45deg);background:${amber};border-radius:2px;flex:none"></span>`;
  const label = opts.ur ? `<span class="ur" style="font-size:${ps}px;line-height:1;position:relative;top:0.16em">${esc(ind.ur.pill)}</span>` : esc(ind.pill);
  out += `<div class="abs" style="right:${f.pad}px;top:${y + (lh - ph) / 2}px;display:flex;flex-direction:${opts.ur ? 'row-reverse' : 'row'};align-items:center;gap:12px;height:${ph}px;padding:0 24px;border-radius:999px;background:${t.pillBg};border:1.5px solid ${t.pillLine};color:${t.pillInk};font-weight:600;font-size:${ps}px;white-space:nowrap">${diamond}${label}</div>`;
  return out;
}

/** "Old way" chips, struck through. */
function chips(t, list, x, y, size, opts = {}) {
  const ur = opts.ur;
  const pos = ur ? `right:${opts.right}px` : `left:${x}px`;
  return `<div class="abs" style="${pos};top:${y}px;display:flex;flex-direction:${ur ? 'row-reverse' : 'row'};gap:${size * 0.45}px;flex-wrap:nowrap">${list
    .map(
      (p) => `<div style="display:flex;flex-direction:${ur ? 'row-reverse' : 'row'};align-items:center;gap:${size * 0.35}px;height:${size * 2}px;padding:0 ${size * 0.62}px;border-radius:${size * 0.5}px;background:#ffffff;border:1.5px solid #fecaca;box-shadow:0 8px 20px -14px rgba(127,29,29,0.4)">
      ${icon('x', size * 0.95, '#dc2626', 3)}<span class="${ur ? 'ur' : ''}" style="font-size:${ur ? size * 0.92 : size}px;font-weight:${ur ? 400 : 600};color:#475569;text-decoration:line-through;text-decoration-color:rgba(220,38,38,0.65);text-decoration-thickness:${Math.max(2, size * 0.08)}px;white-space:nowrap;line-height:1;${ur ? 'position:relative;top:0.14em' : ''}">${esc(p)}</span></div>`,
    )
    .join('')}</div>`;
}

/** Primary button full width with the WhatsApp button under it. */
function ctaStack(theme, x, y, w, size, opts = {}) {
  const t = THEMES[theme];
  const h = size * 2.65;
  const ur = opts.ur;
  const p = ur ? '<span class="ur" style="position:relative;top:0.14em">7 دن فری ٹرائل</span>' : '7 din free trial';
  const s = ur ? '<span class="ur" style="position:relative;top:0.14em">واٹس ایپ کریں</span>' : 'WhatsApp karein';
  const glow = theme === 'green' ? 'rgba(3,23,11,0.45)' : 'rgba(22,163,74,0.5)';
  return `<div class="abs" style="left:${x}px;top:${y}px;width:${w}px;display:flex;flex-direction:column;gap:${size * 0.45}px">
    <div style="height:${h}px;border-radius:${h / 2}px;background:${t.btnBg};color:${t.btnInk};display:flex;align-items:center;justify-content:center;gap:${size * 0.5}px;font-weight:700;font-size:${size}px;letter-spacing:-0.01em;box-shadow:0 ${size * 0.5}px ${size * 1.4}px -${size * 0.4}px ${glow}">${p}${ur ? '' : icon('arrow', size * 1.05, t.btnInk, 2.6)}</div>
    <div style="height:${h}px;border-radius:${h / 2}px;background:${t.ghostBg};border:2px solid ${t.ghostLine};color:${t.ghostInk};display:flex;flex-direction:${ur ? 'row-reverse' : 'row'};align-items:center;justify-content:center;gap:${size * 0.5}px;font-weight:600;font-size:${size * 0.94}px">${icon('chat', size * 1.02, theme === 'green' ? '#ffffff' : '#16a34a', 2.3)}${s}</div>
  </div>`;
}

const mirror = (f, ur) => (x, w) => (ur ? f.w - x - w : x);

/** A zoomed crop of a real screen used as a callout over the phone. */
function callout(img, rect, x, y, w, theme, opts = {}) {
  const dark = theme !== 'light';
  return crop(img, rect, x, y, w, {
    radius: opts.radius ?? Math.round(w * 0.05),
    ring: dark ? 'rgba(255,255,255,0.22)' : 'rgba(5,46,22,0.08)',
    shadow: dark ? '0 50px 90px -20px rgba(0,0,0,0.6), 0 16px 30px -10px rgba(0,0,0,0.35)' : '0 46px 80px -26px rgba(3,23,11,0.42), 0 14px 28px -14px rgba(3,23,11,0.25)',
    h: opts.h,
  });
}

const H1LH = 1.02; // Inter headline line height

// ---- (a) Problem -> solution ----------------------------------------------------------

// h1: [y, size]; chips: [y, size]; phone: [x, y, w]; call: [x, y, w]; cta: [x, y, w, size]
const PROBLEM = {
  '4x5': { h1: [168, 88], chips: [30], phone: [476, 0, 548], call: [44, 250, 520], cta: [76, 1060, 370, 31], gap: 36, phoneGap: 60 },
  '9x16': { h1: [452, 96], chips: [32], phone: [476, 0, 560], call: [44, 200, 520], cta: [84, 1300, 360, 32], gap: 40, phoneGap: 70 },
  '1x1': { h1: [150, 78], chips: [27], phone: [566, 0, 456], call: [40, 150, 500], cta: [72, 850, 380, 28], gap: 30, phoneGap: 50 },
  link: { h1: [104, 58], chips: [21], phone: [866, 48, 290], call: [600, 300, 320], cta: [56, 514, 0, 23], gap: 26 },
};

function problem(ind, fk, img, opts = {}) {
  const f = FORMATS[fk];
  const L = PROBLEM[fk];
  const ur = !!opts.ur;
  const theme = 'light';
  const t = THEMES[theme];
  const X = mirror(f, ur);
  const a = ind.a;
  const h1 = ur ? ind.ur.a : a.headline;
  const [hy, hs] = L.h1;
  const ulh = 1.62;
  const h1H = ur ? h1.length * hs * 0.8 * ulh : h1.length * hs * H1LH;
  const chipY = hy + h1H + L.gap;
  const chipH = L.chips[0] * 2;
  let out = background(theme, f.w, f.h, { ringsX: ur ? f.w * 0.16 : f.w * 0.84, ringsY: f.h * 0.98 });
  out += header(theme, f, ind, { ur });
  const ph = img(a.phone);
  const [px, , pw] = L.phone;
  const py = fk === 'link' ? L.phone[1] : chipY + chipH + L.phoneGap;
  out += phone(ph, X(px, pw), py, pw, { scrollY: a.phoneScroll || 0, time: '7:15' });
  if (a.call && fk !== 'link') {
    const [cx, cyo, cw] = L.call;
    const cy = fk === 'link' ? cyo : py + cyo;
    out += callout(img(a.call.img), a.call.rect, X(cx, cw), cy, cw, theme);
  }
  if (ur) out += headline(t, h1, 0, hy - hs * 0.2, hs * 0.8, { ur, right: f.pad, lh: ulh });
  else out += headline(t, h1, f.pad, hy, hs);
  out += chips(t, ur ? ind.ur.old : a.old, f.pad, chipY, L.chips[0], { ur, right: f.pad });
  if (fk === 'link') out += ur ? cta(theme, 0, L.cta[1], L.cta[3], { ur, right: f.pad }) : cta(theme, L.cta[0], L.cta[1], L.cta[3]);
  else out += ctaStack(theme, X(L.cta[0], L.cta[2]), L.cta[1], L.cta[2], L.cta[3], { ur });
  return page(f.w, f.h, out);
}

// ---- (b) Dashboard showcase -----------------------------------------------------------

const DASH = {
  '4x5': { h1: [168, 88], sub: 34, cta: 31, phone: [480, 0, 540], call: [52, 70, 520], call2: [92, 460, 430], gap: 26, vis: 70 },
  '9x16': { h1: [452, 96], sub: 36, cta: 32, phone: [470, 0, 566], call: [48, 80, 540], call2: [92, 500, 460], gap: 30, vis: 80 },
  '1x1': { h1: [150, 78], sub: 31, cta: 28, phone: [566, 0, 450], call: [48, 60, 500], call2: null, gap: 22, vis: 56 },
  link: { h1: [104, 58], sub: 25, cta: 23, phone: [866, 48, 290], call: [590, 290, 330], call2: null, gap: 20, vis: 0 },
};

function dashboard(ind, fk, img, opts = {}) {
  const f = FORMATS[fk];
  const L = DASH[fk];
  const ur = !!opts.ur;
  const theme = 'dark';
  const t = THEMES[theme];
  const X = mirror(f, ur);
  const b = ind.b;
  const h1 = ur ? ind.ur.b : b.headline;
  const sub = ur ? ind.ur.bSub : b.sub;
  const [hy, hs] = L.h1;
  const ulh = 1.62;
  const h1H = ur ? h1.length * hs * 0.8 * ulh : h1.length * hs * H1LH;
  const subY = hy + h1H + L.gap - (ur ? 10 : 0);
  const subH = ur ? L.sub * 1.75 : L.sub * 1.32;
  const ctaY = fk === 'link' ? 514 : subY + subH + L.gap + 8;
  const ctaH = L.cta * 2.7;
  let out = background(theme, f.w, f.h, { latticeAt: ur ? 'right' : 'left', ringsX: ur ? f.w * 0.12 : f.w * 0.88, ringsY: f.h });
  out += header(theme, f, ind, { ur });
  const [px, , pw] = L.phone;
  const py = fk === 'link' ? L.phone[1] : ctaY + ctaH + L.vis;
  out += phone(img(b.phone), X(px, pw), py, pw, { time: '7:15', scrollY: b.phoneScroll || 0 });
  const [cx, cyo, cw] = L.call;
  out += callout(img(b.call.img), b.call.rect, X(cx, cw), fk === 'link' ? cyo : py + cyo, cw, theme);
  if (L.call2 && b.call2) {
    const [c2x, c2yo, c2w] = L.call2;
    const c1h = cropH(b.call.rect, cw);
    out += callout(img(b.call2.img), b.call2.rect, X(c2x, c2w), py + cyo + c1h + 28, c2w, theme);
  }
  if (ur) {
    out += headline(t, h1, 0, hy - hs * 0.2, hs * 0.8, { ur, right: f.pad, lh: ulh });
    out += subline(t, sub, 0, subY, L.sub * 0.92, f.w - f.pad * 2, { ur, right: f.pad });
    out += cta(theme, 0, ctaY, L.cta, { ur, right: f.pad });
  } else {
    out += headline(t, h1, f.pad, hy, hs);
    out += subline(t, sub, f.pad, subY, L.sub, fk === 'link' ? 560 : f.w - f.pad * 2);
    out += cta(theme, f.pad, ctaY, L.cta);
  }
  return page(f.w, f.h, out);
}

// ---- (c) Feature trio -----------------------------------------------------------------

// rows: [x, y, w, h, gap, cropW]; ts/ss: title and sub size
const TRIO = {
  '4x5': { h1: [168, 88], sub: 33, rows: [76, 0, 928, 236, 22, 420], ts: 44, ss: 29, cta: [0, 31], gap: 22, rowsGap: 46 },
  '9x16': { h1: [452, 96], sub: 36, rows: [84, 0, 912, 228, 22, 400], ts: 46, ss: 30, cta: [0, 31], gap: 24, rowsGap: 46 },
  '1x1': { h1: [150, 78], sub: 30, rows: [72, 0, 936, 190, 16, 380], ts: 38, ss: 26, cta: [0, 27], gap: 18, rowsGap: 32 },
  link: { h1: [104, 58], sub: 24, rows: [604, 36, 552, 172, 12, 230], ts: 27, ss: 18, cta: [514, 23], gap: 20, rowsGap: 0 },
};

function trio(ind, fk, img, opts = {}) {
  const f = FORMATS[fk];
  const L = TRIO[fk];
  const ur = !!opts.ur;
  const theme = 'green';
  const t = THEMES[theme];
  const c = ind.c;
  const X = mirror(f, ur);
  const h1 = ur ? ind.ur.c : c.headline;
  const sub = ur ? ind.ur.cSub : c.sub;
  const [hy, hs] = L.h1;
  const ulh = 1.6;
  const h1H = ur ? h1.length * hs * 0.8 * ulh : h1.length * hs * H1LH;
  const subY = hy + h1H + L.gap - (ur ? 12 : 0);
  const subH = ur ? L.sub * 1.75 : L.sub * 1.32;
  let out = background(theme, f.w, f.h, { ringsX: ur ? f.w * 0.1 : f.w * 0.9, ringsY: f.h * 1.02 });
  out += header(theme, f, ind, { ur });
  const [rx, ry0, rw, rh, rgap, cwid] = L.rows;
  const ry = fk === 'link' ? ry0 : subY + subH + L.rowsGap;
  const items = ur ? c.items.map((it, i) => ({ ...it, title: ind.ur.cItems[i][0], sub: ind.ur.cItems[i][1] })) : c.items;
  const pad = fk === 'link' ? 10 : 16;
  const radius = fk === 'link' ? 18 : 30;
  items.forEach((it, i) => {
    const x = X(rx, rw);
    const y = ry + i * (rh + rgap);
    const cw = cwid;
    const ch = rh - pad * 2;
    const cxp = ur ? x + rw - pad - cw : x + pad;
    out += `<div class="abs" style="left:${x}px;top:${y}px;width:${rw}px;height:${rh}px;border-radius:${radius}px;background:#ffffff;box-shadow:0 34px 60px -30px rgba(3,23,11,0.55),0 10px 20px -12px rgba(3,23,11,0.28)"></div>`;
    out += crop(img(it.img), it.rect, cxp, y + pad, cw, { h: ch, radius: radius - pad * 0.6, shadow: 'none', ring: 'rgba(15,23,42,0.06)', style: 'background:#f8fafc' });
    if (cropH(it.rect, cw) > ch + 2) out += `<div class="abs" style="left:${cxp}px;top:${y + pad + ch * 0.7}px;width:${cw}px;height:${ch * 0.3 + 1}px;border-radius:0 0 ${radius - pad * 0.6}px ${radius - pad * 0.6}px;background:linear-gradient(180deg,rgba(255,255,255,0),#ffffff 95%)"></div>`;
    const tx = ur ? x + pad + 10 : x + pad + cw + (fk === 'link' ? 18 : 30);
    const tw = rw - cw - pad * 2 - (fk === 'link' ? 28 : 46);
    const num = String(i + 1).padStart(2, '0');
    if (ur) {
      out += `<div class="abs" style="left:${tx}px;top:${y}px;width:${tw}px;height:${rh}px;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;gap:${L.ss * 0.1}px">
        <div class="ur" style="color:#052e16;font-size:${L.ts * 0.86}px;line-height:1.6;text-align:right">${esc(it.title)}</div>
        <div class="ur" style="color:#475569;font-size:${L.ss * 0.92}px;line-height:1.75;text-align:right;font-weight:400">${esc(it.sub)}</div></div>`;
    } else {
      out += `<div class="abs" style="left:${tx}px;top:${y}px;width:${tw}px;height:${rh}px;display:flex;flex-direction:column;justify-content:center;gap:${L.ss * 0.32}px">
        <div style="display:flex;align-items:baseline;gap:${L.ts * 0.3}px"><span class="num" style="color:#16a34a;font-weight:800;font-size:${L.ss * 0.82}px;letter-spacing:0.06em">${num}</span><span style="color:#052e16;font-weight:800;font-size:${L.ts}px;letter-spacing:-0.03em;white-space:nowrap;line-height:1.05">${esc(it.title)}</span></div>
        <div class="sub" style="color:#475569;font-size:${L.ss}px;line-height:1.28">${esc(it.sub)}</div></div>`;
    }
  });
  if (ur) {
    out += headline(t, h1, 0, hy - hs * 0.2, hs * 0.8, { ur, right: f.pad, lh: ulh });
    out += subline(t, sub, 0, subY, L.sub * 0.92, f.w - f.pad * 2, { ur, right: f.pad });
  } else {
    out += headline(t, h1, f.pad, hy, hs);
    out += subline(t, sub, f.pad, subY, L.sub, fk === 'link' ? 500 : f.w - f.pad * 2);
  }
  const ctaY = fk === 'link' ? L.cta[0] : ry + 3 * rh + 2 * rgap + (fk === '1x1' ? 30 : 40);
  out += ur ? cta(theme, 0, ctaY, L.cta[1], { ur, right: f.pad }) : cta(theme, f.pad, ctaY, L.cta[1]);
  return page(f.w, f.h, out);
}

// ---- Reels cover ------------------------------------------------------------------------

/**
 * 1080 x 1920 cover. The profile grid shows the centre (1:1 from y 420 to 1500,
 * 3:4 from y 240 to 1680), so the logo and the title sit inside y 440-900.
 */
function cover(ind, img) {
  const W = 1080;
  const H = 1920;
  const t = THEMES.green;
  const cv = ind.cover;
  let out = background('green', W, H, { ringsX: W / 2, ringsY: H * 0.62, ringR: 260, latticeY: '30%' });
  const lh = 64;
  out += logo('green', (W - lh * LOGO_RATIO) / 2, 456, lh);
  out += headline(t, cv.headline, 0, 572, 98, { center: true, width: W });
  const hb = 572 + cv.headline.length * 98 * H1LH;
  out += subline(t, cv.sub, 90, hb + 26, 36, W - 180, { center: true });
  out += phone(img(cv.phone), (W - 600) / 2, hb + 130, 600, { time: '7:15', scrollY: cv.phoneScroll || 0 });
  return page(W, H, out);
}

// ---- Carousel --------------------------------------------------------------------------

/**
 * Five 1080 cards drawn as one 5400 x 1080 panorama. Card 1 is the hook, 2-4 show
 * one real phone screen each, card 5 is the offer. The phone on card 1 crosses
 * into card 2 so the first swipe feels continuous.
 */
function carousel(ind, img) {
  const W = 1080;
  const H = 1080;
  const cards = ind.carousel;
  let out = `<div class="abs" style="inset:0;background:#f5faf6"></div>`;
  out += `<div class="abs" style="inset:0;background:radial-gradient(900px 700px at 900px 0px, rgba(187,247,208,0.9), rgba(245,250,246,0) 70%), radial-gradient(900px 700px at 2200px 1080px, rgba(220,252,231,0.9), rgba(245,250,246,0) 70%), radial-gradient(900px 700px at 3300px 0px, rgba(187,247,208,0.8), rgba(245,250,246,0) 70%), radial-gradient(700px 600px at 1500px 300px, rgba(254,243,199,0.5), rgba(245,250,246,0) 70%)"></div>`;
  out += `<svg class="abs" style="left:0;top:0" width="${W * 5}" height="${H}" viewBox="0 0 ${W * 5} ${H}"><defs><pattern id="lat" width="30" height="30" patternUnits="userSpaceOnUse"><rect x="12" y="12" width="6" height="6" transform="rotate(45 15 15)" fill="#16a34a"/></pattern>
    <linearGradient id="latg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.05"/><stop offset="1" stop-color="#fff" stop-opacity="0.2"/></linearGradient>
    <mask id="latm"><rect width="${W * 5}" height="${H}" fill="url(#latg)"/></mask></defs>
    <rect width="${W * 5}" height="${H * 0.36}" fill="url(#lat)" mask="url(#latm)" opacity="0.8"/>
  </svg>`;
  out += `<div class="abs" style="left:${W * 4}px;top:0;width:${W}px;height:${H}px;overflow:hidden">${background('green', W, H, { ringsX: W * 0.78, ringsY: H * 1.02, ringR: 170 })}</div>`;

  cards.forEach((c, i) => {
    const x0 = i * W;
    const theme = i === 4 ? 'green' : 'light';
    const tt = THEMES[theme];
    out += logo(theme, x0 + 72, 60, 52);
    out += `<div class="abs num" style="left:${x0 + W - 72 - 120}px;top:70px;width:120px;text-align:right;font-weight:700;font-size:26px;color:${theme === 'green' ? 'rgba(255,255,255,0.8)' : '#64748b'};letter-spacing:0.04em">${i + 1} / 5</div>`;
    for (const v of c.visuals || []) {
      const vi = img(v.img);
      if (v.type === 'phone') out += phone(vi, x0 + v.x, v.y, v.w, { scrollY: v.scrollY || 0, time: '7:15', rotate: v.rotate });
      else if (v.type === 'laptop') out += laptop(vi, x0 + v.x, v.y, v.w);
      else if (v.type === 'tablet') out += tablet(vi, x0 + v.x, v.y, v.w, { screenH: v.screenH });
      else if (v.type === 'crop') out += callout(vi, v.rect, x0 + v.x, v.y, v.w, theme, { h: v.h });
    }
    if (c.kind === 'hook') {
      out += headline(tt, c.headline, x0 + 72, 190, 84);
      const hb = 190 + c.headline.length * 84 * H1LH;
      out += subline(tt, c.sub, x0 + 72, hb + 30, 34, 560);
      out += `<div class="abs" style="left:${x0 + 72}px;top:930px;display:flex;align-items:center;gap:14px;font-weight:700;font-size:32px;color:#15803d">Swipe karein ${icon('arrow', 36, '#15803d', 2.6)}</div>`;
    } else if (c.kind === 'feature') {
      out += `<div class="abs" style="left:${x0 + 72}px;top:170px;display:flex;align-items:center;gap:14px"><span class="num" style="display:inline-flex;align-items:center;justify-content:center;height:48px;padding:0 16px;border-radius:12px;background:#dcfce7;color:#15803d;font-weight:800;font-size:24px;letter-spacing:0.04em">${esc(c.step)}</span><span style="font-weight:700;font-size:24px;letter-spacing:0.12em;color:#64748b">${esc(c.eyebrow)}</span></div>`;
      out += headline(tt, c.headline, x0 + 72, 246, 76);
      const hb = 246 + c.headline.length * 76 * H1LH;
      out += subline(tt, c.sub, x0 + 72, hb + 24, 32, c.subW ?? 460);
    } else if (c.kind === 'cta') {
      out += `<div class="abs" style="left:${x0 + 72}px;top:184px;display:inline-flex;align-items:center;gap:12px;height:56px;padding:0 24px;border-radius:999px;background:rgba(255,255,255,0.14);border:1.5px solid rgba(255,255,255,0.3);color:#fff;font-weight:700;font-size:26px">${icon('gift', 28, '#fbbf24', 2.3)}Card ki zaroorat nahi</div>`;
      out += headline(tt, c.headline, x0 + 72, 284, 104);
      const hb = 284 + c.headline.length * 104 * H1LH;
      out += subline(tt, c.sub, x0 + 72, hb + 28, 36, 900);
      out += `<div class="abs" style="left:${x0 + 72}px;top:${hb + 130}px;display:flex;align-items:baseline;gap:12px"><span style="font-weight:600;font-size:30px;color:rgba(255,255,255,0.82)">Phir</span><span class="num" style="font-weight:800;font-size:54px;letter-spacing:-0.03em;color:#fff">Rs 1,500</span><span style="font-size:30px;font-weight:600;color:rgba(255,255,255,0.82)">/ mahina se</span></div>`;
      out += cta('green', x0 + 72, 868, 33);
    }
  });
  return page(W * 5, H, out);
}

module.exports = { problem, dashboard, trio, cover, carousel, PROBLEM, DASH, TRIO };
