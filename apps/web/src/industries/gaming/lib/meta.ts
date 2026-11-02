/** Gaming labels, query keys and small helpers shared by the gaming pages. */

import { t as tr } from '@core/i18n';
export const GAMING_KEYS = {
  stations: 'gaming-stations',
  sessions: 'gaming-sessions',
  active: 'gaming-active-sessions',
  counter: 'gaming-counter',
  topups: 'gaming-topups',
  rentals: 'gaming-rentals',
  tournaments: 'gaming-tournaments',
  profiles: 'gaming-profiles',
  dashboard: 'gaming-dashboard-overview',
} as const;

/** Queries that hold money; refreshed after any gaming bill. */
export const MONEY_KEYS = ['sales', 'sales-history', 'dashboard', 'khata', 'customers', 'cash-register', 'products-catalog', 'products-for-pos', GAMING_KEYS.dashboard];

/** Sale number starts of gaming bills made outside the counter. */
export const BILL_PREFIX = { session: 'GMS-', topup: 'GMT-', rental: 'GMR-', tournament: 'GTN-' } as const;
export const TIME_SKU = 'GAMING-TIME';
export const TOPUP_SKU = 'TOPUP-';

export const STATION_TYPES: Record<string, string> = {
  PS5_STATION: 'PS5', PS4_STATION: 'PS4', XBOX_STATION: 'Xbox', PC_STATION: 'PC', SIMULATOR: 'Simulator',
  VR_STATION: 'VR', MULTIPLAYER_BOOTH: tr('Group booth'), PRIVATE_ROOM: tr('Private room'), OTHER: tr('Aur'),
};

export const PLATFORMS: Record<string, string> = {
  PS5: 'PS5', PS4: 'PS4', XBOX_SERIES_X: 'Xbox Series X', XBOX_SERIES_S: 'Xbox Series S', XBOX_ONE: 'Xbox One',
  NINTENDO_SWITCH: 'Switch', PC: 'PC', STEAM_DECK: 'Steam Deck', MOBILE: 'Mobile', RETRO: 'Retro', MULTI: tr('Sab'), OTHER: tr('Aur'),
};

export const PROVIDERS: Record<string, string> = {
  PUBG_UC: 'PUBG UC', FREE_FIRE_DIAMONDS: 'Free Fire', PSN: 'PSN', STEAM: 'Steam', GOOGLE_PLAY: 'Google Play', XBOX_LIVE: 'Xbox',
  ROBUX: 'Robux', FORTNITE_VBUCKS: 'V-Bucks', MOBILE_LEGENDS_DIAMONDS: 'ML Diamonds', NINTENDO: 'Nintendo', EPIC_GAMES: 'Epic Games',
  APPLE_STORE: 'App Store', ITUNES: 'iTunes', DISCORD_NITRO: 'Discord Nitro', NETFLIX: 'Netflix', SPOTIFY: 'Spotify', OTHER: tr('Card'),
};
export const providerOf = (p?: string | null) => (p ? PROVIDERS[p] ?? p.replace(/_/g, ' ') : '—');

export const CONDITIONS: Record<string, { label: string; tone: string }> = {
  NEW_SEALED: { label: tr('Naya sealed'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  OPEN_BOX: { label: tr('Open box'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  PRE_OWNED: { label: tr('Used'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  REFURBISHED: { label: tr('Refurbished'), tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  TRADE_IN: { label: tr('Trade-in'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

export const CATEGORY_GROUPS: Array<{ id: string; label: string; items: Array<[string, string]> }> = [
  { id: 'console', label: tr('Console'), items: [['CONSOLE_PS5', 'PS5'], ['CONSOLE_PS4', 'PS4'], ['CONSOLE_XBOX_SERIES', tr('Xbox Series')], ['CONSOLE_XBOX_ONE', tr('Xbox One')], ['CONSOLE_NINTENDO_SWITCH', tr('Switch')], ['CONSOLE_HANDHELD', tr('Handheld')], ['CONSOLE_RETRO', tr('Retro')], ['VR_HEADSET', 'VR']] },
  { id: 'game', label: tr('Game'), items: [['GAME_DISC', tr('Game CD')], ['GAME_DIGITAL', tr('Digital game')], ['GAME_COLLECTOR_EDITION', tr('Collector edition')]] },
  { id: 'gear', label: tr('Accessories'), items: [['CONTROLLER', tr('Controller')], ['HEADSET_GAMING', tr('Headset')], ['KEYBOARD_GAMING', tr('Keyboard')], ['MOUSE_GAMING', tr('Mouse')], ['MOUSEPAD', tr('Mousepad')], ['CHAIR_GAMING', tr('Chair')], ['DESK_GAMING', tr('Desk')], ['MONITOR_GAMING', tr('Monitor')], ['STREAMING_GEAR', tr('Streaming')], ['CAPTURE_CARD', tr('Capture card')], ['RGB_ACCESSORY', 'RGB']] },
  { id: 'pc', label: tr('PC parts'), items: [['PC_PREBUILT', tr('PC (bana hua)')], ['PC_CUSTOM_BUILD', tr('Custom PC')], ['CPU', 'CPU'], ['GPU', 'GPU'], ['RAM', 'RAM'], ['MOTHERBOARD', tr('Motherboard')], ['PSU', 'PSU'], ['STORAGE_SSD', 'SSD'], ['STORAGE_HDD', 'HDD'], ['COOLING', tr('Cooling')], ['PC_CASE', tr('Casing')]] },
  { id: 'other', label: tr('Aur'), items: [['DIGITAL_SUBSCRIPTION', tr('Subscription')], ['GIFT_CARD', tr('Gift card')], ['MERCHANDISE', tr('Merchandise')], ['OTHER', tr('Aur')]] },
];
const CATEGORY_INDEX = new Map(CATEGORY_GROUPS.flatMap((g) => g.items.map(([v, l]) => [v, { label: l, group: g.id }] as const)));
export const categoryLabel = (v?: string | null) => (v ? CATEGORY_INDEX.get(v)?.label ?? v : '—');
export const categoryGroup = (v?: string | null) => (v ? CATEGORY_INDEX.get(v)?.group ?? null : null);

export const SESSION_STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: tr('Chal raha'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  PAUSED: { label: tr('Ruka hua'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  ENDED: { label: tr('Bill ho gaya'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const RENTAL_STATUS: Record<string, { label: string; tone: string }> = {
  RESERVED: { label: tr('Booked'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ACTIVE: { label: tr('Bahar hai'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  OVERDUE: { label: tr('Late'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  RETURNED: { label: tr('Wapas aa gaya'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  DAMAGED: { label: tr('Kharab'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  LOST: { label: tr('Gum'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

export const TOURNAMENT_STATUS: Record<string, { label: string; tone: string }> = {
  UPCOMING: { label: tr('Aane wala'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ONGOING: { label: tr('Chal raha'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  COMPLETED: { label: tr('Mukammal'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const PAY_METHODS = [
  { value: 'CASH', label: tr('Cash') },
  { value: 'JAZZCASH', label: tr('JazzCash') },
  { value: 'EASYPAISA', label: tr('EasyPaisa') },
  { value: 'BANK_TRANSFER', label: tr('Bank') },
  { value: 'CARD', label: tr('Card') },
];

export const errorText = (e: unknown, fallback: string) => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || fallback;
};

/** Number typed in a text box ("1,200" → 1200); empty → null. */
export const numIn = (v: string): number | null => {
  const t = v.replace(/[^\d.]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
export const moneyText = (v: string) => v.replace(/[^\d.]/g, '');

export const phoneOk = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());

/** `yyyy-mm-dd` of a local date. */
export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
};
export const shortDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(v)) : '—';
export const longDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '—';
export const timeOf = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(v)) : '—';

/** "1 ghanta 25 min". */
export const minutesText = (m: number) => {
  const mins = Math.max(Math.round(m), 0);
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return h ? tr('{{h}} ghanta{{value}}', { h, value: r ? tr(' {{r}} min', { r }) : '' }) : tr('{{r}} min', { r });
};

/** Minutes billed and amount so far for a running session (pauses left out, station minimum applied). */
export function liveOf(s: { startedAt: string; status: string; pausedAt?: string | null; totalPauseMinutes: number; ratePerHour: number; station?: { minimumMinutes?: number } | null }, now = Date.now()) {
  const played = Math.max(Math.floor((now - new Date(s.startedAt).getTime()) / 60_000), 0);
  const openPause = s.status === 'PAUSED' && s.pausedAt ? Math.floor((now - new Date(s.pausedAt).getTime()) / 60_000) : 0;
  const minutes = Math.max(played - Number(s.totalPauseMinutes || 0) - openPause, Number(s.station?.minimumMinutes ?? 0), 0);
  return { played, minutes, amount: Math.round((minutes / 60) * Number(s.ratePerHour || 0) * 100) / 100 };
}
