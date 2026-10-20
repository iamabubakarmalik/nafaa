// Writes brand/preview.html: every asset shown in context (WhatsApp chat,
// social profiles, store listing, desktop, web, email and print), for review.
// Called by build-assets.cjs after the assets exist. Images are referenced by
// relative path, so the page works when opened straight from the folder.

const fs = require('fs');
const path = require('path');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

module.exports = function writePreview({ OUT, manifest, industries, COPY, C, kb }) {
  const size = (rel) => {
    try {
      return kb(fs.statSync(path.join(OUT, rel)).size);
    } catch {
      return '';
    }
  };
  const img = (rel, alt, cls = '') => `<img src="${rel}" alt="${esc(alt)}" loading="lazy"${cls ? ` class="${cls}"` : ''}>`;
  const fig = (rel, caption, cls = '') => `<figure class="${cls}">${img(rel, caption)}<figcaption><code>${rel}</code><span>${size(rel)}</span></figcaption></figure>`;
  const ogSections = ['default', 'pricing', 'industries', 'features', 'blog', 'developers', 'services'];

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nafaa Brand Kit</title>
<link rel="icon" href="logo/png/favicon-32.png">
<style>
:root{--green:${C.green};--green-dark:${C.greenDark};--green-light:${C.greenLight};--amber:${C.amber};--amber-light:${C.amberLight};--ink:${C.ink};--bg:#f6f8f7;--surface:#fff;--line:#e3e8e5;--text:#0f1f16;--muted:#5b6b62;--chip:#eef6f1;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#07130c;--surface:#0d1f15;--line:#1d3326;--text:#e8f1ec;--muted:#93a89b;--chip:#123222;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#07130c;--surface:#0d1f15;--line:#1d3326;--text:#e8f1ec;--muted:#93a89b;--chip:#123222;color-scheme:dark}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
code{font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}
a{color:var(--green-dark)}
.wrap{max-width:1180px;margin:0 auto;padding:0 16px}
header.top{background:var(--ink);color:#fff;position:relative;overflow:hidden}
header.top .wrap{padding-top:56px;padding-bottom:64px;position:relative}
header.top .logo{width:180px;height:auto}
header.top h1{font-size:clamp(30px,5vw,52px);line-height:1.05;letter-spacing:-.03em;margin:28px 0 12px;font-weight:800}
header.top p{max-width:640px;color:#b9cdbf;margin:0}
header.top .rings{position:absolute;right:-120px;top:-260px;width:720px;height:720px;opacity:.35;pointer-events:none}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin-top:28px}
.toc a{color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:7px 14px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14)}
.toc a:hover{background:rgba(255,255,255,.16)}
.theme{position:absolute;right:16px;top:20px;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:99px;padding:6px 12px;font:600 12px Inter,system-ui,sans-serif;cursor:pointer}
section{padding:64px 0 8px}
section>.wrap>h2{font-size:28px;letter-spacing:-.02em;margin:0 0 6px;font-weight:800}
section>.wrap>p.lead{color:var(--muted);margin:0 0 28px;max-width:720px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--green-dark);background:var(--chip);padding:5px 11px;border-radius:99px;margin-bottom:12px}
.eyebrow:before{content:"";width:7px;height:7px;background:var(--amber);transform:rotate(45deg)}
.grid{display:grid;gap:20px}
.g2{grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
.g4{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}
.g6{grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr))}
.card{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:20px;overflow:hidden}
.card h3{margin:0 0 4px;font-size:16px}.card p{margin:0 0 14px;color:var(--muted);font-size:13.5px}
figure{margin:0}
figure img{border-radius:12px;border:1px solid var(--line);background:#fff}
figcaption{display:flex;justify-content:space-between;gap:8px;margin-top:8px;align-items:baseline}
figcaption span{font-size:12px;color:var(--muted);white-space:nowrap}
.checker img{background:repeating-conic-gradient(#d9e0dc 0 25%,#fff 0 50%) 0 0/16px 16px}
/* Phone + WhatsApp */
.phone{width:min(100%,340px);margin:0 auto;background:#0b1510;border-radius:44px;padding:10px;box-shadow:0 30px 60px -20px rgba(5,46,22,.45)}
.screen{border-radius:36px;overflow:hidden;background:#efeae2;height:700px;display:flex;flex-direction:column}
.wa-head{background:#075e54;background:#008069;color:#fff;display:flex;align-items:center;gap:10px;padding:34px 14px 10px}
.wa-head img{width:38px;height:38px;border-radius:50%}
.wa-head b{display:block;font-size:15px}.wa-head small{font-size:11.5px;opacity:.85;display:flex;align-items:center;gap:4px}
.wa-head small:before{content:"";width:11px;height:11px;border-radius:50%;background:#25d366;display:inline-block}
.wa-body{flex:1;padding:12px;display:flex;flex-direction:column;justify-content:flex-end;gap:8px;overflow:hidden;background:#efeae2 radial-gradient(#d9d2c5 1px,transparent 1px) 0 0/14px 14px}
.bub{max-width:82%;background:#fff;border-radius:10px;padding:6px 8px 4px;font-size:13px;color:#111;box-shadow:0 1px 1px rgba(0,0,0,.08)}
.bub.me{align-self:flex-end;background:#d9fdd3}
.bub img{border-radius:7px;margin-bottom:4px;border:0}
.bub .lp{background:#f0f2f0;border-radius:7px;overflow:hidden;margin-bottom:5px}
.bub .lp div{padding:6px 8px;font-size:11.5px;color:#444}.bub .lp b{display:block;color:#111;font-size:12.5px}
.bub time{display:block;text-align:right;font-size:10px;color:#667}
.bub img.g{max-width:200px}.stk{width:110px;align-self:flex-end;border:0;background:none}
.wa-input{background:#f0f2f5;padding:8px 10px 18px;display:flex;gap:8px}.wa-input div{flex:1;background:#fff;border-radius:20px;height:36px}.wa-input i{width:36px;height:36px;border-radius:50%;background:#008069}
.bizprof{max-width:360px;margin:0 auto;border-radius:22px;overflow:hidden;background:var(--surface);border:1px solid var(--line)}
.bizprof .cov{aspect-ratio:16/9;overflow:hidden}.bizprof .cov img{width:100%;height:100%;object-fit:cover;border:0;border-radius:0}
.bizprof .av{width:88px;height:88px;border-radius:50%;margin:-44px auto 8px;border:4px solid var(--surface);overflow:hidden}.bizprof .av img{border:0;border-radius:0}
.bizprof h4{text-align:center;margin:0;font-size:18px}.bizprof p{text-align:center;color:var(--muted);font-size:13px;margin:4px 16px 16px}
.stories{display:flex;gap:14px;overflow-x:auto;padding-bottom:6px}
.stories figure{flex:0 0 170px}.stories img{border-radius:18px;aspect-ratio:9/16;object-fit:cover}
/* Social mocks */
.fb .cover{position:relative;border-radius:14px 14px 0 0;overflow:hidden;aspect-ratio:1640/624}
.fb .cover img{width:100%;height:100%;object-fit:cover;border:0;border-radius:0}
.fb .meta{display:flex;align-items:flex-end;gap:16px;padding:0 20px 18px;margin-top:-52px;position:relative}
.fb .meta img{width:120px;height:120px;border-radius:50%;border:5px solid var(--surface);flex:none}
.fb .meta b{font-size:22px;display:block}.fb .meta small{color:var(--muted)}
.ig .headrow{display:flex;align-items:center;gap:22px;margin-bottom:16px}
.ig .headrow img{width:96px;height:96px;border-radius:50%;padding:3px;background:conic-gradient(#f59e0b,#16a34a,#f59e0b);border:0}
.ig .headrow b{font-size:18px}.ig .headrow small{display:block;color:var(--muted)}
.ig .gridp{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}
.ig .gridp img{aspect-ratio:3/4;object-fit:cover;border-radius:0;border:0;width:100%}
.yt .band{aspect-ratio:2560/423;overflow:hidden;border-radius:14px}
.yt .band img{width:100%;height:100%;object-fit:cover;border:0;border-radius:0}
.yt .chan{display:flex;gap:14px;align-items:center;margin:14px 0}
.yt .chan img{width:64px;height:64px;border-radius:50%;border:0}
.xh{position:relative}.xh .hd{aspect-ratio:3/1;overflow:hidden;border-radius:14px 14px 0 0}.xh .hd img{width:100%;height:100%;object-fit:cover;border:0;border-radius:0}
.xh .pp{width:20%;aspect-ratio:1;border-radius:50%;border:4px solid var(--surface);position:absolute;left:4%;bottom:0;transform:translateY(50%);overflow:hidden}
.xh .pp img{border-radius:50%;border:0}.xh .sp{height:70px}
.li .cv{aspect-ratio:1128/191;overflow:hidden;border-radius:14px 14px 0 0}.li .cv img{width:100%;height:100%;object-fit:cover;border:0;border-radius:0}
.li .lg{width:84px;height:84px;margin:-42px 0 0 18px;border:4px solid var(--surface);border-radius:8px;overflow:hidden;position:relative}.li .lg img{border:0;border-radius:0}
/* Store */
.store{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center}
.store .ic{width:96px;height:96px;border-radius:22px;overflow:hidden;box-shadow:0 6px 16px rgba(0,0,0,.15)}
.store .ic img{border:0;border-radius:0}
.store b{font-size:22px;display:block}.store small{color:var(--green-dark);font-weight:600}
.store .btn{display:inline-block;margin-top:10px;background:var(--green-dark);color:#fff;border-radius:10px;padding:8px 26px;font-weight:700;font-size:14px}
.feat{margin-top:18px;border-radius:14px;overflow:hidden}.feat img{border:0;border-radius:0}
.dock{display:flex;justify-content:center;align-items:flex-end;gap:16px;padding:18px 20px;border-radius:24px;background:rgba(255,255,255,.55);backdrop-filter:blur(10px);border:1px solid var(--line);width:fit-content;margin:0 auto}
.dock img{width:72px;height:72px;border:0;background:none}.dock .sm{width:56px;height:56px;opacity:.5;border-radius:14px;background:#cfd8d3}
.menubar{display:flex;justify-content:flex-end;gap:14px;align-items:center;height:30px;padding:0 14px;border-radius:10px;font-size:12px;font-weight:600}
.menubar.l{background:#ececec;color:#222}.menubar.d{background:#232323;color:#eee}.menubar.d img{filter:invert(1)}
.menubar img{width:16px;height:16px;border:0;background:none;border-radius:0}
.nicons{display:flex;gap:16px;align-items:flex-end;background:#1f2a24;padding:18px;border-radius:14px}
.nicons img{border:0;background:none;border-radius:0}
/* OG */
.og img{aspect-ratio:1200/630;object-fit:cover}
.mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}
.ind figcaption{font-size:12px}
/* Email */
.mail{max-width:680px;margin:0 auto;background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.mail .bar{padding:12px 18px;border-bottom:1px solid var(--line);font-size:13px;color:var(--muted)}
.mail .bar b{color:var(--text)}
.mail .body{background:#f3f6f4;padding:24px}
.mail .inner{max-width:600px;margin:0 auto;background:#fff;color:#1d2a22;border-radius:6px;overflow:hidden}
.mail .inner img{border:0;border-radius:0}
.mail .inner .txt{padding:22px 24px;font-size:14px}
.mail .sig{padding:16px 24px 22px;border-top:1px solid #eef1ef}
/* Print */
.desk{background:linear-gradient(135deg,#d9cbb6,#c9b89f);border-radius:22px;padding:40px 20px;display:flex;flex-wrap:wrap;gap:30px;justify-content:center;align-items:center}
.bc{width:min(100%,350px);aspect-ratio:3.5/2;border-radius:8px;overflow:hidden;box-shadow:0 18px 30px -12px rgba(40,25,0,.45)}
.bc img{border:0;border-radius:0}
.bc.f{transform:rotate(-4deg)}.bc.b{transform:rotate(3deg) translateY(10px)}
.paper{box-shadow:0 16px 30px -14px rgba(40,25,0,.5);border-radius:3px;overflow:hidden;background:#fff}
.paper img{border:0;border-radius:0}
.glass{background:linear-gradient(160deg,#cfe3ea,#9fc2cf);border-radius:22px;padding:40px;display:grid;place-items:center}
.glass img{width:min(100%,260px);border-radius:26px;border:0;box-shadow:0 10px 24px -8px rgba(0,0,0,.35)}
.receipt{width:300px;margin:0 auto;background:#fff;padding:18px 16px 26px;box-shadow:0 14px 28px -14px rgba(0,0,0,.4);font:12px/1.6 ui-monospace,Menlo,monospace;color:#111;clip-path:polygon(0 0,100% 0,100% 98%,95% 100%,90% 98%,85% 100%,80% 98%,75% 100%,70% 98%,65% 100%,60% 98%,55% 100%,50% 98%,45% 100%,40% 98%,35% 100%,30% 98%,25% 100%,20% 98%,15% 100%,10% 98%,5% 100%,0 98%)}
.receipt img{border:0;border-radius:0;background:none}
.receipt .row{display:flex;justify-content:space-between}.receipt hr{border:0;border-top:1px dashed #111;margin:8px 0}
/* Colours */
.sw{border-radius:16px;overflow:hidden;border:1px solid var(--line);background:var(--surface)}
.sw div{height:84px}.sw p{margin:0;padding:10px 12px;font-size:12.5px}.sw b{display:block;font-size:13.5px}
.type{font-weight:800;letter-spacing:-.03em;font-size:clamp(28px,4vw,44px);line-height:1.05;margin:0}
footer{padding:64px 0 48px;color:var(--muted);font-size:13px}
@media (max-width:640px){.store{grid-template-columns:1fr}.screen{height:560px}}
</style>
</head>
<body>
<header class="top">
  <svg class="rings" viewBox="0 0 720 720" aria-hidden="true">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${360 - 80 - i * 40} 360A${80 + i * 40} ${80 + i * 40} 0 0 0 ${360 + 80 + i * 40} 360" fill="none" stroke="${C.greenLight}" stroke-width="2" opacity="${(0.9 - i * 0.1).toFixed(2)}"/>`).join('')}</svg>
  <div class="wrap">
    <button class="theme" type="button" onclick="(function(){var r=document.documentElement;var d=r.getAttribute('data-theme')==='dark'||(!r.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches);r.setAttribute('data-theme',d?'light':'dark')})()">Light / dark</button>
    <img class="logo" src="logo/svg/nafaa-logo-dark.svg" alt="Nafaa">
    <h1>Brand kit, in context</h1>
    <p>Every asset in <code style="color:#b9cdbf">brand/</code> built from the Noon logo: WhatsApp, social profiles, app stores, desktop, web, email and print. Sizes and upload steps are in ASSET-INDEX.md and BRAND-GUIDELINES.md.</p>
    <nav class="toc">${['whatsapp', 'social', 'stores', 'desktop', 'web', 'email', 'print', 'colour'].map((s) => `<a href="#${s}">${s[0].toUpperCase() + s.slice(1)}</a>`).join('')}</nav>
  </div>
</header>

<section id="whatsapp"><div class="wrap">
  <span class="eyebrow">WhatsApp Business</span>
  <h2>WhatsApp</h2>
  <p class="lead">Profile photo in the chat header and on the business profile, the greeting card and link preview in a chat, the sticker, and the status set.</p>
  <div class="grid g2" style="align-items:center">
    <div class="phone"><div class="screen">
      <div class="wa-head">${img('whatsapp/profile-640.png', 'Nafaa profile photo')}<div><b>Nafaa</b><small>Business account</small></div></div>
      <div class="wa-body">
        <div class="bub me">Assalam-o-Alaikum, Nafaa ke baare me maloomat chahiye.<time>10:41</time></div>
        <div class="bub">${img('whatsapp/greeting-1080.png', 'Greeting card', 'g')}Wa Alaikum Assalam! 1, 2 ya 3 likh kar bhejein.<time>10:41</time></div>
        <div class="bub me">1<time>10:42</time></div>
        <div class="bub"><div class="lp">${img('og/og-default.png', 'Link preview')}<div><b>Nafaa: POS, stock aur khata</b>nafaa.pk</div></div>https://nafaa.pk/demo<time>10:42</time></div>
        ${img('whatsapp/sticker-512.webp', 'Sticker', 'stk')}
      </div>
      <div class="wa-input"><div></div><i></i></div>
    </div></div>
    <div class="grid" style="gap:24px">
      <div class="bizprof"><div class="cov">${img('whatsapp/cover-1600x900.png', 'Cover photo')}</div><div class="av">${img('whatsapp/profile-640.png', 'Profile photo')}</div><h4>Nafaa</h4><p>POS, stock aur khata software<br>nafaa.pk · ${esc(COPY.phone)}</p></div>
      <div style="max-width:240px;margin:0 auto">${fig('guides/whatsapp-profile-guide.png', 'Circle crop check')}</div>
    </div>
  </div>
  <h3 style="margin:36px 0 12px">Status templates</h3>
  <div class="stories">${['welcome', 'new-feature', 'offer', 'download-app', 'blank'].map((s) => fig(`whatsapp/status-${s}.png`, s)).join('')}</div>
  <div class="grid g4" style="margin-top:20px">${fig('whatsapp/greeting-1080.png', 'Greeting')}${fig('whatsapp/away-1080.png', 'Away')}${fig('whatsapp/catalog-1080.png', 'Catalog')}${fig('whatsapp/sticker-512.webp', 'Sticker', 'checker')}</div>
</div></section>

<section id="social"><div class="wrap">
  <span class="eyebrow">Social</span>
  <h2>Social profiles and covers</h2>
  <p class="lead">Each mock crops the image the way the platform does, with the profile picture in its real position.</p>
  <div class="grid g2">
    <div class="card fb"><h3>Facebook page</h3><p>Cover 1640 x 624, profile 720.</p><div class="cover">${img('social/facebook/cover-1640x624.png', 'Facebook cover')}</div><div class="meta">${img('social/facebook/profile-720.png', 'Facebook profile')}<div><b>Nafaa</b><small>Software company · nafaa.pk</small></div></div>${fig('guides/facebook-cover-guide.png', 'Safe zones')}</div>
    <div class="card ig"><h3>Instagram</h3><p>Profile 1080, posts 1080 x 1350 (grid crops to 3:4), story 1080 x 1920.</p><div class="headrow">${img('social/instagram/profile-1080.png', 'Instagram profile')}<div><b>nafaa.pk</b><small>POS, stock aur khata software</small><small>Dukaan ka pura hisaab, ek app me.</small></div></div><div class="gridp">${img('social/instagram/post-1080x1350.png', 'Post')}${img('social/instagram/story-1080x1920.png', 'Story')}${img('whatsapp/status-download-app.png', 'Download app')}${img('whatsapp/status-offer.png', 'Offer')}${img('whatsapp/status-new-feature.png', 'Feature')}${img('whatsapp/status-welcome.png', 'Welcome')}</div></div>
    <div class="card yt"><h3>YouTube</h3><p>Banner as desktop shows it (the 2560 x 423 band), channel picture and a thumbnail.</p><div class="band">${img('social/youtube/banner-2560x1440.png', 'YouTube banner')}</div><div class="chan">${img('social/youtube/profile-800.png', 'YouTube profile')}<div><b>Nafaa</b><br><small style="color:var(--muted)">@nafaa · Guides for shop owners</small></div></div>${fig('social/youtube/thumbnail-1280x720.png', 'Thumbnail')}</div>
    <div class="grid" style="gap:20px">
      <div class="card xh"><h3>X</h3><p>Header 1500 x 500, profile 400.</p><div style="position:relative"><div class="hd">${img('social/x/header-1500x500.png', 'X header')}</div><div class="pp">${img('social/x/profile-400.png', 'X profile')}</div></div><div class="sp"></div></div>
      <div class="card li"><h3>LinkedIn</h3><p>Company cover 1128 x 191, logo 400.</p><div class="cv">${img('social/linkedin/cover-1128x191.png', 'LinkedIn cover')}</div><div class="lg">${img('social/linkedin/profile-400.png', 'LinkedIn logo')}</div></div>
      <div class="card"><h3>TikTok</h3><p>Profile 200.</p><div style="display:flex;gap:14px;align-items:center"><img src="social/tiktok/profile-200.png" alt="TikTok profile" style="width:80px;height:80px;border-radius:50%;border:0"><div><b>@nafaa.pk</b><br><small style="color:var(--muted)">Dukaan ka pura hisaab</small></div></div></div>
    </div>
  </div>
</div></section>

<section id="stores"><div class="wrap">
  <span class="eyebrow">App stores</span>
  <h2>Store listing</h2>
  <p class="lead">How the icon and feature graphic read on a listing page. Store screenshots are not part of this set; take them from the real app.</p>
  <div class="grid g2">
    <div class="card"><div class="store"><div class="ic">${img('app-store/play-icon-512.png', 'Play icon')}</div><div><b>Nafaa POS</b><small>Nafaa · Business</small><br><span class="btn">Install</span></div></div><div class="feat">${img('app-store/play-feature-1024x500.png', 'Feature graphic')}</div></div>
    <div class="mini">${fig('app-store/app-icon-1024.png', 'App Store icon')}${fig('app-store/splash-1242x2688.png', 'iPhone splash')}${fig('app-store/splash-2048x2732.png', 'iPad splash')}</div>
  </div>
</div></section>

<section id="desktop"><div class="wrap">
  <span class="eyebrow">Desktop</span>
  <h2>Desktop and notifications</h2>
  <p class="lead">The macOS icon in a dock, the template tray icon on light and dark menu bars, and the Android notification icons at their real pixel sizes.</p>
  <div class="grid g2">
    <div class="card"><div class="dock"><span class="sm"></span><span class="sm"></span>${img('desktop/macos-icon-1024.png', 'macOS icon')}<span class="sm"></span></div>
      <div style="display:grid;gap:10px;margin-top:20px"><div class="menubar l"><span>Wi-Fi</span>${img('desktop/tray/trayTemplate@2x.png', 'Tray icon')}<span>10:42</span></div><div class="menubar d"><span>Wi-Fi</span>${img('desktop/tray/trayTemplate@2x.png', 'Tray icon')}<span>10:42</span></div></div></div>
    <div class="card"><h3>Android notification icon</h3><p>96, 72, 48, 36 and 24 px, white on transparent.</p><div class="nicons">${[96, 72, 48, 36, 24].map((s) => `<img src="app-store/notification/ic_stat_nafaa-${s}.png" width="${s}" height="${s}" alt="${s} px">`).join('')}</div></div>
  </div>
</div></section>

<section id="web"><div class="wrap">
  <span class="eyebrow">Web</span>
  <h2>Share (OG) images</h2>
  <p class="lead">1200 x 630, all under 300 KB so WhatsApp shows the large preview. Industry cards use each pack's colour, darkened until white text passes 4.5:1.</p>
  <div class="grid g3 og">${ogSections.map((s) => fig(`og/og-${s}.png`, s)).join('')}</div>
  <h3 style="margin:36px 0 12px">Industries (${industries.length})</h3>
  <div class="grid g4 og ind">${industries.map((i) => fig(`og/industry/og-${i.id}.png`, i.name)).join('')}</div>
</div></section>

<section id="email"><div class="wrap">
  <span class="eyebrow">Email</span>
  <h2>Email header and signature</h2>
  <p class="lead">The 600 px header (2x file) at the top of a message and the signature image at the bottom. The HTML signature is in email/email-signature.html.</p>
  <div class="mail"><div class="bar"><b>Nafaa</b> &lt;info@nafaa.pk&gt; · Aap ka Nafaa account tayyar hai</div><div class="body"><div class="inner">${img('email/email-header-600x200@2x.png', 'Email header')}<div class="txt"><p><b>Assalam-o-Alaikum!</b></p><p>Aap ka Nafaa account tayyar hai. Pehla bill banane ke liye app kholein aur "Naya bill" dabayein.</p></div><div class="sig">${img('email/email-signature-600x150@2x.png', 'Email signature')}</div></div></div></div>
</div></section>

<section id="print"><div class="wrap">
  <span class="eyebrow">Print</span>
  <h2>Print</h2>
  <p class="lead">Business card, letterhead and flyer on a desk, the counter sticker on a shop window, and the thermal receipt with the Nafaa header and footer line.</p>
  <div class="desk"><div class="bc f">${img('print/business-card-front.png', 'Card front')}</div><div class="bc b">${img('print/business-card-back.png', 'Card back')}</div></div>
  <div class="grid g3" style="margin-top:20px">
    <div class="desk" style="padding:28px"><div class="paper" style="width:min(100%,260px)">${img('print/letterhead-a4.png', 'Letterhead')}</div></div>
    <div class="desk" style="padding:28px"><div class="paper" style="width:min(100%,260px)">${img('print/flyer-a5.png', 'Flyer')}</div></div>
    <div class="glass">${img('print/counter-sticker-100mm.png', 'Counter sticker')}</div>
  </div>
  <div class="grid g2" style="margin-top:20px;align-items:start">
    <div class="receipt">${img('print/receipt-header-80mm.png', 'Receipt header')}<hr><div class="row"><span>Doodh 1L x2</span><span>460</span></div><div class="row"><span>Anday 1 darjan</span><span>390</span></div><div class="row"><span>Chai patti 450g</span><span>720</span></div><div class="row"><span>Cheeni 1kg x2</span><span>320</span></div><hr><div class="row"><b>TOTAL</b><b>Rs 1,890</b></div><div style="text-align:center;margin:6px 0">Shukriya! Phir tashreef laiye.</div>${img('print/receipt-footer-80mm.png', 'Receipt footer')}</div>
    <div class="grid g2">${fig('print/business-card-front.png', 'Front')}${fig('print/business-card-back.png', 'Back')}${fig('print/flyer-a5-blank.png', 'Flyer template')}${fig('print/receipt-header-58mm.png', '58 mm header')}</div>
  </div>
</div></section>

<section id="colour"><div class="wrap">
  <span class="eyebrow">Foundations</span>
  <h2>Colour and type</h2>
  <p class="lead">Green does the work; amber is the spark. Inter for English and Roman Urdu, Noto Nastaliq Urdu for Urdu script.</p>
  <div class="grid g6">${[['Brand green', C.green, '22, 163, 74'], ['Green dark', C.greenDark, '21, 128, 61'], ['Green light', C.greenLight, '34, 197, 94'], ['Amber', C.amber, '245, 158, 11'], ['Amber light', C.amberLight, '251, 191, 36'], ['Ink', C.ink, '5, 46, 22'], ['Paper', C.paper, '248, 250, 252'], ['Mint', C.green50, '240, 253, 244']].map(([n, h, rgb]) => `<div class="sw"><div style="background:${h}"></div><p><b>${n}</b>${h} · ${rgb}</p></div>`).join('')}</div>
  <div class="card" style="margin-top:20px"><p class="type">Dukaan ka pura hisaab, ek app me.</p><p style="margin:10px 0 0;color:var(--muted)">Inter 800, -0.03 em. Body in Inter 500. Labels in capitals at +0.12 em.</p></div>
</div></section>

<footer><div class="wrap">Generated by <code>node brand/source/build-assets.cjs</code> · ${manifest.length} files · ${new Date().toISOString().slice(0, 10)}</div></footer>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, 'preview.html'), html);
};
