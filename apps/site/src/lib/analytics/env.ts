/**
 * Third-party analytics ids from the environment.
 *
 * The names are the ones apps/marketing used on Vercel, so the existing
 * project variables keep GA4, GTM, Clarity, Search Console and the ad pixels
 * working after the switch. Site settings `analytics` (CMS) win where they
 * set the same id. Each value is checked against the id's format; a bad or
 * empty value is ignored, so nothing unexpected reaches a script URL.
 *
 * NEXT_PUBLIC_* values are inlined at build time: change them on Vercel and
 * redeploy.
 */

export interface AdsConversions {
  signup?: string;
  lead?: string;
  demo?: string;
  purchase?: string;
}

export interface ThirdPartyIds {
  gtmId?: string;
  gaId?: string;
  clarityId?: string;
  adsId?: string;
  adsConversions: AdsConversions;
  metaPixelId?: string;
  tiktokPixelId?: string;
  linkedinPartnerId?: string;
  hotjarId?: string;
}

function pick(value: string | undefined, pattern: RegExp): string | undefined {
  const v = value?.trim();
  return v && pattern.test(v) ? v : undefined;
}

const LABEL = /^[A-Za-z0-9_-]{1,64}$/;

/** Ids from NEXT_PUBLIC_* (literal names so Next inlines them). */
export function thirdPartyIdsFromEnv(): ThirdPartyIds {
  return {
    gtmId: pick(process.env.NEXT_PUBLIC_GTM_ID, /^GTM-[A-Z0-9]{4,12}$/),
    gaId: pick(process.env.NEXT_PUBLIC_GA_ID, /^G-[A-Z0-9]{4,16}$/),
    clarityId: pick(process.env.NEXT_PUBLIC_CLARITY_ID, /^[a-z0-9]{6,20}$/),
    adsId: pick(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID, /^AW-[0-9]{6,14}$/),
    adsConversions: {
      signup: pick(process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_SIGNUP, LABEL),
      lead: pick(process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_LEAD, LABEL),
      demo: pick(process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_DEMO, LABEL),
      purchase: pick(process.env.NEXT_PUBLIC_GOOGLE_ADS_CONV_PURCHASE, LABEL),
    },
    metaPixelId: pick(process.env.NEXT_PUBLIC_META_PIXEL_ID, /^[0-9]{6,20}$/),
    tiktokPixelId: pick(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID, /^[A-Z0-9]{10,30}$/i),
    linkedinPartnerId: pick(process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID, /^[0-9]{3,12}$/),
    hotjarId: pick(process.env.NEXT_PUBLIC_HOTJAR_ID, /^[0-9]{4,12}$/),
  };
}

/** Search Console HTML-tag verification token (NEXT_PUBLIC_GOOGLE_VERIFICATION). */
export function googleVerification(): string | undefined {
  return pick(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION, /^[A-Za-z0-9_-]{10,100}$/);
}

/** Bing Webmaster Tools verification token (NEXT_PUBLIC_BING_VERIFICATION). */
export function bingVerification(): string | undefined {
  return pick(process.env.NEXT_PUBLIC_BING_VERIFICATION, /^[A-Za-z0-9_-]{8,100}$/);
}

/** WhatsApp number from NEXT_PUBLIC_WHATSAPP ("+92 324 ..."), digits with country code. */
export function whatsappFromEnv(): { number: string; message: string } | null {
  const digits = (process.env.NEXT_PUBLIC_WHATSAPP ?? '').replace(/\D/g, '').replace(/^0/, '92');
  return /^[1-9][0-9]{7,14}$/.test(digits) ? { number: digits, message: '' } : null;
}

/** True when any third-party script is configured (the consent banner shows only then). */
export function hasThirdParty(ids: ThirdPartyIds): boolean {
  return Boolean(ids.gtmId || ids.gaId || ids.adsId || ids.clarityId || ids.metaPixelId || ids.tiktokPixelId || ids.linkedinPartnerId || ids.hotjarId);
}
