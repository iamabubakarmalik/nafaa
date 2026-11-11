/**
 * Turns any API error into one short sentence for the user, in their
 * language. Server text is already translated by the client; this adds the
 * cases the server cannot describe (no internet, timeouts, server down).
 */

import { t } from '@/core/i18n';
import { PLAN_FEATURE_TEXT, PLAN_INACTIVE_TEXT, canPurchaseInApp } from '../platform/purchases';

interface ApiErrorLike {
  response?: { status?: number; data?: { message?: unknown; code?: unknown }; headers?: Record<string, unknown> };
  code?: string;
  message?: string;
}

export function serverMessage(err: unknown): string | undefined {
  const msg = (err as ApiErrorLike)?.response?.data?.message;
  if (Array.isArray(msg)) return typeof msg[0] === 'string' ? msg[0] : undefined;
  return typeof msg === 'string' ? msg : undefined;
}

export const statusOf = (err: unknown): number | undefined => (err as ApiErrorLike)?.response?.status;

/** The API's machine code for plan answers (ADDON_REQUIRED, PLAN_LIMIT, TRIAL_EXPIRED…). */
export const codeOf = (err: unknown): string | undefined => {
  const c = (err as ApiErrorLike)?.response?.data?.code;
  return typeof c === 'string' ? c : undefined;
};

/** A locked feature or a full limit: the shop keeps working, only this change needs a bigger plan or an add-on. */
export const isPlanUpsell = (code: string | undefined) => code === 'ADDON_REQUIRED' || code === 'PLAN_FEATURE_REQUIRED' || code === 'PLAN_LIMIT';

export function isNetworkError(err: unknown): boolean {
  const e = err as ApiErrorLike;
  return !!e && !e.response && (e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED' || /network|timeout/i.test(e.message ?? ''));
}

export function apiErrorMessage(err: unknown, fallback = t('Kuch ghalat ho gaya. Dobara koshish karein.')): string {
  const e = err as ApiErrorLike;
  if (!e?.response) {
    if (e?.code === 'ECONNABORTED') return t('Server jawab nahi de raha. Thori der baad dobara try karein.');
    return t('Server tak nahi pohanch sake. Internet check karke dobara koshish karein.');
  }
  const status = e.response.status ?? 0;
  if (status === 429) return t('Bohat zyada koshishen ho gayin. Thora ruk kar dobara try karein.');
  // Add-ons and plan limits are bought on the web ("Mera plan"); iOS stays neutral (App Store rule).
  if (isPlanUpsell(codeOf(err))) {
    if (!canPurchaseInApp()) return t(PLAN_FEATURE_TEXT);
    return codeOf(err) === 'PLAN_LIMIT'
      ? t('Plan ki had poori ho gayi — web par "Mera plan" me plan barhayein ya add-on jodein.')
      : t('Ye add-on/plan feature hai — web par "Mera plan" me jodein.');
  }
  if (status === 403) return serverMessage(err) || t('Is kaam ki ijazat nahi hai.');
  // iOS: the server's "renew / take a plan" wording is not shown (App Store rule).
  if (status === 402) return canPurchaseInApp() ? serverMessage(err) || t('Aap ka plan khatam ho gaya hai.') : t(PLAN_INACTIVE_TEXT);
  const raw = serverMessage(err);
  if (status >= 500) return t('Server me masla aa gaya. Thori der baad dobara try karein.');
  return raw || fallback;
}
