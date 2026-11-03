# Translations (mobile)

Same model as the web (`apps/web/src/core/i18n/README.md`): three languages,
source-text keys, per-area catalogs.

| id | Language | Direction |
| --- | --- | --- |
| `en` | English (default for new accounts) | LTR |
| `ur` | Urdu (Noto Naskh Arabic, taller lines) | **RTL** |
| `roman` | Roman Urdu (source language of the keys) | LTR |

```tsx
import { t, Trans, msg } from '@/core/i18n';

t('Naya product')
t('{{count}} products save ho gaye', { count })        // plural entries: { "one": "…", "other": "…" }
<Text><Trans text="Pehle {{shop}} chunein" values={{ shop: <Text weight="bold">{name}</Text> }} /></Text>
const LABEL = msg('Pending');  …  {t(LABEL)}             // mark now, translate where shown
```

- `t` is a plain function. The language is read synchronously at start
  (`preference.ts`, device store) and a change reloads the JS app (`sync.ts`
  → `changeLanguage()`), so `t()` works everywhere, also at module level. Still
  prefer `msg()` for module-level labels.
- **Areas.** `scripts/i18n/babel-area-plugin.js` binds `t`/`Trans` in each
  file to its area (`scripts/i18n/areas.js`: `src/modules/<m>` → `<m>`,
  `src/core|design` → `core`, `app/` → `shell`).
  Lookup: area → global → (Urdu) English → the key.
- **Catalogs** live in `catalog/<locale>/<area>.json` and belong to the app.
  `i18n:sync` fills them from the code and copies the web translation of every
  identical key, so the web's work is reused.
  At run time they load lazily: an area file is read the first time a text
  from that area is shown, and the global answer for a key is worked out on
  first use (`catalog/index.ts`), so startup does not build every table.
- **Server messages**: the API client translates `messageKey/params` or known
  `message` text in the `api` area (`serverMessage.ts`), like the web.

## Where the language comes from

`User.language` on the server is the source of truth (existing users were set
to `roman`; new sign-ups get the language chosen on the sign-up screen, English
by default). The device copy decides the first frame. After login the server
value wins; a choice made while signed out is saved to the account at the next
login. People updating from the 1.x app start in their account language (or
Roman Urdu). Switchers: `components/LanguagePicker.tsx` (`LanguageCards` in
Settings → Language, `LanguageSwitch` on login, sign-up, onboarding and the
profile menu).

## Right to left

Urdu turns on the native RTL layout (`I18nManager.forceRTL`, then a reload;
`ensureDirection()` at boot fixes a mismatch once). Rules for screens:
`start/end` instead of `left/right`, `flip` on direction icons, `<Text ltr>` /
`<Amount>` for numbers, phones, codes. `Text` aligns to the start edge.

## Commands (from the repo root)

```
pnpm --filter @nafaa/mobile i18n:sync            # add new keys, prefill from web catalogs (--prune drops unused)
pnpm --filter @nafaa/mobile i18n:check           # missing en/ur, placeholder mismatches, duplicates (--strict for CI, --area <a>)
pnpm --filter @nafaa/mobile i18n:import work.json   # fill translations: { "key": ["English", "Urdu"] }
```

Words: plain English for buttons and titles (New, Save, Products). Roman Urdu
is simple; business words stay English (Sale, Discount, Profit, Cost, Expense).

`legacy/` holds the dotted-key strings of screens not rebuilt yet
(`useTranslation()`); delete it when the last old screen is gone.
