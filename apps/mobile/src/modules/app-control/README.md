# app-control

Remote control of the mobile app from the admin panel (Mobile app section):
update prompts, maintenance mode, feature switches, announcement banners,
mobile appearance defaults and device check-ins.

Server side: `apps/api/src/modules/mobile-control`.

## Endpoints used

| Call | When | Auth |
|---|---|---|
| `GET /mobile/config?platform=&version=` | start, every 10 min, on reconnect, when the heartbeat reports newer settings | optional; with a token, banners targeted at the business are included |
| `POST /mobile/heartbeat` | start, sign-in, back to foreground (max once per 2 min) | required |

## Wiring (root layout)

```tsx
import {
  configureAppControl, AppControlGate, useDeviceHeartbeat,
} from '@/modules/app-control';

configureAppControl({
  apiUrl: API_URL,                                  // same base as the API client, ends in /api
  getAccessToken: () => useAuthStore.getState().accessToken,
  getLanguage: () => i18n.language,                 // 'en' | 'ur' | 'roman'
  openLink: (link) => router.push(link),            // optional; http links open in the browser by default
});

function Shell() {
  const signedIn = useAuthStore((s) => !!s.accessToken);
  useDeviceHeartbeat({ enabled: signedIn, pushToken });   // pushToken optional, see below
  return <AppControlGate colors={{ accent: theme.accent }}><Stack /></AppControlGate>;
}
```

`AppControlGate` must sit inside the React Query provider. After sign-in or
sign-out call `refreshAppConfig(queryClient)` so business-targeted banners
update.

## API

- `useAppConfig()` → `{ config, isLoading, refresh, t }`. The last config is
  stored and used offline. `config` is undefined only on a first start without
  network; treat that as "everything on, no prompts".
- `useFeatureFlag(key)` → boolean. Missing config or unknown key = on.
  Keys: `module.*` (tabs/areas), `pos.*` (POS options), `feature.*` (kill
  switches such as `feature.offlineSales`, `feature.ai`,
  `feature.onlineOrders`). The full list is in the admin panel and in
  `apps/api/src/modules/mobile-control/mobile-config.schema.ts`.
- `<AppControlGate>` → maintenance screen, must-update screen (store button),
  or a closable "new version" sheet that comes back after the reminder time.
- `<AnnouncementBanner max={1} />` → top live banner(s) for this person;
  closing is remembered until the banner is edited.
- `useDeviceHeartbeat({ enabled, pushToken })` → device check-in. The install
  id is a uuid in the secure store. Pass the Expo push token from the
  notification setup; leave it undefined to let the module read it when
  permission is already granted (it never asks), or pass null when
  notifications are off.
- `config.appearance` is the platform appearance layer including the mobile
  fields (`mobileTabBar`, `mobileStartScreen`, `mobilePosGrid`,
  `mobileHomeWidgets`, `mobileAnimations`, `mobileHaptics`). Business and
  personal layers still come from `GET /appearance`, same as the web.

## Notes

- Texts arrive in en / ur / roman; `pickText` falls back to English.
- The few strings in this module ("Update now", "Later", "Try again",
  "Expected back", "What's new in") are English source text for the i18n
  catalog.
- Styling is plain React Native with overridable colors; swap in the design
  kit components once they exist.
- Build number comes from app config (expo-constants). If `expo-application`
  is added later, `device.ts` can read the native build instead.
