/**
 * What to do with a server answer to a queued change, and the plain words
 * the Sync issues list shows for a change the server will not take.
 *
 * Retry later: no internet, timeouts, server trouble (5xx), rate limits and
 * "still running" (409 from the Idempotency-Key check). Real conflicts (4xx)
 * become issues the user can fix, retry or discard; nothing is dropped.
 */

import { HttpError, type IssueCode, type Translate } from './types';

export type Verdict =
  /** Server not reached: stop this run, try again when online. */
  | { kind: 'offline' }
  /** Signed out or plan ended: stop this run, keep everything. */
  | { kind: 'halt'; reason: 'session' | 'plan' }
  /** Try this change again later (backoff). */
  | { kind: 'retry'; afterMs?: number; throttled?: boolean }
  /** The server will not take it as it is. */
  | { kind: 'issue'; code: IssueCode; message: string | null };

export function serverText(body: unknown): string | null {
  const msg = (body as { message?: unknown } | null | undefined)?.message;
  if (Array.isArray(msg)) return msg.filter((m) => typeof m === 'string').join(', ') || null;
  return typeof msg === 'string' && msg.trim() ? msg : null;
}

/** Server error texts are Roman Urdu or English; these patterns cover both. */
const PATTERNS: Array<[IssueCode, RegExp]> = [
  ['pin', /\bPIN\b/i],
  ['stock', /stock|insufficient|kam hai|nahi bacha|bik chuka|out of stock/i],
  ['not_found', /not found|nahi mil|nahi mili|mojood nahi|maujood nahi|deleted|mita/i],
  ['duplicate', /already|pehle se|duplicate|exists|dobara/i],
  ['limit', /limit|had se|band hai|zaroori hai|\(Settings\)/i],
  ['permission', /permission|ijazat|not allowed|forbidden/i],
];

export function classify(err: unknown): Verdict {
  if (!(err instanceof HttpError)) {
    const e = err as { status?: number; message?: string } | null;
    if (e && typeof e.status === 'number') return classify(new HttpError(e.status, e.message ?? '', undefined));
    return { kind: 'offline' };
  }
  const s = err.status;
  if (s === 0) return { kind: 'offline' };
  if (s === 401) return { kind: 'halt', reason: 'session' };
  if (s === 402) return { kind: 'halt', reason: 'plan' };
  if (s === 409) {
    // 409 from the idempotency check means the first copy is still running.
    const text = serverText(err.body) ?? err.message;
    if (/chal raha|in progress/i.test(text)) return { kind: 'retry', afterMs: 3000 };
  }
  // Too many requests: wait and stop this run (the server limits each route per minute).
  if (s === 429) return { kind: 'retry', afterMs: 15_000, throttled: true };
  if (s === 408 || s === 425 || s >= 500) return { kind: 'retry' };
  const message = serverText(err.body) ?? (err.message || null);
  const text = message ?? '';
  let code: IssueCode = s === 404 ? 'not_found' : s === 403 ? 'permission' : 'invalid';
  for (const [c, re] of PATTERNS) {
    if (re.test(text)) {
      code = c;
      break;
    }
  }
  if (s === 403 && code !== 'pin' && code !== 'limit') code = 'permission';
  return { kind: 'issue', code, message };
}

/** Backoff for retries: 5 s, 10 s, 20 s ... up to 10 minutes, with a little jitter. */
export function backoffMs(attempts: number): number {
  const base = Math.min(10 * 60_000, 5_000 * 2 ** Math.max(0, attempts - 1));
  return Math.round(base * (0.85 + Math.random() * 0.3));
}

/** After this many server-error retries a change is shown as an issue (it still can be retried). */
export const MAX_SERVER_RETRIES = 8;

export function explainIssue(code: IssueCode, t: Translate): string {
  switch (code) {
    case 'stock':
      return t('The server does not have enough stock for this. Check the stock, then try again or remove the item.');
    case 'not_found':
      return t('Something this change uses was deleted, maybe on another phone or computer.');
    case 'permission':
      return t('Your account is not allowed to do this. Ask the owner to give permission, or remove it.');
    case 'pin':
      return t('This needs the owner\'s or manager\'s PIN. Enter the PIN and try again.');
    case 'limit':
      return t('A shop rule stopped this, like the credit limit, the discount limit or a setting.');
    case 'duplicate':
      return t('This is already saved on the server.');
    case 'waiting':
      return t('This waits for an earlier change that could not be saved. Fix that one first.');
    case 'invalid':
      return t('The server did not accept this entry. Check it and try again.');
    default:
      return t('This could not be saved yet. Try again in a little while.');
  }
}
