/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_MARKETPLACE_API_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_MARKETPLACE_WS_URL: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_GA_ID: string;
  readonly VITE_FB_PIXEL_ID: string;
  readonly VITE_MIXPANEL_TOKEN: string;
  readonly VITE_ENABLE_AI_ASSISTANT: string;
  readonly VITE_ENABLE_VOICE_SEARCH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
