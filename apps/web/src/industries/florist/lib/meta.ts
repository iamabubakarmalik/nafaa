/** Florist labels, money methods, date and input helpers shared by the florist pages. */

import type { FloristDeliveryTimeSlot, FloristOrderStatus, FloristOrderType } from '../api/orders.api';
import type { FloristCategoryType, FloristFreshnessGrade } from '../api/products.api';

export const FLORIST_KEYS = {
  orders: 'florist-orders',
  order: 'florist-order',
  weddings: 'florist-weddings',
  subscriptions: 'florist-subscriptions',
  freshness: 'florist-freshness',
  profiles: 'florist-profiles',
} as const;

/** Every query a money action can change, refreshed after it. */
export const MONEY_KEYS = ['sales-list', 'sales-summary', 'customers', 'customers-for-pos', 'khata', 'cash-register', 'dashboard-overview'];

export const ORDER_STATUS: Record<FloristOrderStatus, { label: string; tone: string }> = {
  DRAFT: { label: 'Kacha', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  CONFIRMED: { label: 'Pakka', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  IN_PREPARATION: { label: 'Ban raha hai', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  READY_FOR_DELIVERY: { label: 'Tayyar', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  OUT_FOR_DELIVERY: { label: 'Raste me', tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  DELIVERED: { label: 'Pohanch gaya', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED: { label: 'Cancel', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

/** Next step button for an open order. */
export const NEXT_STEP: Partial<Record<FloristOrderStatus, { to: FloristOrderStatus; label: string }>> = {
  DRAFT: { to: 'CONFIRMED', label: 'Pakka karein' },
  CONFIRMED: { to: 'IN_PREPARATION', label: 'Banana shuru' },
  IN_PREPARATION: { to: 'READY_FOR_DELIVERY', label: 'Tayyar hai' },
  READY_FOR_DELIVERY: { to: 'OUT_FOR_DELIVERY', label: 'Rider ko diya' },
};

export const ORDER_TYPE: Record<FloristOrderType, string> = {
  WALK_IN: 'Counter se',
  DELIVERY: 'Ghar delivery',
  EVENT: 'Event / function',
  WEDDING: 'Shaadi',
  SUBSCRIPTION: 'Subscription',
  CORPORATE: 'Office / company',
};

export const SLOT: Record<FloristDeliveryTimeSlot, string> = {
  MORNING_9_12: 'Subah 9–12',
  AFTERNOON_12_3: 'Dopahar 12–3',
  EVENING_3_6: 'Shaam 3–6',
  NIGHT_6_9: 'Raat 6–9',
  URGENT: 'Foran (2 ghante)',
  SCHEDULED: 'Khaas waqt',
};

export const WEDDING_STATUS: Record<string, { label: string; tone: string }> = {
  QUOTED: { label: 'Quote diya', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  CONFIRMED: { label: 'Pakka', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  IN_PROGRESS: { label: 'Kaam jari', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  COMPLETED: { label: 'Mukammal', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED: { label: 'Cancel', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const SUB_STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: 'Chalu', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  PAUSED: { label: 'Ruki hui', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  CANCELLED: { label: 'Band', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export const FREQUENCY: Record<string, string> = { DAILY: 'Roz', WEEKLY: 'Har hafta', BIWEEKLY: 'Har 2 hafte', MONTHLY: 'Har mahina' };

export const PAY_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'EasyPaisa' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'CARD', label: 'Card' },
];

export const errorText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;

export const phoneOk = (v: string) => /^[0-9+\-\s]{10,15}$/.test(v.trim());

/** Number typed in a text box ("1,200" → 1200); empty → null. */
export const numIn = (v: string): number | null => {
  const t = v.replace(/[^\d.-]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** `yyyy-mm-dd` of a local date. */
export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const shiftDay = (key: string, days: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
};

export const shortDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(v)) : '—';
export const longDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '—';

/** Whole days from today to a date (negative = past). */
export const daysFromToday = (v?: string | null) => {
  if (!v) return null;
  const a = new Date(dayKey(new Date(v)));
  const b = new Date(dayKey());
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
};

/** Product kinds grouped the way the shop thinks of them. */
export const CATEGORY_GROUPS: Array<{ id: 'stem' | 'made' | 'decor' | 'plant' | 'gift'; label: string; items: Array<[FloristCategoryType, string]> }> = [
  { id: 'stem', label: 'Khule phool', items: [
    ['ROSE_RED', 'Gulab laal'], ['ROSE_WHITE', 'Gulab safed'], ['ROSE_PINK', 'Gulab gulabi'], ['ROSE_YELLOW', 'Gulab peela'], ['ROSE_MIXED', 'Gulab mix'],
    ['TULIP', 'Tulip'], ['LILY', 'Lily'], ['ORCHID', 'Orchid'], ['SUNFLOWER', 'Sunflower'], ['CARNATION', 'Carnation'], ['GERBERA', 'Gerbera'],
    ['CHRYSANTHEMUM', 'Guldaudi'], ['DAISY', 'Daisy'], ['JASMINE', 'Motia'], ['MARIGOLD', 'Genda'], ['IRIS', 'Iris'], ['HYDRANGEA', 'Hydrangea'],
    ['PEONY', 'Peony'], ['ANTHURIUM', 'Anthurium'], ['BIRD_OF_PARADISE', 'Bird of paradise'], ['BABY_BREATH', "Baby's breath"], ['GREENERY_FILLER', 'Hariyali / filler'],
  ] },
  { id: 'made', label: 'Bouquet / arrangement', items: [
    ['BOUQUET_BIRTHDAY', 'Birthday bouquet'], ['BOUQUET_ANNIVERSARY', 'Anniversary bouquet'], ['BOUQUET_WEDDING', 'Shaadi bouquet'], ['BOUQUET_ROMANCE', 'Romance bouquet'],
    ['BOUQUET_CONDOLENCE', 'Taziyat bouquet'], ['BOUQUET_GET_WELL', 'Get well bouquet'], ['BOUQUET_CONGRATULATIONS', 'Mubarakbad bouquet'], ['BOUQUET_MIXED', 'Mix bouquet'],
    ['BASKET_ARRANGEMENT', 'Tokri'], ['VASE_ARRANGEMENT', 'Vase arrangement'], ['BOX_ARRANGEMENT', 'Box arrangement'], ['TABLE_CENTREPIECE', 'Table centrepiece'],
    ['STANDING_ARRANGEMENT', 'Stand arrangement'], ['BRIDAL_BOUQUET', 'Dulhan bouquet'], ['BOUTONNIERE', 'Boutonniere'], ['FUNERAL_WREATH', 'Wreath'], ['SYMPATHY_ARRANGEMENT', 'Taziyat arrangement'],
  ] },
  { id: 'decor', label: 'Sajawat / haar', items: [
    ['WEDDING_GARLAND', 'Haar / sehra'], ['CAR_DECORATION', 'Gaari sajawat'], ['STAGE_DECORATION', 'Stage sajawat'], ['MEHNDI_DECORATION', 'Mehndi sajawat'],
  ] },
  { id: 'plant', label: 'Paude', items: [
    ['POTTED_PLANT_INDOOR', 'Gamla (andar)'], ['POTTED_PLANT_OUTDOOR', 'Gamla (bahar)'], ['SUCCULENT', 'Succulent'], ['BONSAI', 'Bonsai'], ['AIR_PLANT', 'Air plant'],
  ] },
  { id: 'gift', label: 'Gift / saman', items: [
    ['CHOCOLATE_BOX', 'Chocolate'], ['TEDDY_BEAR', 'Teddy'], ['BALLOON', 'Balloon'], ['GREETING_CARD', 'Card'], ['GIFT_ITEM', 'Gift'],
    ['VASE_EMPTY', 'Khali vase'], ['RIBBON', 'Ribbon'], ['WRAPPING_PAPER', 'Wrapping'], ['FLORAL_FOAM', 'Foam'], ['OTHER', 'Aur'],
  ] },
];

const CATEGORY_INDEX = new Map(CATEGORY_GROUPS.flatMap((g) => g.items.map(([v, l]) => [v, { label: l, group: g.id }] as const)));
export const categoryLabel = (v?: string | null) => (v ? CATEGORY_INDEX.get(v as FloristCategoryType)?.label ?? v : '—');
export const categoryGroup = (v?: string | null) => (v ? CATEGORY_INDEX.get(v as FloristCategoryType)?.group ?? null : null);

export const GRADE: Record<FloristFreshnessGrade, string> = {
  A_PREMIUM: 'A — premium', B_STANDARD: 'B — aam', C_ECONOMY: 'C — sasta', IMPORTED: 'Imported', LOCAL: 'Local',
};

export const OCCASIONS = ['Birthday', 'Anniversary', 'Shaadi', 'Mehndi', 'Valentine', 'Eid', 'Get well', 'Taziyat', 'Mubarakbad', 'Mother day', 'Office'];
