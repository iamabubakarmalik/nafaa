# Nafaa brand guidelines

How to use the Nafaa logo, colours, type and voice, and where each file in `brand/` goes. The logo is concept **02 Noon**: the letter ن drawn as an open green bowl, an amber diamond for its dot, and the lowercase **nafaa** wordmark.

- Logo files and their technical notes: [`logo/README.md`](logo/README.md)
- Every asset with its size: [`ASSET-INDEX.md`](ASSET-INDEX.md)
- Everything shown in context: [`preview.html`](preview.html)

---

## 1. Logo

### Versions

| Version | File | Use on |
| --- | --- | --- |
| Horizontal logo (primary) | `logo/svg/nafaa-logo.svg` | White and light backgrounds. The default everywhere. |
| Horizontal logo, dark | `logo/svg/nafaa-logo-dark.svg` | Ink, black and dark photos. |
| Horizontal logo, reversed | `logo/svg/nafaa-logo-reversed.svg` | Brand green (`#16a34a`) only. |
| Mono black / mono white | `logo/svg/nafaa-logo-mono-black.svg`, `-mono-white.svg` | One-colour print: stamps, thermal receipts, engraving, fax, photos. |
| App icon (mark on tile) | `logo/svg/nafaa-icon.svg` | Square places: app icons, favicons, avatars, small sizes. |
| Mark alone | `logo/svg/nafaa-mark.svg`, `-mark-dark.svg` | When the name is already next to it, or as a stamp-like sign-off. |
| Wordmark alone | `logo/svg/nafaa-wordmark.svg`, `-wordmark-dark.svg` | Only when the mark is already nearby. |

### Clear space

The unit is **x**, the width of the amber diamond (about 28% of the horizontal logo's height).

- Keep at least **1x** empty on every side of the logo, the mark and the wordmark.
- Around the app icon tile, keep at least 1/8 of the tile's width.

### Minimum size

| Asset | Screen | Print |
| --- | --- | --- |
| Horizontal logo | 24 px tall | 8 mm tall |
| Wordmark alone | 16 px tall | 5 mm tall |
| Mark without tile | 16 px | 5 mm |
| App icon tile | 16 px | 6 mm |

Below these sizes, use the app icon.

### Do

- Use the light logo on light backgrounds, the dark logo on dark backgrounds, and the reversed logo or app icon on brand green.
- Scale with width and height locked.
- Put the logo on a calm, flat area. On a busy photo, use the app icon.
- Use mono black for thermal printers and rubber stamps.
- Write the name as **Nafaa** in sentences; the logo itself is always lowercase **nafaa**.

### Don't

- Don't redraw, retype or re-space the wordmark. It is outlined Inter Bold with fixed spacing.
- Don't recolour the mark, swap green and amber, or put the full-colour logo on green.
- Don't move, rotate or resize the diamond, and don't flip the bowl. It always opens upwards.
- Don't stretch, skew, rotate or add shadows, outlines, glows, gradients or 3D effects to the logo.
- Don't put the mark in a circle, badge or a tile with a different corner radius. The only container is the approved rounded tile (radius 114/512).
- Don't place the logo on another industry's accent colour. Industry colours are for panels and pills; the logo stays on white, ink or brand green.
- Don't use the old logo (the N with an up-right arrow). Its files have been deleted.

Shadows, gradients and patterns are fine **behind** the logo (backgrounds, cards); they are never applied **to** it.

---

## 2. Colour

| Name | Hex | RGB | CMYK (print build, approx.) | Use |
| --- | --- | --- | --- | --- |
| Brand green | `#16a34a` | 22, 163, 74 | 80, 5, 95, 0 | The bowl, the app icon tile, primary buttons, brand backgrounds. |
| Green dark | `#15803d` | 21, 128, 61 | 85, 20, 100, 10 | Green text on white (passes 4.5:1), gradients, pressed states. |
| Green light | `#22c55e` | 34, 197, 94 | 70, 0, 85, 0 | The bowl on dark backgrounds, highlights. |
| Amber | `#f59e0b` | 245, 158, 11 | 0, 40, 100, 0 | The diamond on light backgrounds; small accents. |
| Amber light | `#fbbf24` | 251, 191, 36 | 0, 25, 90, 0 | The diamond on green and dark; offer pills, call-to-action buttons on green. |
| Ink | `#052e16` | 5, 46, 22 | 85, 40, 85, 70 | Wordmark and headings on light backgrounds; dark backgrounds. |
| Paper | `#f8fafc` | 248, 250, 252 | 2, 1, 0, 0 | Wordmark on dark backgrounds; light page tint. |
| Mint | `#f0fdf4` / `#dcfce7` | 240, 253, 244 | 5, 0, 4, 0 | Soft panels, chips, card backgrounds. |
| Slate | `#475569` / `#64748b` | 71, 85, 105 | 30, 20, 0, 60 | Body text and captions. |

Rules:

- Green does the work; amber is a spark. Keep amber to about 5% of any layout: the diamond, one pill or one button.
- White text goes on brand green, green dark or ink. Ink text goes on amber. Never white text on amber.
- CMYK values are starting points for coated stock. Always ask the printer for a proof; screen green looks duller in print.
- Industry colours (from `apps/web/src/industries/*Pack.tsx`) are used only on that industry's cards, darkened automatically until white text on them passes 4.5:1.

---

## 3. Typography

| Script | Font | Weights | Notes |
| --- | --- | --- | --- |
| English and Roman Urdu | **Inter** | 800 headlines, 700 titles, 500-600 body and labels | Headlines tracked tight (-0.02 to -0.035 em); labels in capitals tracked wide (+0.08 to +0.12 em). |
| Urdu | **Noto Nastaliq Urdu** | Regular, Bold | Only for real Urdu script (e.g. the counter sticker line). Give it about 1.6x the line height of Inter. |

- In every generated image, text is converted to outlines, so files look the same on any computer.
- When fonts must be live (web, email, Word), use Inter with the fallback `Arial, Helvetica, sans-serif`.

---

## 4. Voice

- Speak like a helpful shopkeeper friend: short, warm and practical.
- Write in simple **Roman Urdu**. Keep business terms in English: Sale, Profit, Cost, Expense, Discount, Stock, Bill, Khata, Report. Never "chhoot".
- Say what the shop owner gets, not what the software is: "Bill banayein, stock dekhein aur khata rakhein."
- Only claim what is true today. Avoid user counts, approvals or awards unless the evidence is filed.
- Core lines used across the set:
  - **Dukaan ka pura hisaab, ek app me.** (tagline)
  - **Bill, stock aur khata. Internet ke baghair bhi.** (support line)
  - **7 din Free Trial** (offer)
  - **Apni dukaan ka hisaab asaan banayein** (receipt line, same as the POS receipt engine)

---

## 5. Graphic language

- **Diamond lattice:** a fine grid of small diamonds (the noon dot), 10-16% opacity, fading out from one corner.
- **Bowl rings:** concentric half-circles opening upwards (the bowl), thin strokes at 15-22% opacity.
- **Product cards:** code-drawn bill, sale, khata and barcode cards with soft shadows. These replace stock photos; use real screenshots only when they are framed the same way.
- **Backgrounds:** brand green (with a soft lighter glow top-left), ink (with a green glow), or white with a mint glow.
- No clip-art, emoji in artwork, or stock photos. Shop photos only when the owner supplies them with consent.

---

## 6. Where each asset goes

### WhatsApp Business (`whatsapp/`)

1. **Profile photo:** WhatsApp Business > Settings > Business tools > Business profile > tap the photo > choose `profile-640.png`. Don't zoom; the mark is already sized for the circle crop.
2. **Cover photo:** same screen > Cover photo > `cover-1600x900.png`. WhatsApp shows a wide band; the logo stays visible in any crop.
3. **Profile details:** Description: "POS, stock aur khata software. Bill, stock aur khata, internet ke baghair bhi." Website: `https://nafaa.pk`. Email: `info@nafaa.pk`. Category: Software / IT services.
4. **Catalog:** Business tools > Catalog > Add new item > image `catalog-1080.png`, name "Nafaa POS", link `https://nafaa.pk`.
5. **Greeting and away messages:** WhatsApp sends these as text only. Turn them on (Business tools > Greeting message / Away message) with short Roman Urdu text, then save `greeting-1080.png` and `away-1080.png` as **Quick replies** (Business tools > Quick replies > add, attach the image, shortcut `/salam` and `/baad`) and send them with one tap.
6. **Status:** post `status-welcome.png` first, then `status-new-feature.png`, `status-offer.png` and `status-download-app.png` as needed. For new posts, put text on `status-blank.png` between y 450 and y 1500 (the top 220 px and bottom 260 px sit under WhatsApp's own bars). Check that the platforms on the download status are live before posting.
7. **Sticker:** open any chat > sticker icon > Create (sticker maker) > pick `sticker-512.webp`. Publishing a sticker pack through a sticker app needs at least 3 stickers and `sticker-tray-96.png` as the tray icon.
8. **Link previews:** when someone shares a nafaa.pk link, WhatsApp shows the page's OG image (`og/`). Every OG file is under 300 KB, which WhatsApp needs to show the large preview.

### Facebook (`social/facebook/`)

1. Page > Edit > Profile picture > upload `profile-720.png`. Facebook shows it as a circle; leave the crop as it is.
2. Page > Edit cover photo > Upload photo > `cover-1640x624.png` > Save without dragging. The text is inside the mobile crop (centre 1110 x 470) and clear of the desktop profile picture (bottom-left). `guides/facebook-cover-guide.png` shows both zones.
3. Stories: use `social/instagram/story-1080x1920.png`.

### Instagram (`social/instagram/`)

1. Edit profile > Change profile photo > `profile-1080.png`.
2. Feed posts: 1080 x 1350 (4:5). `post-1080x1350.png` is ready; `post-blank-1080x1350.png` is the template. The profile grid crops posts to 3:4, so keep text away from the left and right 34 px.
3. Stories and Reels covers: `story-1080x1920.png`, or `story-blank-1080x1920.png` for your own text. Keep the top 250 px and bottom 280 px free.

### LinkedIn, X, YouTube, TikTok (`social/`)

| Platform | Profile | Cover / header | Notes |
| --- | --- | --- | --- |
| LinkedIn | `linkedin/profile-400.png` | `linkedin/cover-1128x191.png` | The logo sits over the cover's bottom-left; the left 280 px is kept clear. |
| X | `x/profile-400.png` | `x/header-1500x500.png` | The profile picture covers the lower-left; see `guides/x-header-guide.png`. |
| YouTube | `youtube/profile-800.png` | `youtube/banner-2560x1440.png` | Logo and text are inside the 1546 x 423 safe area (see `guides/youtube-banner-guide.png`); the side cards show on desktop and TV only. Thumbnails: `youtube/thumbnail-1280x720.png` (example) and `thumbnail-blank-1280x720.png`. Keep the bottom-right corner free for the duration badge. |
| TikTok | `tiktok/profile-200.png` | none | TikTok has no cover. |

### App stores and mobile (`app-store/`)

| Store / place | File | Spec |
| --- | --- | --- |
| Apple App Store icon | `app-icon-1024.png` | 1024 x 1024 PNG, no alpha, square corners (Apple rounds them). |
| Google Play hi-res icon | `play-icon-512.png` | 512 x 512 PNG, full bleed (Play applies its mask). |
| Google Play feature graphic | `play-feature-1024x500.png` | 1024 x 500, 24-bit PNG, no alpha. |
| Android notification icon | `notification/ic_stat_nafaa-*.png` | White silhouette on transparent: 24 (mdpi), 36 (hdpi), 48 (xhdpi), 72 (xxhdpi), 96 (xxxhdpi). Copy each into `res/drawable-<density>/ic_stat_nafaa.png`, or import `ic_stat_nafaa.svg` as a vector asset. In Expo, point `notification.icon` at the 96 px file. |
| Splash, iPhone | `splash-1242x2688.png` | Opaque, mark centred on `#16a34a`. In Expo, use it as `splash.image` with `backgroundColor: "#16a34a"`. |
| Splash, iPad | `splash-2048x2732.png` | Same design, iPad size. |
| Android adaptive icon | `logo/png/android-adaptive-foreground.png` + `-background.png` | 432 x 432 layers (in the logo kit). |
| Store screenshots | not included | Take them from the real app and frame them on brand green or white with the same card shadows. |

The mobile app keeps its own copies in `apps/mobile/assets/` (icon, splash, adaptive icon, notification icon). Copy files from here when you update them.

### Desktop app (`desktop/`)

- Windows: `nafaa.ico` (16 to 256) for the app and installer; `tray/tray.ico` for the system tray.
- macOS: `nafaa.icns` (built with iconutil from `macos-icon-1024.png`, which follows the Big Sur icon grid).
- Menu bar: `tray/trayTemplate.png` and `trayTemplate@2x.png` (16 pt). Name them `...Template` in Electron so macOS tints them for light and dark menu bars. `trayTemplate-32*.png` is the larger size; `tray-white-*.png` is for dark Windows/Linux taskbars.

### Web (`og/`, `email/`)

- `og/og-default.png` for the home page; `og/og-<section>.png` for pricing, industries, features, blog, developers and services; `og/industry/og-<id>.png` for each industry page. All are 1200 x 630 and under 300 KB. The new site also renders OG cards in code (`apps/site/src/lib/og`); these files are the static fallback and the set for posts and ads.
- Favicons and PWA icons are in the logo kit (`logo/png/`).
- Email: `email/email-header-600x200@2x.png` at `width="600"` in templates; `email/email-signature.html` for personal signatures (steps inside the file); `email/email-signature-600x150.png` as a one-image team signature.

### Print (`print/`)

| Item | Files | Spec |
| --- | --- | --- |
| Business card | `business-card.pdf`, `business-card-front.png`, `business-card-back.png` | 3.5 x 2 in. The PDF has 1/8 in bleed (3.75 x 2.25 in). Replace "Full Name" and "Designation" in `print()` of the build script and rebuild before printing. 350 gsm matt is a good stock. |
| Letterhead | `letterhead-a4.pdf`, `letterhead-a4.png` | A4. Write between y 560 and y 3150 of the PNG (about 47 mm from the top and 30 mm from the bottom). |
| Thermal receipt | `receipt-header-80mm.png`, `receipt-footer-80mm.png`, `-58mm` versions | Pure black and white at printer width (576 px for 80 mm, 384 px for 58 mm, 203 dpi). |
| Counter / window sticker | `counter-sticker-100mm.pdf`, `.png` | 100 x 100 mm, 2 mm bleed in the PDF. Print on vinyl; for inside a glass window, ask the printer for a reverse (mirror) print. |
| Flyer | `flyer-a5.pdf`, `flyer-a5.png`, `flyer-a5-blank.png` | A5 (148 x 210 mm). The QR code opens nafaa.pk. |

---

## 7. Changing or adding assets

All files except the logo kit come from one script. Change the copy in `COPY`, or the layout in the matching function, then run:

```sh
node brand/source/build-assets.cjs
```

This rebuilds every asset, `ASSET-INDEX.md` and `source/manifest.json`. New industries in `apps/web/src/industries/` get their OG card automatically. Don't edit the PNGs by hand.
