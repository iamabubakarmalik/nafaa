# Translations (core/i18n)

The web app speaks three languages:

| id      | Language                 | Script / direction | Notes                                   |
|---------|--------------------------|--------------------|-----------------------------------------|
| `en`    | English                  | Latin, LTR         | Default for new accounts                |
| `ur`    | Urdu                     | Urdu, **RTL**      | Falls back to English, then source text |
| `roman` | Roman Urdu               | Latin, LTR         | The source language of the code         |

All text is simple everyday words. Business words stay English in every
language (Sale, Discount, Profit, Cost, Expense); see
`scripts/i18n/TRANSLATION_GUIDE.md` for the full rules translators follow.

## How it works

**Source-text keys.** The text in the code is the key:

```tsx
import { t, Trans } from '@core/i18n';

<Button>{t('Naya product')}</Button>
toast.success(t('{{count}} products save ho gaye', { count }));
<Trans text="Pehle {{shop}} chunein" values={{ shop: <b>{name}</b> }} />
```

- `t(text, params?)` returns the text in the active language. `{{name}}`
  placeholders are filled from `params`. A catalog entry can be plural:
  `{ "one": "1 item", "other": "{{count}} items" }`, chosen by `params.count`.
- `<Trans>` is for sentences with React elements inside (bold names, links).
  Keep the whole sentence one key so translators can reorder it.
- `msg(text)` only marks text for extraction (it returns the text unchanged).
  Use it for values that are stored or compared and translated where shown:
  `const LABELS = [msg('Retail'), msg('Food')]` … `{t(item.category)}`.
- Lookup: active locale → English (Urdu only) → the key itself. Roman Urdu
  shows the key unless its catalog has a rewording.

**`t` is a plain function, not a hook.** `main.tsx` loads the active catalog
(`boot.ts`) before it imports the app (`bootstrap.tsx`), and changing the
language reloads the page. So `t()` works everywhere: components, hooks,
toasts, zod schemas and module-level config such as `nav-config.ts`, and it
never shows stale text. A language change is rare; a reload is the price.

**Catalogs** live in `catalog/<locale>/<area>.json`, flat `{ key: text }`,
sorted. One file per area and locale, so people converting different modules
never edit the same file. Each locale is one lazy chunk
(`catalog/<locale>/index.ts` merges its files); the app downloads only the
active locale (plus English for Urdu). An area is derived from the path
(`scripts/i18n/lib/files.mjs → areaOf`): `src/modules/<m>` → `<m>`,
`src/industries/<id>` → `industry-<id>`, `src/integrations/<x>` →
`integrations-<x>`, `src/app` → `shell`, `src/core` and `src/design-system` →
`core`, server messages → `api`.

**Missing text** in development: `t()` warns once in the console and lists
the keys in `window.__i18nMissing`. Production shows the fallback silently.

## Where the language comes from

- `User.language` on the server (`'en' | 'ur' | 'roman'`, nullable) is the
  source of truth. Migration `20261101100000_user_language` added it and set
  every existing user to `'roman'`, so nobody's screen changed on deploy.
  New sign-ups get English, or the language chosen on the sign-up page.
- A local copy (`localStorage['nafaa-language']`, `preference.ts`) decides the
  language before login and before the server answers. A device that was
  already signed in before languages existed starts in Roman Urdu.
- `sync.ts`: after login the server value wins (the page reloads into it). A
  choice made on the login page or while offline is saved to the account at
  the next login. A user with no server value gets the current one saved.
- Switchers (`components/LanguagePicker.tsx`): `LanguageCards` in
  Settings → Language & time, `LanguageSwitch` in the profile menu, on the
  login/sign-up pages and in onboarding. Both call `changeLanguage(locale)`
  (PATCH `/auth/me { language }`, then reload).
- The shop's own language (`TenantSettings.language`, Settings → Language &
  time → "Bill ki zaban") is separate: it is meant for bills, receipts and
  customer messages. See "Receipts" below.

## Fonts and direction

- `<html lang dir>` is set by `boot.ts` for the first paint and kept by the
  design-system `AppearanceProvider` (`theme/apply.ts`). Urdu gets
  `lang="ur" dir="rtl"`; Roman Urdu is `lang="ur-Latn"` so Urdu-script CSS
  never matches it.
- Urdu font: **Noto Naskh Arabic** by default, with the Latin font first in
  the stack (`--font-urdu-ui: 'Inter', 'Noto Naskh Arabic'`), so English
  words, digits and amounts keep Inter and Urdu script uses Naskh. Nastaliq
  (Noto Nastaliq Urdu, Gulzar) stays selectable in Settings → Appearance.
  Why Naskh: in screenshots of the POS, settings and dashboard, Nastaliq's
  tall stacked letters collided with neighbouring lines in dense rows,
  breadcrumbs and placeholders at the app's line heights, and its small
  x-height made 12–13px labels hard to read. Naskh stays clear at those sizes
  and needs only the taller body line height (1.9). Nastaliq reads well for
  large headings, but mixing two Urdu faces looked uneven, so it is an
  option, not the default.
- Digits stay Latin in every language. Amounts, phone numbers, emails and
  codes typed into fields run left to right (`tokens.css`), charts, `code`,
  `kbd` and `pre` are always LTR, and `.dir-ltr` isolates any element
  (barcodes, SKUs, IMEIs). Wrap a phone number shown in Urdu text in
  `<span className="dir-ltr">`.
- Layout uses logical Tailwind classes (`ms/me`, `ps/pe`, `start/end`,
  `text-start/end`, `rounded-s/e`, `border-s/e`); `pnpm i18n:rtl` converts old
  ones. Direction icons get `rtl-flip`. Anything that moves with
  `translate-x` (switch knobs, drawers) needs a `rtl:` counterpart or
  `isRtl()` (see `Switch.tsx`, `MobileSidebar.tsx`).

## Server messages (API)

The API keeps sending finished text in `message` (old clients and the mobile
apps keep working). The web client translates it in one place, the axios
interceptor in `core/api/client.ts`, so every `error.response.data.message`
already arrives in the user's language:

- Fixed messages need no server change: the text is the key, found in the
  `api` catalog.
- Messages with values use `apiMessage()` on the server
  (`apps/api/src/common/i18n/api-message.ts`):
  `throw new BadRequestException(apiMessage('Stock kam hai — {{item}}', { item }))`.
  The response gains `messageKey` and `params`; the global exception filter
  passes them through. Success responses can spread `...apiMessage(...)`.
- Add a server folder to `API_DIRS` in `scripts/i18n/lib/files.mjs` when you
  convert its messages; `i18n:extract` then collects them into the `api`
  area and lists template literals still to convert.
- Converted so far: `common/filters`, `modules/auth`, `modules/pos`,
  `modules/sales`.
- Not translated yet: notification titles/messages and activity-log lines
  stored in the database, server-provided catalog data (business types,
  industry names from the API). These need a `messageKey` column or a
  render-time `t()` on known values.

## Receipts and prints

Receipts must follow the **shop's** language (`TenantSettings.language`,
values `en | ur | roman_ur`), not the cashier's screen language: one shop
prints one kind of bill whoever is at the counter. The receipt engine
(`core/receipt`) is not converted yet. When it is: render with a translator
bound to the shop language (load that locale's catalog on demand, e.g. a
`translatorFor(locale)` built on `catalog/<locale>/index`), keep amounts,
dates and the Nafaa footer LTR, and use an Urdu font with ESC/POS raster
printing (text mode printers cannot print Urdu glyphs). Do not run
`i18n:wrap` on `core/receipt`, `core/print` or `core/hardware/receiptBytes.ts`
until that design exists, or bills would change with the cashier's language.

## Converting a module (checklist)

Work on one area at a time; pass `--area` everywhere so you only touch your
own catalog files. Commands run from `apps/web`.

1. **Wrap** (dry run first, then write):
   `pnpm i18n:wrap src/modules/<m> --verbose` → read the `+` (wrapped),
   `?` (left) and `~` (rich text) lists → `pnpm i18n:wrap src/modules/<m> --write`.
2. **Leftovers:** for files whose `?` list is all UI text (shortcut lists,
   option arrays, return values), run `pnpm i18n:wrap <file> --loose --write`.
   Leave data alone: seed lists, search keywords, values saved to the
   database, voice-command words, CSS. Convert `~` spots to `<Trans>`.
   Replace `'s'`/`''` plural suffixes with `{{count}}` keys.
3. **RTL:** `pnpm i18n:rtl src/modules/<m> --verbose` then `--write`; fix the
   reported `translate-x` and rotated-icon spots by hand.
4. **Typecheck:** `pnpm typecheck` (a non-string placeholder value, e.g. a
   React element or boolean, is a type error: move it to `<Trans>`).
5. **Extract:** `pnpm i18n:extract --area <m>` (adds keys; pre-fills keys
   another area already translated). `--prune` drops keys no longer used.
6. **Translate:** `pnpm i18n:todo --area <m> --out /tmp/<m>` writes work
   files; translate them per `scripts/i18n/TRANSLATION_GUIDE.md` into
   `out-N.json`; `pnpm i18n:validate todo-N.json out-N.json`; then
   `pnpm i18n:import /tmp/<m>/out-*.json --area <m>`.
7. **Check:** `pnpm i18n:check --area <m> --leftovers` must say OK with no
   unwrapped text you meant to translate.
8. **Look:** open the screens in all three languages (desktop and phone,
   Urdu in dark mode once): no clipped Urdu, no mirrored numbers, icons
   pointing the right way, nothing overflowing.

## Files

- `index.ts` – public API (`t`, `msg`, `Trans`, locales, `isRtl`).
- `runtime.ts` – lookup, interpolation, plurals, dev warnings.
- `boot.ts` – loads the catalog before the app; first-paint `lang`/`dir`.
- `preference.ts` – local copy of the choice. `sync.ts` – server sync and
  `changeLanguage()` (kept out of `index.ts`: it imports the API client).
- `locales.ts` – the three locales, names, samples, `normalizeLocale()`.
- `components/LanguagePicker.tsx` – the switchers.
- `catalog/` – translations. Edit with the scripts; hand edits are fine but
  keep keys exactly as in code.
- Tools: `apps/web/scripts/i18n/` (`wrap`, `rtl`, `extract`, `todo`,
  `validate`, `import`, `check`).
