# Nafaa logo

This folder is the single source for the Nafaa logo. The approved design is concept **02 Noon**: the letter ن drawn as an open green bowl, with an amber diamond (the dot of the noon) above it, and the lowercase **nafaa** wordmark set in Inter Bold and outlined to paths.

Use the files in this folder. Do not redraw the mark, retype the wordmark or export new artwork from older files.

## Files

### SVG (`svg/`)

All SVGs are paths only. They contain no fonts, text, gradients or filters.

| File | Use |
| --- | --- |
| `nafaa-icon.svg` | App icon: the mark on the green rounded tile (512 grid, corner radius 114). Use it for favicons and anywhere the logo has to sit in a square. |
| `nafaa-mark.svg` | Mark without the tile, for light backgrounds. |
| `nafaa-mark-dark.svg` | Mark without the tile, for dark backgrounds. |
| `nafaa-logo.svg` | Horizontal logo (mark and wordmark), for light backgrounds. This is the primary logo. |
| `nafaa-logo-dark.svg` | Horizontal logo for dark backgrounds. |
| `nafaa-logo-reversed.svg` | Horizontal logo for brand green (`#16a34a`) backgrounds. It uses the app icon's colours: white bowl, amber diamond, white wordmark. |
| `nafaa-logo-mono-black.svg` | One-colour logo in black, for single-colour print, stamps, fax and engraving. |
| `nafaa-logo-mono-white.svg` | One-colour logo in white, for photos and dark single-colour printing. |
| `nafaa-wordmark.svg` | The wordmark alone, for light backgrounds. Use it only when the mark already appears nearby. |
| `nafaa-wordmark-dark.svg` | The wordmark alone, for dark backgrounds. |

### PNG (`png/`)

| File | Size | Notes |
| --- | --- | --- |
| `favicon-16.png`, `favicon-32.png`, `favicon-48.png` | 16, 32, 48 | Rounded tile with transparent corners. |
| `favicon.ico` | 16 + 32 + 48 | Multi-size ICO containing PNG entries. |
| `apple-touch-icon.png` | 180 | Full-bleed square and opaque, because iOS rounds the corners itself. |
| `icon-192.png`, `icon-512.png` | 192, 512 | Rounded tile for PWA manifests (`purpose: any`). |
| `icon-maskable-512.png` | 512 | Full-bleed square for `purpose: maskable`. The mark extends at most 147 px from the centre, which is inside the 205 px safe zone. |
| `app-icon-1024.png` | 1024 | App Store and Play Store master. Full-bleed and opaque, with no rounded corners. |
| `android-adaptive-foreground.png` | 432 | Adaptive icon foreground layer (108 dp at xxxhdpi), transparent. The mark has the same proportions as on the app icon and sits well inside the 66 dp safe circle. |
| `android-adaptive-background.png` | 432 | Adaptive icon background layer, solid `#16a34a`. |
| `og-default.png` | 1200 x 630 | Default social sharing image: the reversed logo centred on brand green. |
| `social-avatar-400.png` | 400 | Profile picture for social accounts. It is full-bleed, so the whole mark survives a circular crop. |

## Colours

These are the only colours used in the logo files.

| Name | Hex | Where |
| --- | --- | --- |
| Brand green | `#16a34a` | The bowl on light backgrounds; the app icon tile. |
| Green light | `#22c55e` | The bowl on dark backgrounds. |
| Amber | `#f59e0b` | The diamond on light backgrounds. |
| Amber light | `#fbbf24` | The diamond on dark backgrounds and on the green tile. |
| Ink | `#052e16` | The wordmark on light backgrounds. |
| Paper | `#f8fafc` | The wordmark on dark backgrounds. |
| White | `#ffffff` | The bowl on the tile; the reversed and mono-white logos. |
| Black | `#000000` | The mono-black logo. |

## Clear space

The unit of measurement is the width of the amber diamond, called **x**. In the horizontal logo, x is about 28% of the logo's height. On a 40 px tall logo, x is about 11 px.

- Keep at least **1x** clear on all four sides of the horizontal logo, the wordmark and the bare mark. Nothing else (text, other logos, the edge of the screen or the page) should sit in that space.
- The app icon tile carries its own clear space. Outside it, keep at least 1/8 of the tile's width clear.

## Minimum size

| Asset | Digital | Print |
| --- | --- | --- |
| Horizontal logo | 24 px tall (about 75 px wide) | 8 mm tall |
| Wordmark alone | 16 px tall | 5 mm tall |
| Mark without tile | 16 px | 5 mm |
| App icon (tile) | 16 px (favicon) | 6 mm |

Below these sizes, use the app icon instead of the horizontal logo.

## Do

- Use the light logo on white or light backgrounds and the dark logo on dark backgrounds.
- Use the reversed logo or the app icon on brand green.
- Use the mono logos when only one colour can be printed.
- Scale the logo proportionally, with the width and height locked together.
- Put the logo on a flat, calm area of a photo, or use the app icon instead.
- Pair the logo with Inter for English text and Noto Nastaliq Urdu for Urdu text.

## Don't

- Don't redraw, retype or re-space the wordmark. It is outlined Inter Bold with fixed tracking.
- Don't change the colours or swap the green and the amber.
- Don't move, resize or rotate the diamond relative to the bowl.
- Don't stretch, skew, rotate or flip the logo. The bowl opens upwards.
- Don't add shadows, outlines, gradients, glows or 3D effects.
- Don't put the full-colour logo on green, on busy photos or on low-contrast backgrounds.
- Don't put the mark in a container other than the approved tile, such as a circle, a badge or a tile with a different corner radius.
- Don't use the wordmark with a capital N in the logo. In running text, the name is written "Nafaa".
- Don't use the old logo (the N with an up-right arrow). Its files have been deleted; see "The rest of the brand folder" below.

## Source and rebuilding

- `source/concept-02-noon/` contains the approved concept files exactly as the owner chose them in round 1.
- `source/_generator/` contains the scripts that drew all the concepts (`marks.cjs`, `gen.cjs` and others). They are kept for history. Their output paths still point at the deleted `brand/logo-concepts/` folder.
- `source/build.cjs` builds everything in `svg/` and `png/`. It reads the geometry from `source/concept-02-noon/`, so the shapes always stay the approved ones. To rebuild, run this from the repo root:

```sh
node brand/logo/source/build.cjs
```

## The rest of the brand folder

The old logo files (the N with an up-right arrow) were deleted from `brand/` on 20 Oct 2026; git history still has them. Everything else in `brand/` is now built from this kit by `brand/source/build-assets.cjs`:

- `brand/BRAND-GUIDELINES.md`: logo, colour, type and voice rules, plus upload guides for WhatsApp, social profiles and the app stores.
- `brand/ASSET-INDEX.md`: every generated file with its size and where it goes.
- `brand/preview.html`: all assets shown in context, for review.
