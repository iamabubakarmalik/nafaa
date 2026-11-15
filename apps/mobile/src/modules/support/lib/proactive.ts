/**
 * Proactive team messages (a welcome, trial check-ins). GET /support/status
 * returns the newest unread team message as `latestUnread`, with
 * `proactive: true` for these; Home shows each one once as a small banner.
 * Seen ids are kept on the phone.
 */

import { kv } from '@/core/storage/kv';
import type { SupportStatusInfo } from '../api/support';

export interface ProactiveNudge {
  messageId: string;
  agentName: string | null;
  text: string;
}

export function readProactive(status: SupportStatusInfo | null): ProactiveNudge | null {
  const latest = status?.latestUnread;
  if (!latest?.proactive || !latest.message?.text) return null;
  const m = latest.message;
  return { messageId: m.id, agentName: m.meta?.senderName || m.senderName || null, text: m.text ?? '' };
}

const SEEN_KEY = 'nafaa.support.nudgesSeen';

export function nudgeSeen(id: string): boolean {
  return kv.get<string[]>(SEEN_KEY, []).includes(id);
}

export function markNudgeSeen(id: string) {
  const seen = kv.get<string[]>(SEEN_KEY, []);
  if (seen.includes(id)) return;
  kv.set(SEEN_KEY, [id, ...seen].slice(0, 30));
}

/** First line, trimmed for a one-line banner. */
export const firstLine = (text: string) => {
  const line = text.split('\n').find((l) => l.trim())?.trim() ?? '';
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
};
