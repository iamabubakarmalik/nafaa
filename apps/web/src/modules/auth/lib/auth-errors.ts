/**
 * Turns auth API errors into short Roman Urdu messages for the sign-in,
 * sign-up and password screens. The API keeps its own wording; only the
 * text shown to the user changes here.
 */

import { t } from '@core/i18n';
interface ApiError {
  response?: { status?: number; data?: { message?: unknown }; headers?: Record<string, unknown> };
  message?: string;
}

/** Known server messages, matched case-insensitively by substring. */
const KNOWN: Array<[RegExp, string]> = [
  [/invalid email or password/i, t('Email ya password sahi nahi hai. Dobara check karein.')],
  [/google se bana hai|continue with google/i, t('Ye account Google se bana hai. "Google se login" dabayein, ya password reset karke naya password bana lein.')],
  [/email already registered/i, t('Is email se pehle hi account bana hua hai. Login karein ya password reset kar lein.')],
  [/phone already (registered|in use)/i, t('Ye mobile number pehle se kisi account me hai. Doosra number likhein ya khaali chhor dein.')],
  [/invalid referral code/i, t('Referral code sahi nahi hai. Check karein ya khaali chhor dein.')],
  [/invalid phone number/i, t('Mobile number sahi nahi. Misaal: 03001234567')],
  [/invalid ya expired otp/i, t('Code ghalat hai ya purana ho gaya. Dobara likhein ya naya code mangwa lein.')],
  [/invalid ya expired token/i, t('Ye link purana ho gaya hai ya pehle use ho chuka. Naya link mangwa lein.')],
  [/token expired ya invalid/i, t('Google wala session khatam ho gaya. Google se dobara try karein.')],
  [/shop ka naam/i, t('Dukaan ka naam likhein (kam se kam 2 huroof).')],
];

const RATE_LIMIT_SECONDS = 60;

function rawMessage(err: ApiError): string | undefined {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return typeof msg[0] === 'string' ? msg[0] : undefined;
  return typeof msg === 'string' ? msg : undefined;
}

/** Seconds the server asked us to wait, from a 429 or a "Please wait Ns" message. */
export function retryAfterSeconds(err: unknown): number | null {
  const e = err as ApiError;
  if (e?.response?.status === 429) {
    const header = Number(e.response.headers?.['retry-after']);
    return Number.isFinite(header) && header > 0 ? Math.ceil(header) : RATE_LIMIT_SECONDS;
  }
  const wait = rawMessage(e)?.match(/wait\s+(\d+)\s*s/i);
  return wait ? Number(wait[1]) : null;
}

export function authErrorMessage(err: unknown, fallback = t('Kuch ghalat ho gaya. Dobara koshish karein.')): string {
  const e = err as ApiError;
  const status = e?.response?.status;

  if (!e?.response) return t('Server tak nahi pohanch sake. Internet check karke dobara koshish karein.');
  if (status === 429) {
    const s = retryAfterSeconds(e) ?? RATE_LIMIT_SECONDS;
    return t('Bohat zyada koshishen ho gayin. {{s}} second ruk kar dobara try karein.', { s });
  }

  const raw = rawMessage(e);
  const wait = raw?.match(/wait\s+(\d+)\s*s/i);
  if (wait) return t('Code abhi bheja gaya hai. {{value}} second baad naya code mangwa sakte hain.', { value: wait[1] });
  if (raw) {
    const known = KNOWN.find(([re]) => re.test(raw));
    if (known) return known[1];
  }
  if (status && status >= 500) return t('Server me masla aa gaya. Thori der baad dobara try karein.');
  return raw || fallback;
}
