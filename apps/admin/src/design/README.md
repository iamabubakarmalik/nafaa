# Design bridge

The admin panel has no design system of its own. It uses the merchant app's
(`apps/web/src/design-system`) directly, so both apps share one set of tokens,
components, dark-mode rules and page frame (PageShell, PageHero, KpiCard…).

```
design/
  ds-entry.ts            What '@/design-system' means in admin: the web index minus
                         AppearanceProvider and the /appearance API (merchant only)
  theme.ts               useAdminTheme(): applies the shared appearance store; admin accent
  i18n-bridge.ts         Stands in for '@core/i18n' (admin is English-only)
  ds-en.json             English text for the keys the shared files use
  settings-api-bridge.ts Stands in for the merchant settings API (never called here)
```

How the wiring works (vite.config.ts and tsconfig paths, kept in step):

| Import in shared web code | Resolves to in admin |
|---|---|
| `@/design-system` | `src/design/ds-entry.ts` |
| `@/design-system/*` | `apps/web/src/design-system/*` |
| `@web-shell/*` | `apps/web/src/app/shell/*` (only `ui/` and `useSidebarState`) |
| `@core/i18n` | `src/design/i18n-bridge.ts` |
| `@core/lib/cn` | `src/lib/cn.ts` |
| `@core/lib/shortcuts`, `dateRange`, `business-day`, `@core/components/PageGuide` | the web files |

Tailwind extends `apps/web/tailwind.config.js` (see `tailwind.config.js`), and
`src/index.css` imports the web token stylesheets.

## When the web design system changes

- A shared file that starts importing another web module needs an alias here,
  or `pnpm --filter @nafaa/admin build` fails. Run the admin build after
  design-system changes.
- New text in shared components: run `node scripts/sync-ds-text.mjs`.
