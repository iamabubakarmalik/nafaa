/**
 * Live support rules that need no database: status changes, who may see and
 * do what, round-robin assignment, the send rate limit, working hours,
 * settings and attachment checks. Covered by support.logic.spec.ts.
 */

import { tzParts } from '../../common/helpers/business-time.helper';
import {
  SUPPORT_ALLOWED_MIME,
  SUPPORT_LIMITS,
  SUPPORT_PRIORITIES,
  SUPPORT_PROACTIVE_KEYS,
  SUPPORT_STATUSES,
  type SupportAttachment,
  type SupportLocalized,
  type SupportMessageKind,
  type SupportMessageVersion,
  type SupportPriority,
  type SupportProactiveKey,
  type SupportProactiveSettings,
  type SupportSettings,
  type SupportStatus,
} from './support.types';
import { DEFAULT_AWAY, DEFAULT_WELCOME } from './support.copy';
import { PROACTIVE_DEFAULTS } from './support.proactive-copy';

export const SUPPORT_TZ = 'Asia/Karachi';

export const isSupportStatus = (v: unknown): v is SupportStatus =>
  typeof v === 'string' && (SUPPORT_STATUSES as readonly string[]).includes(v);

export const isSupportPriority = (v: unknown): v is SupportPriority =>
  typeof v === 'string' && (SUPPORT_PRIORITIES as readonly string[]).includes(v);

/* ───────────────────────── status transitions ───────────────────────── */

/** The team owes a reply in these states (SLA timer runs). */
export const NEEDS_REPLY: SupportStatus[] = ['WAITING', 'OPEN'];
/** States the merchant can still write into. CLOSED starts a new conversation. */
export const ACTIVE_STATUSES: SupportStatus[] = ['BOT', 'WAITING', 'OPEN', 'PENDING_MERCHANT', 'RESOLVED'];

export interface MerchantMessageContext {
  /** Nafaa AI answers first (setting on). */
  aiEnabled: boolean;
  /** A team member has replied in this conversation before. */
  humanInvolved: boolean;
}

/**
 * Status after the merchant writes.
 * - BOT stays BOT while the AI is on; with the AI off it goes to the team (WAITING).
 * - PENDING_MERCHANT → OPEN (the team owes a reply now).
 * - RESOLVED → OPEN when a person handled it before, otherwise back to BOT/WAITING.
 * - CLOSED is never written into (the service starts a new conversation); kept as-is here.
 */
export function statusAfterMerchantMessage(from: SupportStatus, ctx: MerchantMessageContext): SupportStatus {
  switch (from) {
    case 'BOT':
      return ctx.aiEnabled ? 'BOT' : 'WAITING';
    case 'WAITING':
    case 'OPEN':
      return from;
    case 'PENDING_MERCHANT':
      return 'OPEN';
    case 'RESOLVED':
      if (ctx.humanInvolved) return 'OPEN';
      return ctx.aiEnabled ? 'BOT' : 'WAITING';
    case 'CLOSED':
      return 'CLOSED';
  }
}

/** Status after a team member writes. Internal notes change nothing. */
export function statusAfterAdminMessage(from: SupportStatus, internal: boolean): SupportStatus {
  if (internal) return from;
  if (from === 'CLOSED') return 'CLOSED';
  return 'PENDING_MERCHANT';
}

/** "Talk to a person": BOT and RESOLVED go to the team; other states are already with people. */
export function statusAfterHandover(from: SupportStatus): SupportStatus {
  return from === 'BOT' || from === 'RESOLVED' ? 'WAITING' : from;
}

export type SupportActor = 'MERCHANT' | 'ADMIN';

/**
 * Manual status changes.
 * - Merchant: hand over (BOT → WAITING) and mark solved (any active state → RESOLVED).
 * - Admin: any change except back to BOT, and nothing out of CLOSED except a reopen to OPEN.
 */
export function canSetStatus(actor: SupportActor, from: SupportStatus, to: SupportStatus): boolean {
  if (from === to) return true;
  if (actor === 'MERCHANT') {
    if (to === 'WAITING') return from === 'BOT' || from === 'RESOLVED';
    if (to === 'RESOLVED') return from !== 'CLOSED';
    return false;
  }
  if (to === 'BOT') return false;
  if (from === 'CLOSED') return to === 'OPEN';
  return true;
}

/** Waiting-since after a status change: starts when the team owes a reply, clears when it does not. */
export function nextWaitingSince(prev: Date | null, to: SupportStatus, now: Date): Date | null {
  if (!NEEDS_REPLY.includes(to)) return null;
  return prev ?? now;
}

/* ───────────────────────── permissions ───────────────────────── */

export const SUPPORT_PERMS = {
  view: 'support.view',
  reply: 'support.reply',
  manage: 'support.manage',
} as const;

export interface AdminAccessLike { isSuperAdmin: boolean; permissions: string[] }

export function adminCan(access: AdminAccessLike | null | undefined, key: string): boolean {
  if (!access) return false;
  return access.isSuperAdmin || access.permissions.includes(key);
}

/** Any one of the keys is enough. */
export function adminCanAny(access: AdminAccessLike | null | undefined, keys: string[]): boolean {
  return keys.some((k) => adminCan(access, k));
}

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_STAFF']);
const NO_SUPPORT_ROLES = new Set(['PARTNER']);

/** Which side of the chat a signed-in user is on; null when they have no support chat. */
export function supportSideForRole(role: string | null | undefined, tenantId: string | null | undefined): SupportActor | null {
  if (!role) return null;
  if (ADMIN_ROLES.has(role)) return 'ADMIN';
  if (NO_SUPPORT_ROLES.has(role)) return null;
  return tenantId ? 'MERCHANT' : null;
}

/** A merchant may open a conversation only of their own tenant. */
export function merchantCanSee(conv: { tenantId: string }, user: { tenantId: string | null | undefined }): boolean {
  return !!user.tenantId && conv.tenantId === user.tenantId;
}

/** Internal notes and nothing else are hidden from merchants. */
export function visibleToMerchant(m: { internal: boolean }): boolean {
  return !m.internal;
}

/** Senders may edit their own text messages for a short while; deleted messages stay deleted. */
export function canEditMessage(
  m: { sender: string; senderUserId: string | null; kind: string; createdAt: Date; deletedAt: Date | null },
  user: { id: string; side: SupportActor },
  now: Date,
): boolean {
  if (m.deletedAt || m.kind !== 'TEXT') return false;
  if (m.sender !== user.side || m.senderUserId !== user.id) return false;
  return now.getTime() - m.createdAt.getTime() <= SUPPORT_LIMITS.editWindowMinutes * 60_000;
}

/**
 * Delete: the sender any time; an admin with support.manage may delete any message.
 * Every delete is soft (the content stays for the team, hidden from the shop);
 * only a super admin can remove the content for good (canPurgeMessage).
 */
export function canDeleteMessage(
  m: { sender: string; senderUserId: string | null; deletedAt: Date | null },
  user: { id: string; side: SupportActor; manage?: boolean },
): boolean {
  if (m.deletedAt) return false;
  if (user.side === 'ADMIN' && user.manage) return true;
  return m.sender === user.side && m.senderUserId === user.id;
}

/** Remove the content for good: super admins only, once. */
export function canPurgeMessage(m: { purgedAt: Date | null }, user: { isSuperAdmin: boolean }): boolean {
  return user.isSuperAdmin && !m.purgedAt;
}

const MAX_HISTORY = 50;

/** Earlier versions after an edit: the text being replaced goes last (oldest first). */
export function historyAfterEdit(
  history: unknown,
  m: { text: string | null; createdAt: Date; editedAt: Date | null; senderUserId: string | null },
): SupportMessageVersion[] {
  const list = readHistory(history);
  list.push({ text: m.text, at: (m.editedAt ?? m.createdAt).toISOString(), by: m.senderUserId });
  return list.slice(-MAX_HISTORY);
}

/** The stored history column as a clean list. */
export function readHistory(history: unknown): SupportMessageVersion[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((v): v is Record<string, unknown> => !!v && typeof v === 'object')
    .map((v) => ({
      text: typeof v.text === 'string' ? v.text : null,
      at: typeof v.at === 'string' ? v.at : new Date(0).toISOString(),
      by: typeof v.by === 'string' ? v.by : null,
    }));
}

/** What the shop sees of a message's files: call recordings stay with the team. */
export function merchantAttachments(atts: SupportAttachment[]): SupportAttachment[] {
  return atts.filter((a) => !a.recording);
}

/** Call and screen recordings made by the admin app (MediaRecorder output). */
export const RECORDING_MIME = ['audio/webm', 'audio/ogg', 'audio/mp4', 'video/webm', 'video/mp4'] as const;

export function checkRecording(file: { mime: string; bytes: number }): string | null {
  if (!file.bytes) return 'The recording is empty.';
  if (file.bytes > SUPPORT_LIMITS.maxRecordingBytes) return 'The recording part is too large.';
  if (!(RECORDING_MIME as readonly string[]).includes(baseMime(file.mime))) return 'This recording type is not allowed.';
  return null;
}

/* ───────────────────────── assignment ───────────────────────── */

export interface AgentCandidate {
  id: string;
  /** Last time a conversation was assigned to them (null = never). */
  lastAssignedAt: Date | null;
  /** Conversations they hold that still need work. */
  openCount: number;
}

/**
 * Round robin among the given (online) agents: whoever was assigned longest
 * ago goes next; never-assigned agents first; ties go to the lighter load,
 * then by id so the result is stable.
 */
export function pickRoundRobin(candidates: AgentCandidate[]): string | null {
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => {
    const ta = a.lastAssignedAt ? a.lastAssignedAt.getTime() : -Infinity;
    const tb = b.lastAssignedAt ? b.lastAssignedAt.getTime() : -Infinity;
    if (ta !== tb) return ta < tb ? -1 : 1;
    if (a.openCount !== b.openCount) return a.openCount - b.openCount;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return sorted[0].id;
}

/* ───────────────────────── rate limit ───────────────────────── */

export interface RateRules { burstMax: number; burstWindowMs: number; minuteMax: number }

/**
 * Sliding-window send limiter, per key (user id). In memory: enough for one
 * API process; a restart simply forgets the windows.
 */
export class SupportRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly rules: RateRules = SUPPORT_LIMITS.rate) {}

  /** Records the attempt and returns whether it is allowed (a refused attempt is not counted). */
  hit(key: string, now: number = Date.now()): { ok: true } | { ok: false; retryAfterMs: number } {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < 60_000);
    const burst = list.filter((t) => now - t < this.rules.burstWindowMs);
    if (burst.length >= this.rules.burstMax) {
      this.hits.set(key, list);
      return { ok: false, retryAfterMs: this.rules.burstWindowMs - (now - burst[0]) };
    }
    if (list.length >= this.rules.minuteMax) {
      this.hits.set(key, list);
      return { ok: false, retryAfterMs: 60_000 - (now - list[0]) };
    }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 5000) this.prune(now);
    return { ok: true };
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) if (!v.some((t) => now - t < 60_000)) this.hits.delete(k);
  }
}

/* ───────────────────────── settings and hours ───────────────────────── */

export const DEFAULT_SUPPORT_SETTINGS: SupportSettings = {
  workingHours: { days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '21:00' },
  welcomeMessage: DEFAULT_WELCOME,
  awayMessage: DEFAULT_AWAY,
  expectedReplyMinutes: 15,
  aiFirstResponder: true,
  autoAssign: 'round_robin',
  offlineEmail: true,
  sounds: { newConversation: true, newMessage: true },
  autoAwayMinutes: 10,
  supportPhone: '0324-1772933',
  supportWhatsapp: '923241772933',
  recordCalls: true,
  proactive: {
    enabled: true,
    agentUserId: null,
    agentName: null,
    quietHours: { start: '22:00', end: '09:00' },
    welcomeMaxAgeDays: 14,
    messages: PROACTIVE_DEFAULTS,
  },
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const text = (v: unknown, d: string, max = 1000) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : d);
/** A three-language text; a plain string (older saved value) fills only Roman Urdu. */
const localized = (v: unknown, d: SupportLocalized): SupportLocalized => {
  if (typeof v === 'string') return { ...d, roman: text(v, d.roman) };
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return { en: text(o.en, d.en), ur: text(o.ur, d.ur), roman: text(o.roman, d.roman) };
};

/** Fills missing fields with defaults and drops anything unknown or invalid. */
export function normalizeSupportSettings(input: unknown): SupportSettings {
  const o = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, any>) : {};
  const d = DEFAULT_SUPPORT_SETTINGS;
  const wh = o.workingHours && typeof o.workingHours === 'object' ? o.workingHours : {};
  const days = Array.isArray(wh.days)
    ? [...new Set(wh.days.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 6) as number[])].sort()
    : d.workingHours.days;
  const sounds = o.sounds && typeof o.sounds === 'object' ? o.sounds : {};
  const minutes = (v: unknown, def: number, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : def;
  return {
    workingHours: {
      days,
      start: typeof wh.start === 'string' && HHMM.test(wh.start) ? wh.start : d.workingHours.start,
      end: typeof wh.end === 'string' && HHMM.test(wh.end) ? wh.end : d.workingHours.end,
    },
    welcomeMessage: localized(o.welcomeMessage, d.welcomeMessage),
    awayMessage: localized(o.awayMessage, d.awayMessage),
    expectedReplyMinutes: minutes(o.expectedReplyMinutes, d.expectedReplyMinutes, 1, 24 * 60),
    aiFirstResponder: bool(o.aiFirstResponder, d.aiFirstResponder),
    autoAssign: o.autoAssign === 'none' || o.autoAssign === 'round_robin' ? o.autoAssign : d.autoAssign,
    offlineEmail: bool(o.offlineEmail, d.offlineEmail),
    sounds: { newConversation: bool(sounds.newConversation, d.sounds.newConversation), newMessage: bool(sounds.newMessage, d.sounds.newMessage) },
    autoAwayMinutes: minutes(o.autoAwayMinutes, d.autoAwayMinutes, 1, 240),
    supportPhone: typeof o.supportPhone === 'string' ? o.supportPhone.trim().slice(0, 30) : d.supportPhone,
    supportWhatsapp: typeof o.supportWhatsapp === 'string' ? o.supportWhatsapp.replace(/\D/g, '').slice(0, 20) : d.supportWhatsapp,
    recordCalls: bool(o.recordCalls, d.recordCalls),
    proactive: normalizeProactive(o.proactive),
  };
}

function normalizeProactive(input: unknown): SupportProactiveSettings {
  const o = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, any>) : {};
  const d = DEFAULT_SUPPORT_SETTINGS.proactive;
  const q = o.quietHours && typeof o.quietHours === 'object' ? o.quietHours : {};
  const msgs = o.messages && typeof o.messages === 'object' ? o.messages : {};
  const messages = Object.fromEntries(SUPPORT_PROACTIVE_KEYS.map((k) => {
    const m = msgs[k] && typeof msgs[k] === 'object' ? msgs[k] : {};
    const def = d.messages[k];
    const chips = Array.isArray(m.chips)
      ? m.chips.slice(0, 6).map((c: unknown, i: number) => localized(c, def.chips[i] ?? { en: '', ur: '', roman: '' })).filter((c: SupportLocalized) => c.en || c.ur || c.roman)
      : def.chips;
    return [k, { enabled: bool(m.enabled, def.enabled), template: localized(m.template, def.template), chips }];
  })) as SupportProactiveSettings['messages'];
  const days = Number(o.welcomeMaxAgeDays);
  return {
    enabled: bool(o.enabled, d.enabled),
    agentUserId: typeof o.agentUserId === 'string' && o.agentUserId ? o.agentUserId : null,
    agentName: typeof o.agentName === 'string' && o.agentName.trim() ? o.agentName.trim().slice(0, 60) : null,
    quietHours: {
      start: typeof q.start === 'string' && HHMM.test(q.start) ? q.start : d.quietHours.start,
      end: typeof q.end === 'string' && HHMM.test(q.end) ? q.end : d.quietHours.end,
    },
    welcomeMaxAgeDays: Number.isFinite(days) ? Math.min(365, Math.max(0, Math.round(days))) : d.welcomeMaxAgeDays,
    messages,
  };
}

/* ───────────────────────── proactive messages ───────────────────────── */

/** True inside start..end (PKT); the range may cross midnight. */
export function inPktWindow(w: { start: string; end: string }, now: Date): boolean {
  const p = tzParts(now, SUPPORT_TZ);
  const m = p.hour * 60 + p.minute;
  const s = minutesOf(w.start);
  const e = minutesOf(w.end);
  if (s === e) return false;
  return s < e ? m >= s && m < e : m >= s || m < e;
}

export interface ProactiveFacts {
  createdAt: Date;
  tenantStatus: string;
  paused: boolean;
  lastActiveAt: Date | null;
  products: number;
  firstSaleAt: Date | null;
  /** On a trial that has not ended: its end. */
  trialEndsAt: Date | null;
  /** Trial that already ended without a paid plan: when it ended. */
  trialEndedAt: Date | null;
  paid: boolean;
  sent: Set<string>;
  lastProactiveAt: Date | null;
  optOut: boolean;
  /** Last time the shop wrote in support. */
  merchantWroteAt: Date | null;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * The one proactive message due for a shop right now, or null. Rules: never
 * to suspended or paused shops, never in quiet hours, at most one a day, each
 * key once; check-ins stop when the shop turned them off or wrote in the last
 * 24 hours (they are already talking to us).
 */
export function proactiveDue(f: ProactiveFacts, s: SupportProactiveSettings, now: Date): SupportProactiveKey | null {
  if (!s.enabled || f.paused || f.tenantStatus === 'SUSPENDED') return null;
  if (inPktWindow(s.quietHours, now)) return null;
  if (f.lastProactiveAt && now.getTime() - f.lastProactiveAt.getTime() < DAY) return null;
  const on = (k: SupportProactiveKey) => s.messages[k]?.enabled && !f.sent.has(k);
  const age = now.getTime() - f.createdAt.getTime();

  if (on('welcome') && age >= 2 * 60_000 && age <= s.welcomeMaxAgeDays * DAY) return 'welcome';
  if (f.optOut) return null;
  if (f.merchantWroteAt && now.getTime() - f.merchantWroteAt.getTime() < DAY) return null;

  if (!f.paid && f.trialEndedAt && on('trial_ended') && now.getTime() - f.trialEndedAt.getTime() <= 14 * DAY) return 'trial_ended';
  if (!f.paid && f.trialEndsAt && on('trial_ending')) {
    const left = f.trialEndsAt.getTime() - now.getTime();
    if (left > 0 && left <= 2 * DAY) return 'trial_ending';
  }
  if (f.firstSaleAt && on('first_sale') && now.getTime() - f.firstSaleAt.getTime() <= 3 * DAY) return 'first_sale';
  if (f.products === 0 && on('day1_no_products') && age >= DAY && age <= 7 * DAY) return 'day1_no_products';
  if (!f.paid && f.trialEndsAt && on('inactive_3d')) {
    const seen = f.lastActiveAt ?? f.createdAt;
    if (now.getTime() - seen.getTime() >= 3 * DAY) return 'inactive_3d';
  }
  return null;
}

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** True when `now` (Pakistan time) is inside the working days and hours. The range may cross midnight. */
export function withinWorkingHours(wh: SupportSettings['workingHours'], now: Date): boolean {
  const p = tzParts(now, SUPPORT_TZ);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  const m = p.hour * 60 + p.minute;
  const s = minutesOf(wh.start);
  const e = minutesOf(wh.end);
  if (s === e) return wh.days.includes(weekday);
  if (s < e) return wh.days.includes(weekday) && m >= s && m < e;
  // Crosses midnight: the early part belongs to the previous day's shift.
  if (m >= s) return wh.days.includes(weekday);
  return m < e && wh.days.includes((weekday + 6) % 7);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Mon–Sat 09:00–21:00 (PKT)". */
export function hoursText(wh: SupportSettings['workingHours']): string {
  const days = [...wh.days].sort();
  let dayText: string;
  if (days.length === 7) dayText = 'Every day';
  else if (!days.length) dayText = 'No days';
  else {
    const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
    dayText = contiguous && days.length > 2 ? `${DAY_NAMES[days[0]]}–${DAY_NAMES[days[days.length - 1]]}` : days.map((d) => DAY_NAMES[d]).join(', ');
  }
  return `${dayText} ${wh.start}–${wh.end} (PKT)`;
}

/* ───────────────────────── attachments and text ───────────────────────── */

const BLOCKED_EXT = /\.(exe|msi|bat|cmd|com|scr|ps1|vbs|js|jar|sh|apk|app|dmg|dll|so|html?|svg|php|py|rb|pl)$/i;

/** Checks an upload before it is stored. Returns an error message, or null when allowed. */
/** "audio/webm;codecs=opus" → "audio/webm" (browsers add codec parameters to recordings). */
export const baseMime = (mime: string) => mime.split(';')[0].trim().toLowerCase();

export function checkUpload(file: { mime: string; bytes: number; name: string }): string | null {
  if (!file.bytes) return 'The file is empty.';
  if (file.bytes > SUPPORT_LIMITS.maxFileBytes) return 'The file is larger than 15 MB.';
  if (!(SUPPORT_ALLOWED_MIME as readonly string[]).includes(baseMime(file.mime))) return 'This file type is not allowed.';
  if (BLOCKED_EXT.test(file.name)) return 'This file type is not allowed.';
  return null;
}

/** Message kind from its attachments (audio = voice note, image, otherwise file). */
export function kindForAttachments(atts: Array<{ mime: string }>, requested?: string): SupportMessageKind {
  if (!atts.length) return 'TEXT';
  if (requested === 'VOICE' || atts.some((a) => a.mime.startsWith('audio/') || a.mime === 'video/webm')) return 'VOICE';
  if (requested === 'IMAGE' || atts.every((a) => a.mime.startsWith('image/'))) return 'IMAGE';
  return 'FILE';
}

/**
 * Keeps only well-formed attachments whose URL points at our own storage
 * (Cloudinary or this API's /uploads), so a client cannot slip in other links.
 */
export function cleanAttachments(input: unknown, allowedUrl: (url: string) => boolean): SupportAttachment[] {
  if (!Array.isArray(input)) return [];
  const out: SupportAttachment[] = [];
  for (const raw of input.slice(0, SUPPORT_LIMITS.maxAttachments)) {
    if (!raw || typeof raw !== 'object') continue;
    const a = raw as Record<string, unknown>;
    const url = typeof a.url === 'string' ? a.url : '';
    const mime = typeof a.mime === 'string' ? baseMime(a.mime) : '';
    const bytes = typeof a.bytes === 'number' ? a.bytes : 0;
    const name = typeof a.name === 'string' && a.name.trim() ? a.name.trim().slice(0, 200) : 'file';
    if (!url || !allowedUrl(url)) continue;
    if (checkUpload({ mime, bytes: Math.max(1, bytes), name })) continue;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const durationSec = num(a.durationSec);
    out.push({
      url, name, mime, bytes,
      width: num(a.width),
      height: num(a.height),
      durationSec: durationSec == null ? null : Math.min(SUPPORT_LIMITS.maxVoiceSec + 5, Math.max(0, durationSec)),
      waveform: Array.isArray(a.waveform)
        ? (a.waveform as unknown[]).slice(0, 64).map((x) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0))
        : null,
    });
  }
  return out;
}

/** One-line preview for the list ("📷 Photo", "🎤 Voice note (0:42)", or the text). */
export function previewFor(m: { kind: string; text: string | null; attachments: Array<{ durationSec?: number | null }> }): string {
  if (m.text && m.text.trim()) return m.text.trim().replace(/\s+/g, ' ').slice(0, 140);
  switch (m.kind) {
    case 'IMAGE': return '📷 Photo';
    case 'VOICE': {
      const s = Math.round(m.attachments[0]?.durationSec ?? 0);
      return `🎤 Voice note (${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')})`;
    }
    case 'FILE': return '📎 File';
    case 'CALL_EVENT': return '📞 Call';
    default: return '';
  }
}

/** Tags: lower-case words with dashes, at most 10, each at most 30 characters. */
export function cleanTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<string>();
  for (const t of input) {
    if (typeof t !== 'string') continue;
    const v = t.trim().toLowerCase().replace(/[^a-z0-9؀-ۿ -]/g, '').replace(/\s+/g, '-').slice(0, 30);
    if (v) out.add(v);
    if (out.size >= 10) break;
  }
  return [...out];
}

/** First name for showing an agent to merchants. */
export const firstName = (full: string | null | undefined) => (full ?? '').trim().split(/\s+/)[0] || 'Nafaa team';

/** Parses SUPPORT_ICE_SERVERS (JSON array); falls back to Google's public STUN. */
export function iceServersFromEnv(raw: string | undefined): Array<{ urls: string | string[]; username?: string; credential?: string }> {
  const fallback = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (!raw?.trim()) return fallback;
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return fallback;
    const ok = v.filter((s) => s && (typeof s.urls === 'string' || (Array.isArray(s.urls) && s.urls.every((u: unknown) => typeof u === 'string'))));
    return ok.length ? ok : fallback;
  } catch {
    return fallback;
  }
}
