# Releasing the Nafaa mobile app

How to get a change from this repo to users' phones. Everything is set up;
nobody needs to open Play Console or App Store Connect for a normal release.

## Accounts and credentials (already configured)

| What | Where | Notes |
|---|---|---|
| Expo / EAS project | `@abubakamalik/nafaa` (id `378f6d14-5716-469e-9275-0af06ec03668`) | `npx eas-cli@latest whoami` should print `abubakamalik` |
| Android signing | EAS remote keystore (upload key SHA-1 `09:A5:…:C3:F2`) | Play App Signing re-signs; its SHA-1 starts `21:74:…` |
| Play auto-submit | EAS "Google service account key for Expo Submit" (`eas-submit@nafaa-496000`) | 7 permissions on the Nafaa app in Play Console |
| Push (Android) | EAS FCM V1 key from Firebase project **nafaa-pos** | must match `google-services.json` |
| Push (iOS) | EAS APNs key | add when the Apple membership is active |
| Google sign-in | GCP project `109272166338`, Android OAuth client `…j3miqlc…` | Play signing SHA-1 + "Enable custom URI scheme" |
| iOS | App Store Connect app `6769007778`, team `A48F33D4Q8` | Apple Developer membership must be renewed by the account holder (Rashdan) before any iOS build or submit |

Never commit service-account JSON files, keystores or `.p8` keys.

## Which kind of release?

`runtimeVersion` follows the app version (`policy: appVersion`), so an update
only reaches binaries with the same `version` in `app.json`.

1. **JS-only change** (screens, logic, translations, styles): ship an **EAS Update**.
   No store review. Users get it on the next app start.
2. **Native change** (new native module or config plugin, permissions, app.json
   native fields, icons/splash, notification sounds, URL schemes, SDK upgrade):
   bump `version` in `app.json` (e.g. 2.0.1 → 2.0.2) and ship a **store build**.

Never import a native module that the live binary does not contain at module
load time; lazy-require it behind a platform/availability check, or the OTA
update will crash or blank screens.

## Before any release

```bash
cd apps/mobile && npx tsc --noEmit && pnpm i18n:check
```

If the API changed, deploy the API first (follow the deploy checklist in
memory: prod backup → push to main → wait for Railway migrations → compare
counts), so new app code never calls missing endpoints.

## 1) EAS Update (JS only)

```bash
cd apps/mobile
npx eas-cli@latest update --channel production --environment production \
  --message "short description" --non-interactive
```

Use `--channel preview` for the internal preview APK first when unsure.
Rollback: `npx eas-cli@latest update:republish` an earlier group, or
`update:rollback`.

## 2) Store build (native)

```bash
cd apps/mobile
# bump expo.version in app.json first (build numbers auto-increment remotely)
npx eas-cli@latest build -p android --profile production --non-interactive --no-wait --auto-submit
# iOS (only while the Apple membership is active):
npx eas-cli@latest build -p ios --profile production --non-interactive --no-wait --auto-submit
```

Android submits to the **production** track with `releaseStatus: completed`
(see `eas.json → submit.production.android`). Check status with
`npx eas-cli@latest build:list -p android --limit 2 --non-interactive`.

After a new binary is live, publish later JS fixes to the same channel; they
apply to the new version automatically.

## After release

- Admin → Mobile app → Overview / Devices: versions in use.
- Admin → Mobile app → Push → Delivery health: push errors.
- Admin → Releases & updates: set minimum version / force update when needed.
- Play Console → Android vitals: crash/ANR rate.
