/**
 * Turns any API error into one short sentence for the user, in their
 * language. Server text is already translated by the client; this adds the
 * cases the server cannot describe (no internet, timeouts, server down).
 */

import { t } from '@/core/i18n';

interface ApiErrorLike {
  response?: { status?: number; data?: { message?: unknown }; headers?: Record<string, unknown> };
  code?: string;
  message?: string;
}

export function serverMessage(err: unknown): string | undefined {
  const msg = (err as ApiErrorLike)?.response?.data?.message;
  if (Array.isArray(msg)) return typeof msg[0] === 'string' ? msg[0] : undefined;
  return typeof msg === 'string' ? msg : undefined;
}

export const statusOf = (err: unknown): number | undefined => (err as ApiErrorLike)?.response?.status;

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
  if (status === 403) return serverMessage(err) || t('Is kaam ki ijazat nahi hai.');
  if (status === 402) return serverMessage(err) || t('Aap ka plan khatam ho gaya hai.');
  const raw = serverMessage(err);
  if (status >= 500) return t('Server me masla aa gaya. Thori der baad dobara try karein.');
  return raw || fallback;
}
