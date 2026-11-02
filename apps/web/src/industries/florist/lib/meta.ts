/** Florist labels, money methods, date and input helpers shared by the florist pages. */

import type { FloristDeliveryTimeSlot, FloristOrderStatus, FloristOrderType } from '../api/orders.api';
import type { FloristCategoryType, FloristFreshnessGrade } from '../api/products.api';
import { t as tr } from '@core/i18n';

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
  DRAFT: { label: tr('Kacha'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  CONFIRMED: { label: tr('Pakka'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  IN_PREPARATION: { label: tr('Ban raha hai'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  READY_FOR_DELIVERY: { label: tr('Tayyar'), tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  OUT_FOR_DELIVERY: { label: tr('Raste me'), tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  DELIVERED: { label: tr('Pohanch gaya'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

/** Next step button for an open order. */
export const NEXT_STEP: Partial<Record<FloristOrderStatus, { to: FloristOrderStatus; label: string }>> = {
  DRAFT: { to: 'CONFIRMED', label: tr('Pakka karein') },
  CONFIRMED: { to: 'IN_PREPARATION', label: tr('Banana shuru') },
  IN_PREPARATION: { to: 'READY_FOR_DELIVERY', label: tr('Tayyar hai') },
  READY_FOR_DELIVERY: { to: 'OUT_FOR_DELIVERY', label: tr('Rider ko diya') },
};

export const ORDER_TYPE: Record<FloristOrderType, string> = {
  WALK_IN: tr('Counter se'),
  DELIVERY: tr('Ghar delivery'),
  EVENT: tr('Event / function'),
  WEDDING: tr('Shaadi'),
  SUBSCRIPTION: tr('Subscription'),
  CORPORATE: tr('Office / company'),
};

export const SLOT: Record<FloristDeliveryTimeSlot, string> = {
  MORNING_9_12: tr('Subah 9–12'),
  AFTERNOON_12_3: tr('Dopahar 12–3'),
  EVENING_3_6: tr('Shaam 3–6'),
  NIGHT_6_9: tr('Raat 6–9'),
  URGENT: tr('Foran (2 ghante)'),
  SCHEDULED: tr('Khaas waqt'),
};

export const WEDDING_STATUS: Record<string, { label: string; tone: string }> = {
  QUOTED: { label: tr('Quote diya'), tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  CONFIRMED: { label: tr('Pakka'), tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  IN_PROGRESS: { label: tr('Kaam jari'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  COMPLETED: { label: tr('Mukammal'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED: { label: tr('Cancel'), tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export const SUB_STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: tr('Chalu'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  PAUSED: { label: tr('Ruki hui'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  CANCELLED: { label: tr('Band'), tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export const FREQUENCY: Record<string, string> = { DAILY: tr('Roz'), WEEKLY: tr('Har hafta'), BIWEEKLY: tr('Har 2 hafte'), MONTHLY: tr('Har mahina') };

export const PAY_METHODS = [
  { value: 'CASH', label: tr('Cash') },
  { value: 'JAZZCASH', label: tr('JazzCash') },
  { value: 'EASYPAISA', label: tr('EasyPaisa') },
  { value: 'BANK_TRANSFER', label: tr('Bank') },
  { value: 'CARD', label: tr('Card') },
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
  { id: 'stem', label: tr('Khule phool'), items: [
    ['ROSE_RED', tr('Gulab laal')], ['ROSE_WHITE', tr('Gulab safed')], ['ROSE_PINK', tr('Gulab gulabi')], ['ROSE_YELLOW', tr('Gulab peela')], ['ROSE_MIXED', tr('Gulab mix')],
    ['TULIP', tr('Tulip')], ['LILY', tr('Lily')], ['ORCHID', tr('Orchid')], ['SUNFLOWER', tr('Sunflower')], ['CARNATION', tr('Carnation')], ['GERBERA', tr('Gerbera')],
    ['CHRYSANTHEMUM', tr('Guldaudi')], ['DAISY', tr('Daisy')], ['JASMINE', tr('Motia')], ['MARIGOLD', tr('Genda')], ['IRIS', tr('Iris')], ['HYDRANGEA', tr('Hydrangea')],
    ['PEONY', tr('Peony')], ['ANTHURIUM', tr('Anthurium')], ['BIRD_OF_PARADISE', tr('Bird of paradise')], ['BABY_BREATH', tr('Baby\'s breath')], ['GREENERY_FILLER', tr('Hariyali / filler')],
  ] },
  { id: 'made', label: tr('Bouquet / arrangement'), items: [
    ['BOUQUET_BIRTHDAY', tr('Birthday bouquet')], ['BOUQUET_ANNIVERSARY', tr('Anniversary bouquet')], ['BOUQUET_WEDDING', tr('Shaadi bouquet')], ['BOUQUET_ROMANCE', tr('Romance bouquet')],
    ['BOUQUET_CONDOLENCE', tr('Taziyat bouquet')], ['BOUQUET_GET_WELL', tr('Get well bouquet')], ['BOUQUET_CONGRATULATIONS', tr('Mubarakbad bouquet')], ['BOUQUET_MIXED', tr('Mix bouquet')],
    ['BASKET_ARRANGEMENT', tr('Tokri')], ['VASE_ARRANGEMENT', tr('Vase arrangement')], ['BOX_ARRANGEMENT', tr('Box arrangement')], ['TABLE_CENTREPIECE', tr('Table centrepiece')],
    ['STANDING_ARRANGEMENT', tr('Stand arrangement')], ['BRIDAL_BOUQUET', tr('Dulhan bouquet')], ['BOUTONNIERE', tr('Boutonniere')], ['FUNERAL_WREATH', tr('Wreath')], ['SYMPATHY_ARRANGEMENT', tr('Taziyat arrangement')],
  ] },
  { id: 'decor', label: tr('Sajawat / haar'), items: [
    ['WEDDING_GARLAND', tr('Haar / sehra')], ['CAR_DECORATION', tr('Gaari sajawat')], ['STAGE_DECORATION', tr('Stage sajawat')], ['MEHNDI_DECORATION', tr('Mehndi sajawat')],
  ] },
  { id: 'plant', label: tr('Paude'), items: [
    ['POTTED_PLANT_INDOOR', tr('Gamla (andar)')], ['POTTED_PLANT_OUTDOOR', tr('Gamla (bahar)')], ['SUCCULENT', tr('Succulent')], ['BONSAI', tr('Bonsai')], ['AIR_PLANT', tr('Air plant')],
  ] },
  { id: 'gift', label: tr('Gift / saman'), items: [
    ['CHOCOLATE_BOX', tr('Chocolate')], ['TEDDY_BEAR', tr('Teddy')], ['BALLOON', tr('Balloon')], ['GREETING_CARD', tr('Card')], ['GIFT_ITEM', tr('Gift')],
    ['VASE_EMPTY', tr('Khali vase')], ['RIBBON', tr('Ribbon')], ['WRAPPING_PAPER', tr('Wrapping')], ['FLORAL_FOAM', tr('Foam')], ['OTHER', tr('Aur')],
  ] },
];

const CATEGORY_INDEX = new Map(CATEGORY_GROUPS.flatMap((g) => g.items.map(([v, l]) => [v, { label: l, group: g.id }] as const)));
export const categoryLabel = (v?: string | null) => (v ? CATEGORY_INDEX.get(v as FloristCategoryType)?.label ?? v : '—');
export const categoryGroup = (v?: string | null) => (v ? CATEGORY_INDEX.get(v as FloristCategoryType)?.group ?? null : null);

export const GRADE: Record<FloristFreshnessGrade, string> = {
  A_PREMIUM: 'A — premium', B_STANDARD: 'B — aam', C_ECONOMY: 'C — sasta', IMPORTED: tr('Imported'), LOCAL: tr('Local'),
};

export const OCCASIONS = ['Birthday', 'Anniversary', 'Shaadi', 'Mehndi', 'Valentine', 'Eid', 'Get well', 'Taziyat', 'Mubarakbad', 'Mother day', 'Office'];
