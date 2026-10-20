# Screenshot capture

Takes real screenshots of the Nafaa web app (demo shops only) for the marketing
site, and uploads them to the CMS media library when asked. ARCH 4.6.

## Run

From `apps/site`, with the web app running (`pnpm --filter @nafaa/web dev` from the repo root, http://localhost:5173) and the local API on :4000:

```sh
node scripts/capture/capture.mjs --validate     # manifest check only
node scripts/capture/capture.mjs                # dry run: capture to out/, no upload
node scripts/capture/capture.mjs --public       # only shots that need no sign-in
node scripts/capture/capture.mjs --only=grocery-pos,grocery-khata
open scripts/capture/out/index.html             # review images against alt text
```

Signed-in shots need one demo account per industry, given through the env vars
named in the manifest (`CAPTURE_GROCERY_EMAIL`, `CAPTURE_GROCERY_PASSWORD`, ...).
The script refuses any tenant whose name, slug or email does not match
`CAPTURE_DEMO_PATTERN` (default `demo`), so real shops never reach the site.
Signing in goes through `POST /auth/login`, which can send the account a
"new device" email.

Playwright: `playwright` or `playwright-core` in apps/site devDependencies, or
`CAPTURE_PLAYWRIGHT=/path/to/node_modules/playwright-core`. With
`playwright-core` the installed Chrome is used (`CAPTURE_CHANNEL=chrome`).
Node 22.18+ is needed (the CMS contract is imported as TypeScript).

## Upload

```sh
CMS_ADMIN_TOKEN=<apps/admin access token> node scripts/capture/capture.mjs --upload
```

- Uploads `kind=SCREENSHOT` with the manifest's alt, caption and tags through
  `POST /admin/marketing/cms/media`. A checksum match (409) is reported as a duplicate.
- A shot with `mediaId` is sent to `POST /media/:id/replace`, which keeps the id,
  so pages update with no edits. After a first upload, copy the printed ids into
  the manifest.
- Only shots with `"reviewed": true` are uploaded (someone checked the alt text
  against the image), unless `--include-unreviewed` is passed.
- Any API other than localhost is refused unless `--allow-remote` is passed
  (`CMS_API_URL` sets the target; it defaults to the manifest's `apiUrl`).

## Manifest format (`manifest.json`)

```jsonc
{
  "version": 1,
  "defaults": { "baseUrl", "apiUrl", "device": "desktop", "locale": "en", "waitMs": 800, "hide": ["css selector"] },
  "accounts": { "<key>": { "industry": "bakery", "emailEnv": "CAPTURE_BAKERY_EMAIL", "passwordEnv": "CAPTURE_BAKERY_PASSWORD" } },
  "shots": [{
    "id": "bakery-production",          // file name and stable key: a-z, 0-9, hyphens
    "account": "bakery",                // null for public pages (login, sign-up)
    "path": "/bakery/production",       // app route; "{param}" needs "resolve"
    "resolve": { "api": "/sales", "param": "id" },  // optional: first item id from an app API list
    "device": "desktop",                // desktop 1440x900 | laptop 1280x800 | tablet 820x1180 | phone 412x915, all at 2x
    "frame": "browser",                 // frame the site should use: browser | phone | tablet | desktop | receipt | none
    "alt": "…",                         // required, 5-250 characters, describes what the image shows
    "caption": "…",                     // optional, up to 300 characters
    "tags": ["industry:bakery", "feature:inventory"],  // feature:<product slug> required
    "reviewed": false,                  // true once the alt text was checked against the captured image
    "mediaId": null,                    // set after the first upload
    "locale": "en",                     // app language: en | ur
    "waitFor": "css selector",          // optional: wait for this before capturing
    "waitGone": "css selector",         // optional: wait for this (a loader) to disappear
    "actions": [{ "click": "sel" }, { "fill": ["sel", "text"] }, { "press": "Enter" }, { "hover": "sel" }, { "scroll": "sel" }, { "waitFor": "sel" }, { "wait": 500 }],
    "hide": ["css selector"],           // added to defaults.hide (visibility: hidden)
    "clip": "css selector",             // capture only this element
    "fullPage": false,
    "clock": "2026-10-15T14:30:00+05:00" // optional fixed page clock
  }]
}
```

Industry tag keys are the site's industry slugs (`kiryana`, `bakery`, `pharmacy`,
`restaurant`, `mobile-shop`, `garments`); feature keys are product slugs (`pos`,
`inventory`, `khata`, `billing`, `fbr`, `reports`, ...).

Output (`out/`, git-ignored): one PNG per shot, `results.json` (size, SHA-1,
status, upload result) and `index.html` for review.
