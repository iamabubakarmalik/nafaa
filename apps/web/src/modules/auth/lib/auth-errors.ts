/**
 * Turns auth API errors into short Roman Urdu messages for the sign-in,
 * sign-up and password screens. The API keeps its own wording; only the
 * text shown to the user changes here.
 */

interface ApiError {
  response?: { status?: number; data?: { message?: unknown }; headers?: Record<string, unknown> };
  message?: string;
}

/** Known server messages, matched case-insensitively by substring. */
const KNOWN: Array<[RegExp, string]> = [
  [/invalid email or password/i, 'Email ya password sahi nahi hai. Dobara check karein.'],
  [/google se bana hai|continue with google/i, 'Ye account Google se bana hai. "Google se login" dabayein, ya password reset karke naya password bana lein.'],
  [/email already registered/i, 'Is email se pehle hi account bana hua hai. Login karein ya password reset kar lein.'],
  [/phone already (registered|in use)/i, 'Ye mobile number pehle se kisi account me hai. Doosra number likhein ya khaali chhor dein.'],
  [/invalid referral code/i, 'Referral code sahi nahi hai. Check karein ya khaali chhor dein.'],
  [/invalid phone number/i, 'Mobile number sahi nahi. Misaal: 03001234567'],
  [/invalid ya expired otp/i, 'Code ghalat hai ya purana ho gaya. Dobara likhein ya naya code mangwa lein.'],
  [/invalid ya expired token/i, 'Ye link purana ho gaya hai ya pehle use ho chuka. Naya link mangwa lein.'],
  [/token expired ya invalid/i, 'Google wala session khatam ho gaya. Google se dobara try karein.'],
  [/shop ka naam/i, 'Dukaan ka naam likhein (kam se kam 2 huroof).'],
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

export function authErrorMessage(err: unknown, fallback = 'Kuch ghalat ho gaya. Dobara koshish karein.'): string {
  const e = err as ApiError;
  const status = e?.response?.status;

  if (!e?.response) return 'Server tak nahi pohanch sake. Internet check karke dobara koshish karein.';
  if (status === 429) {
    const s = retryAfterSeconds(e) ?? RATE_LIMIT_SECONDS;
    return `Bohat zyada koshishen ho gayin. ${s} second ruk kar dobara try karein.`;
  }

  const raw = rawMessage(e);
  const wait = raw?.match(/wait\s+(\d+)\s*s/i);
  if (wait) return `Code abhi bheja gaya hai. ${wait[1]} second baad naya code mangwa sakte hain.`;
  if (raw) {
    const known = KNOWN.find(([re]) => re.test(raw));
    if (known) return known[1];
  }
  if (status && status >= 500) return 'Server me masla aa gaya. Thori der baad dobara try karein.';
  return raw || fallback;
}
