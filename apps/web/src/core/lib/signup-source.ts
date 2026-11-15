/**
 * Where a new shop came from, for the admin panel's merchant journey.
 *
 * captureSignupSource() runs once at start-up and keeps, for this browser,
 * the first visit's utm_* tags, the first touch carried from nafaa.pk
 * (ft_*), the nafaa.pk call-to-action id (cta), a referral code (ref), the
 * referring page and the landing path. A later visit that brings campaign
 * tags replaces a stored visit without any.
 *
 * reportSignupSource() sends it once right after a new shop is created and
 * then forgets it. Both are best effort and never block sign-up.
 */

import { apiClient } from '@core/api/client';

const KEY = 'nafaa_signup_source';
const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;

interface StoredSource {
  at: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  ftSource?: string;
  ftMedium?: string;
  ftCampaign?: string;
  ftTerm?: string;
  ftContent?: string;
  cta?: string;
  referralCode?: string;
  referrer?: string;
  landingPage?: string;
}

const PARAMS: Array<[keyof StoredSource, string]> = [
  ['utmSource', 'utm_source'], ['utmMedium', 'utm_medium'], ['utmCampaign', 'utm_campaign'], ['utmTerm', 'utm_term'], ['utmContent', 'utm_content'],
  ['ftSource', 'ft_source'], ['ftMedium', 'ft_medium'], ['ftCampaign', 'ft_campaign'], ['ftTerm', 'ft_term'], ['ftContent', 'ft_content'],
  ['cta', 'cta'], ['referralCode', 'ref'],
];

function read(): StoredSource | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredSource) : null;
    return parsed && typeof parsed.at === 'number' && Date.now() - parsed.at < MAX_AGE_MS ? parsed : null;
  } catch {
    return null;
  }
}

const hasCampaign = (s: StoredSource | null) => !!(s?.utmSource || s?.ftSource);

export function captureSignupSource(): void {
  if (typeof window === 'undefined') return;
  try {
    const q = new URLSearchParams(window.location.search);
    const next: StoredSource = { at: Date.now() };
    for (const [field, param] of PARAMS) {
      const value = q.get(param)?.trim().slice(0, 150);
      if (value) (next as unknown as Record<string, string>)[field] = value;
    }
    const ref = document.referrer;
    if (ref && !ref.startsWith(window.location.origin)) next.referrer = ref.slice(0, 500);
    next.landingPage = window.location.pathname.slice(0, 300);

    const current = read();
    if (current && (hasCampaign(current) || !hasCampaign(next))) return;
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the API still records the signup platform.
  }
}

/** Sends the stored source for the shop that was just created (token of the new owner). */
export function reportSignupSource(accessToken: string | undefined): void {
  const source = read();
  if (!source || !accessToken) return;
  const { at: _at, ...body } = source;
  apiClient
    .post('/journey/signup-source', body, { headers: { Authorization: `Bearer ${accessToken}` } })
    .then(() => { try { window.localStorage.removeItem(KEY); } catch { /* ignore */ } })
    .catch(() => { /* an older API without this endpoint, or offline: skip */ });
}
