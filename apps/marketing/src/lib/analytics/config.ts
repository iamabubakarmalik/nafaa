/**
 * Central analytics configuration
 * All tracking IDs in one place — env vars se controlled
 * Har platform ka enabled flag automatic based on env presence
 */

export const ANALYTICS = {
  // ─── Google ecosystem ───
  gtm: {
    id: process.env.NEXT_PUBLIC_GTM_ID || '',
    get enabled() { return !!this.id; },
  },
  ga4: {
    id: process.env.NEXT_PUBLIC_GA_ID || '',
    get enabled() { return !!this.id; },
  },
  googleAds: {
    id: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '',
    conversions: {
      signup: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_SIGNUP || '',
      lead: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_LEAD || '',
      demo: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_DEMO || '',
      purchase: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_PURCHASE || '',
    },
    get enabled() { return !!this.id; },
  },

  // ─── Meta (Facebook + Instagram) ───
  meta: {
    pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
    get enabled() { return !!this.pixelId; },
  },

  // ─── TikTok ───
  tiktok: {
    pixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '',
    get enabled() { return !!this.pixelId; },
  },

  // ─── LinkedIn ───
  linkedin: {
    partnerId: process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID || '',
    get enabled() { return !!this.partnerId; },
  },

  // ─── Microsoft Clarity ───
  clarity: {
    id: process.env.NEXT_PUBLIC_CLARITY_ID || '',
    get enabled() { return !!this.id; },
  },

  // ─── Snap ───
  snap: {
    pixelId: process.env.NEXT_PUBLIC_SNAP_PIXEL_ID || '',
    get enabled() { return !!this.pixelId; },
  },

  // ─── Pinterest ───
  pinterest: {
    tagId: process.env.NEXT_PUBLIC_PINTEREST_TAG_ID || '',
    get enabled() { return !!this.tagId; },
  },

  // ─── Hotjar (optional) ───
  hotjar: {
    id: process.env.NEXT_PUBLIC_HOTJAR_ID || '',
    get enabled() { return !!this.id; },
  },
} as const;

// Helper: log enabled platforms in dev
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const enabled = Object.entries(ANALYTICS)
    .filter(([_, v]: any) => v.enabled)
    .map(([k]) => k);
  console.log('[analytics] enabled:', enabled.length ? enabled : 'none');
}
