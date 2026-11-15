/**
 * Live support state shared across the admin app: socket status, the team
 * presence, my own online / away state (with auto-away after idle time),
 * the conversation open on screen, and who is typing where.
 */

import { create } from 'zustand';
import type { SupportAgentRef, SupportPresenceEvent } from './support.types';

interface LiveStore {
  connected: boolean;
  /** My chosen state. Auto-away sets `autoAway` so activity can bring me back. */
  myState: 'online' | 'away';
  autoAway: boolean;
  team: SupportPresenceEvent['team'] | null;
  agents: SupportAgentRef[];
  /** Conversation open in the inbox, if the inbox is on screen. */
  openConversationId: string | null;
  /** conversationId → typing name (merchant side), cleared after a few seconds. */
  typing: Record<string, string | null>;
  set: (p: Partial<LiveStore>) => void;
  setTyping: (conversationId: string, name: string | null, on: boolean) => void;
}

const typingTimers = new Map<string, number>();

export const useSupportLive = create<LiveStore>((set, get) => ({
  connected: false,
  myState: 'online',
  autoAway: false,
  team: null,
  agents: [],
  openConversationId: null,
  typing: {},
  set: (p) => set(p),
  setTyping: (id, name, on) => {
    const t = typingTimers.get(id);
    if (t) window.clearTimeout(t);
    const next = { ...get().typing };
    if (on) {
      next[id] = name;
      typingTimers.set(id, window.setTimeout(() => get().setTyping(id, null, false), 6000));
    } else {
      delete next[id];
      typingTimers.delete(id);
    }
    set({ typing: next });
  },
}));

const MY_STATE_KEY = 'nafaa-admin-support-state';

export function savedMyState(): 'online' | 'away' {
  try {
    return localStorage.getItem(MY_STATE_KEY) === 'away' ? 'away' : 'online';
  } catch {
    return 'online';
  }
}

export function saveMyState(s: 'online' | 'away') {
  try {
    localStorage.setItem(MY_STATE_KEY, s);
  } catch {
    // Per-browser convenience only.
  }
}

/** "3m", "1h 20m" for SLA timers. */
export function waitText(since: string | null, now = Date.now()): string | null {
  if (!since) return null;
  const mins = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export const durationText = (sec: number | null | undefined) => {
  if (sec == null) return '—';
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.round(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
