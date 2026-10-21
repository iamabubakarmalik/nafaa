# Nafaa Meta ads

Facebook and Instagram ad creatives built from real Nafaa screens (local demo shops, demo data entered through the API).

**Status:** Kiryana / retail is ready for review. Other industries are on hold until retail is approved. Their demo shops and draft screens exist in `source/screens/`.

## Files

| Path | What |
| --- | --- |
| `preview.html` | Open in a browser to see every creative with its copy, a feed mockup and a Story mockup. |
| `ADS-GUIDE.md` | Copy, targeting, placements, budget, A/B plan, WhatsApp quick replies and policy notes. |
| `CREDITS.md` | Sources and licences. |
| `kiryana/` | 24 images: concepts a, b and c in 4:5, 9:16, 1:1 and 1.91:1, each in Roman Urdu and Urdu (`-urdu-`), plus the Reels cover. |
| `kiryana/carousel/` | 5 carousel cards, 1080x1080, upload in order. |
| `manifest.json` | List of built files with sizes (read by `preview.html`). |
| `source/` | Build script, templates, copy and the screenshots. |

File names: `<industry>-<a|b|c>-<concept>[-urdu]-<width>x<height>.png`.

- a: problem to solution (khata)
- b: dashboard showcase (today's sale)
- c: feature trio (bill, stock, khata)

## Rebuild

```sh
node brand/ads/source/build.cjs                 # everything
node brand/ads/source/build.cjs --only=kiryana  # one industry
```

Needs Google Chrome and `playwright-core` (install it, or set `NAFAA_PLAYWRIGHT=/path/to/node_modules/playwright-core`). Copy lives in `source/data.cjs` (image text) and `source/copy.cjs` (ad text).
