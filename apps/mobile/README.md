# Nafaa mobile (2.0)

Expo 54 · React Native 0.81 (new architecture) · expo-router · Reanimated 4.
Styling is plain React Native styles from the design kit (no NativeWind).
The web app (`apps/web`) is the reference for flows, wording, permissions and
industry behaviour. Plan: `~/nafaa-backups/wip/mobile-plan.md`.

## Folder map

```
app/                      routes only (thin files that export a module or industry screen)
  _layout.tsx             providers, boot, auth routing, opening animation
  +native-intent.tsx      maps incoming web paths (nafaa:// and https://nafaa.pk/…) to app routes
  (auth)/                 login, register, forgot-password, reset-password, google-complete
  (tabs)/                 index (Home), pos, sales, products, customers (hidden), more
  (industries)/<id>/      one folder per industry pack (agri … toystore); URLs stay /<id>/…
  (distribution)/         booker, delivery, van, distribution (manager), network; URLs stay /booker/…
  onboarding.tsx, verify-email.tsx, change-password.tsx
  <area>/                 everything else, one folder per module area (products, customers, settings …)
src/
  design/                 design kit, theme, templates, brand (intro) — see src/design/README.md
  core/
    api/                  axios client (tokens, branch header, envelope unwrap, refresh, translations,
                          addRequestHook), errors.ts (friendly messages)
    auth/                 store (secure tokens, branch rules), api, biometric lock, useShops, types
    i18n/                 t / Trans / msg, catalogs, language sync, RTL — see its README
    net/                  online status, useSyncStatus() (filled by the offline engine)
    offline/              offline engine — see its README
    permissions/          same keys as web + <Can>, usePermission
    format/               Rs money, numbers, dates in Asia/Karachi
    query/                React Query client (mutation error toasts)
    storage/kv.ts         synchronous device store (expo-sqlite kv)
    device/               haptic() that follows Appearance, crash-reporting (Firebase when present)
    hardware/scanner/     <Scanner /> camera barcode reader (fullscreen or inline) for every module
    receipt/              the one receipt engine (+ registerReceiptIndustry for industry rows)
    security/             manager PIN flow
    boot.ts, events.ts, toast.ts, business-models.ts
  modules/<area>/         one folder per web module: api/, screens/, components/, hooks/, lib/
    shell/                tabs + side rail, top bar, More menu, Create sheet, branch / workspace /
                          profile / sync sheets, navigation registry (nav-config.ts), role map
    distribution/         manager screens + booker/, delivery/, van/ (offline field cores) and lib/
                          (pricing, schemes, credit, logistics)
    app-control/          admin remote control (flags, announcements, force update)
  industries/             industry packs — see src/industries/README.md
scripts/i18n/             babel area plugin, sync, check, import
```

## Adding a screen

1. Read the matching web module.
2. Build it in `src/modules/<area>/screens/` from a template in `@/design`
   (list, detail, form, settings).
3. Export it from a thin route file in `app/`.
4. Add or update its entry in `src/modules/shell/navigation/nav-config.ts`
   (`href`), so More, search and Create find it.
5. `pnpm --filter @nafaa/mobile i18n:sync`, translate, `i18n:check`.
6. Delete the old screen it replaces.

## Run

```
pnpm install                                   # repo root
(start the API as usual; it listens on :4000)
cd apps/mobile
npx expo run:ios --device "iPhone 17 Pro"      # first time / after native changes (dev client)
npx expo start --dev-client                    # later: Metro only
```

`.env.development.local` (git-ignored) points the dev app at the local API:
`EXPO_PUBLIC_API_URL=http://localhost:4000/api`.
