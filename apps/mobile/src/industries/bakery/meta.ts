/**
 * Labels, colours and helpers shared by the bakery screens (mirror of the web
 * bakery meta.ts and api/constants.ts). Labels are source keys marked with
 * msg() and translated where shown.
 */

import { Bike, Building2, ChefHat, Package, Store, Trash2, Truck, Wheat, type LucideIcon } from 'lucide-react-native';
import {
  bulkLines, bulkMessage, bulkPrice, cakeMessage, dueOf, isDelivery, leftOf, type BakeryOrderStatus, type StepKey,
} from '@nafaa/core/bakery';
import type { MessageLang } from '@nafaa/core/customers';
import { formatDate, formatDateTime, formatMoney, formatTime } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { BulkOrder, CakeOrder, OrderPayMethod, WasteSource } from './api';

export const CAKE_KEY = 'cake-orders';
export const BULK_KEY = 'bulk-orders';
export const PRODUCTION_KEY = 'bakery-production';
export const FRESH_KEY = 'freshness-logs';
export const RAW_KEY = 'bakery-ingredients';

/** Refreshes bakery screens (and sales, stock and khata after a bill). */
export function refreshBakery(keys: string[], bill = false) {
  const all = [...keys, ...(bill ? ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'inv', 'offline'] : [])];
  all.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

interface StatusMeta { label: string; tone: StatusTone; color: string }

const ORDER_STATUS: Record<BakeryOrderStatus, StatusMeta> = {
  DRAFT: { label: msg('Poocha hai'), tone: 'neutral', color: '#94a3b8' },
  QUOTED: { label: msg('Rate bataya'), tone: 'info', color: '#0ea5e9' },
  CONFIRMED: { label: msg('Pakka hua'), tone: 'info', color: '#3b82f6' },
  DEPOSIT_PAID: { label: msg('Advance mila'), tone: 'info', color: '#06b6d4' },
  IN_PRODUCTION: { label: msg('Ban raha hai'), tone: 'warning', color: '#f97316' },
  BAKING: { label: msg('Oven me'), tone: 'warning', color: '#fb923c' },
  DECORATING: { label: msg('Sajawat'), tone: 'accent', color: '#d946ef' },
  QUALITY_CHECK: { label: msg('Check ho raha'), tone: 'accent', color: '#8b5cf6' },
  READY: { label: msg('Tayyar hai'), tone: 'success', color: '#10b981' },
  OUT_FOR_DELIVERY: { label: msg('Raaste me'), tone: 'warning', color: '#f59e0b' },
  DELIVERED: { label: msg('De diya'), tone: 'success', color: '#059669' },
  CANCELLED: { label: msg('Cancel'), tone: 'danger', color: '#f43f5e' },
  REFUNDED: { label: msg('Paisa wapas'), tone: 'neutral', color: '#64748b' },
};
export const statusOf = (s?: string | null): StatusMeta => ORDER_STATUS[(s ?? 'DRAFT') as BakeryOrderStatus] ?? { label: String(s ?? '—'), tone: 'neutral', color: '#94a3b8' };

const STEP_LABEL: Record<StepKey, string> = {
  quote: msg('Rate bata diya'), confirm: msg('Pakka karein'), start: msg('Banana shuru'), decorate: msg('Sajawat shuru'),
  ready: msg('Tayyar hai'), send: msg('Bhej diya'), deliver: msg('De diya — bill'), arrived: msg('Pahunch gaya — bill'),
};
export const stepLabel = (s: StepKey) => t(STEP_LABEL[s]);

export const DELIVERY: Array<{ id: string; label: string; hint: string; icon: LucideIcon }> = [
  { id: 'SELF_PICKUP', label: msg('Dukaan se lenge'), hint: msg('Customer khud aayega'), icon: Store },
  { id: 'HOME_DELIVERY', label: msg('Ghar pahunchana'), hint: msg('Hamara rider le jayega'), icon: Bike },
  { id: 'VENUE_DELIVERY', label: msg('Hall / venue'), hint: msg('Shadi hall ya daftar'), icon: Building2 },
  { id: 'COURIER', label: msg('Courier'), hint: msg('Doosre shehar'), icon: Package },
];
export const deliveryOf = (v?: string | null) => DELIVERY.find((d) => d.id === v) ?? (isDelivery(v) ? { id: v!, label: msg('Pahunchana'), hint: '', icon: Truck } : DELIVERY[0]);

export const PAY_METHODS: Array<{ id: OrderPayMethod; label: string }> = [
  { id: 'CASH', label: msg('Cash') }, { id: 'CARD', label: msg('Card') }, { id: 'JAZZCASH', label: msg('JazzCash') },
  { id: 'EASYPAISA', label: msg('EasyPaisa') }, { id: 'BANK_TRANSFER', label: msg('Bank') },
];

export const BULK_TYPES = [
  { value: 'WEDDING', label: msg('Shadi'), emoji: '💍' }, { value: 'BIRTHDAY', label: msg('Birthday'), emoji: '🎂' },
  { value: 'CORPORATE', label: msg('Daftar'), emoji: '🏢' }, { value: 'SCHOOL', label: msg('School'), emoji: '🎓' },
  { value: 'RELIGIOUS', label: msg('Mazhabi'), emoji: '🕌' }, { value: 'PARTY', label: msg('Party'), emoji: '🎉' },
  { value: 'CATERING', label: msg('Catering'), emoji: '🍽️' }, { value: 'OTHER', label: msg('Aur koi'), emoji: '📦' },
];

type Opt = { value: string; label: string; emoji: string };

export const SIZES: Opt[] = [
  { value: 'MINI', label: msg('Mini'), emoji: '🎂' }, { value: 'SMALL', label: msg('Small'), emoji: '🎂' }, { value: 'MEDIUM', label: msg('Medium'), emoji: '🎂' },
  { value: 'LARGE', label: msg('Large'), emoji: '🎂' }, { value: 'EXTRA_LARGE', label: msg('Extra Large'), emoji: '🎂' },
  { value: 'HALF_POUND', label: msg('½ Pound'), emoji: '⚖️' }, { value: 'ONE_POUND', label: msg('1 Pound'), emoji: '⚖️' }, { value: 'ONE_HALF_POUND', label: msg('1½ Pound'), emoji: '⚖️' },
  { value: 'TWO_POUND', label: msg('2 Pound'), emoji: '⚖️' }, { value: 'THREE_POUND', label: msg('3 Pound'), emoji: '⚖️' }, { value: 'FIVE_POUND', label: msg('5 Pound'), emoji: '⚖️' },
  { value: 'HALF_KG', label: msg('½ Kg'), emoji: '⚖️' }, { value: 'ONE_KG', label: msg('1 Kg'), emoji: '⚖️' }, { value: 'ONE_HALF_KG', label: msg('1½ Kg'), emoji: '⚖️' },
  { value: 'TWO_KG', label: msg('2 Kg'), emoji: '⚖️' }, { value: 'THREE_KG', label: msg('3 Kg'), emoji: '⚖️' }, { value: 'FIVE_KG', label: msg('5 Kg'), emoji: '⚖️' },
  { value: 'TEN_KG', label: msg('10 Kg'), emoji: '⚖️' }, { value: 'SLICE', label: msg('Slice'), emoji: '🍰' }, { value: 'DOZEN', label: msg('Dozen'), emoji: '📦' },
  { value: 'HALF_DOZEN', label: msg('½ Dozen'), emoji: '📦' }, { value: 'TRAY', label: msg('Tray'), emoji: '🍱' }, { value: 'BOX', label: msg('Box'), emoji: '📦' },
  { value: 'CUSTOM', label: msg('Custom'), emoji: '⚙️' },
];
export const QUICK_SIZES = ['HALF_POUND', 'ONE_POUND', 'TWO_POUND', 'THREE_POUND', 'FIVE_POUND', 'ONE_KG', 'TWO_KG', 'CUSTOM'];

export const SHAPES: Opt[] = [
  { value: 'ROUND', label: msg('Round'), emoji: '⭕' }, { value: 'SQUARE', label: msg('Square'), emoji: '⬛' }, { value: 'RECTANGLE', label: msg('Rectangle'), emoji: '▬' },
  { value: 'HEART', label: msg('Heart'), emoji: '❤️' }, { value: 'OVAL', label: msg('Oval'), emoji: '⬭' }, { value: 'TIER_2', label: msg('2-Tier'), emoji: '🎂' },
  { value: 'TIER_3', label: msg('3-Tier'), emoji: '🏛️' }, { value: 'TIER_4', label: msg('4-Tier'), emoji: '🏛️' }, { value: 'TIER_5', label: msg('5-Tier'), emoji: '🏛️' },
  { value: 'NUMBER', label: msg('Number'), emoji: '🔢' }, { value: 'LETTER', label: msg('Letter'), emoji: '🔤' }, { value: 'CHARACTER', label: msg('Character'), emoji: '🦄' },
  { value: 'CUSTOM_SHAPE', label: msg('Custom'), emoji: '✨' },
];
export const TIER_SHAPES = ['TIER_2', 'TIER_3', 'TIER_4', 'TIER_5'];

export const FLAVORS: Opt[] = [
  { value: 'VANILLA', label: msg('Vanilla'), emoji: '🤍' }, { value: 'CHOCOLATE', label: msg('Chocolate'), emoji: '🍫' }, { value: 'STRAWBERRY', label: msg('Strawberry'), emoji: '🍓' },
  { value: 'BLACK_FOREST', label: msg('Black Forest'), emoji: '🍒' }, { value: 'RED_VELVET', label: msg('Red Velvet'), emoji: '❤️' }, { value: 'PINEAPPLE', label: msg('Pineapple'), emoji: '🍍' },
  { value: 'MANGO', label: msg('Mango'), emoji: '🥭' }, { value: 'BUTTERSCOTCH', label: msg('Butterscotch'), emoji: '🍯' }, { value: 'COFFEE', label: msg('Coffee'), emoji: '☕' },
  { value: 'CARAMEL', label: msg('Caramel'), emoji: '🍮' }, { value: 'BLUEBERRY', label: msg('Blueberry'), emoji: '🫐' }, { value: 'RASPBERRY', label: msg('Raspberry'), emoji: '🫐' },
  { value: 'LEMON', label: msg('Lemon'), emoji: '🍋' }, { value: 'ORANGE', label: msg('Orange'), emoji: '🍊' }, { value: 'BANANA', label: msg('Banana'), emoji: '🍌' },
  { value: 'CARROT', label: msg('Carrot'), emoji: '🥕' }, { value: 'FRUIT', label: msg('Fruit'), emoji: '🍇' }, { value: 'TIRAMISU', label: msg('Tiramisu'), emoji: '☕' },
  { value: 'OREO', label: msg('Oreo'), emoji: '⚫' }, { value: 'KITKAT', label: msg('KitKat'), emoji: '🍫' }, { value: 'FERRERO_ROCHER', label: msg('Ferrero'), emoji: '🌰' },
  { value: 'NUTELLA', label: msg('Nutella'), emoji: '🍫' }, { value: 'CHEESECAKE', label: msg('Cheesecake'), emoji: '🍰' }, { value: 'ICE_CREAM', label: msg('Ice Cream'), emoji: '🍦' },
  { value: 'MIXED', label: msg('Mixed'), emoji: '🌈' }, { value: 'CUSTOM_FLAVOR', label: msg('Custom'), emoji: '✨' },
];

export const CREAMS: Opt[] = [
  { value: 'BUTTERCREAM', label: msg('Buttercream'), emoji: '🧈' }, { value: 'WHIPPED_CREAM', label: msg('Whipped Cream'), emoji: '☁️' },
  { value: 'FRESH_CREAM', label: msg('Fresh Cream'), emoji: '🥛' }, { value: 'GANACHE', label: msg('Ganache'), emoji: '🍫' }, { value: 'FONDANT', label: msg('Fondant'), emoji: '✨' },
  { value: 'CREAM_CHEESE', label: msg('Cream Cheese'), emoji: '🧀' }, { value: 'ROYAL_ICING', label: msg('Royal Icing'), emoji: '👑' }, { value: 'MERINGUE', label: msg('Meringue'), emoji: '☁️' },
  { value: 'MOUSSE', label: msg('Mousse'), emoji: '🫧' }, { value: 'MIRROR_GLAZE', label: msg('Mirror Glaze'), emoji: '💎' }, { value: 'OTHER', label: msg('Other'), emoji: '⭐' },
];

export const OCCASIONS: Opt[] = [
  { value: 'BIRTHDAY', label: msg('Birthday'), emoji: '🎉' }, { value: 'WEDDING', label: msg('Wedding'), emoji: '💒' }, { value: 'ANNIVERSARY', label: msg('Anniversary'), emoji: '💝' },
  { value: 'ENGAGEMENT', label: msg('Engagement'), emoji: '💍' }, { value: 'BABY_SHOWER', label: msg('Baby Shower'), emoji: '👶' }, { value: 'GRADUATION', label: msg('Graduation'), emoji: '🎓' },
  { value: 'FAREWELL', label: msg('Farewell'), emoji: '👋' }, { value: 'CORPORATE', label: msg('Corporate'), emoji: '💼' }, { value: 'MEHNDI', label: msg('Mehndi'), emoji: '🎨' },
  { value: 'AQEEQA', label: msg('Aqeeqa'), emoji: '👶' }, { value: 'EID', label: msg('Eid'), emoji: '🌙' }, { value: 'CHRISTMAS', label: msg('Christmas'), emoji: '🎄' },
  { value: 'NEW_YEAR', label: msg('New Year'), emoji: '🎊' }, { value: 'VALENTINES', label: msg('Valentine\'s'), emoji: '💕' }, { value: 'MOTHERS_DAY', label: msg('Mother\'s Day'), emoji: '👩' },
  { value: 'FATHERS_DAY', label: msg('Father\'s Day'), emoji: '👨' }, { value: 'PROMOTION', label: msg('Promotion'), emoji: '🏆' }, { value: 'HOUSEWARMING', label: msg('Housewarming'), emoji: '🏡' },
  { value: 'OTHER', label: msg('Other'), emoji: '⭐' },
];

export const DECORATIONS: string[] = [msg('Phool'), msg('Fondant figure'), msg('Sprinkles'), msg('Chocolate drip'), msg('Taaza phal'), msg('Gold leaf'), msg('Topper'), msg('Macarons'), msg('Pearls'), msg('Ghubbare')];
export const ALLERGIES: string[] = [msg('Nuts'), msg('Mungphali'), msg('Doodh'), msg('Gluten'), msg('Soya')];

export const RAW_CATEGORIES: Opt[] = [
  { value: 'FLOUR', label: msg('Aata / Maida'), emoji: '🌾' }, { value: 'SUGAR', label: msg('Cheeni'), emoji: '🍬' }, { value: 'DAIRY', label: msg('Doodh / Cream'), emoji: '🥛' },
  { value: 'EGG', label: msg('Anday'), emoji: '🥚' }, { value: 'FAT', label: msg('Ghee / Oil'), emoji: '🫒' }, { value: 'CHOCOLATE', label: msg('Chocolate'), emoji: '🍫' },
  { value: 'FRUIT', label: msg('Phal / Nuts'), emoji: '🍓' }, { value: 'FLAVOR', label: msg('Flavour'), emoji: '🧪' }, { value: 'DECORATION', label: msg('Sajawat'), emoji: '✨' },
  { value: 'PACKAGING', label: msg('Packing'), emoji: '📦' }, { value: 'GENERAL', label: msg('Aur koi'), emoji: '🧺' },
];
export const RAW_UNITS = ['kg', 'gram', 'litre', 'ml', 'packet', 'dozen', 'piece', 'bag', 'tin', 'bottle'];
export const rawCategoryOf = (v?: string | null) => RAW_CATEGORIES.find((c) => c.value === v) ?? { value: v ?? 'GENERAL', label: v || msg('Aur koi'), emoji: '🧺' };

export const ITEM_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PLANNED: { label: msg('Banana hai'), tone: 'neutral' },
  IN_PROGRESS: { label: msg('Kaam chal raha'), tone: 'info' },
  BAKING: { label: msg('Oven me'), tone: 'warning' },
  COOLING: { label: msg('Thanda ho raha'), tone: 'info' },
  DECORATING: { label: msg('Sajawat'), tone: 'accent' },
  QUALITY_CHECK: { label: msg('Check ho raha'), tone: 'accent' },
  COMPLETED: { label: msg('Ban gaya'), tone: 'success' },
  FAILED: { label: msg('Kharab hua'), tone: 'danger' },
  ON_HOLD: { label: msg('Roka hua'), tone: 'warning' },
};
export const itemStatus = (s?: string | null) => ITEM_STATUS[s ?? 'PLANNED'] ?? ITEM_STATUS.PLANNED;
export const SHIFTS = [msg('Subah'), msg('Dopahar'), msg('Shaam'), msg('Raat')];

export const SOURCE: Record<WasteSource, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  BATCH: { label: msg('Shelf se phenka'), icon: Trash2, tone: 'danger' },
  BAKING: { label: msg('Banate waqt kharab'), icon: ChefHat, tone: 'warning' },
  RAW: { label: msg('Raw material'), icon: Wheat, tone: 'accent' },
  DAMAGE: { label: msg('Damage report'), icon: Package, tone: 'info' },
};

/* ───────────────────────── words ───────────────────────── */

const nice = (s?: string | null) => String(s ?? '').replace(/_/g, ' ').toLowerCase();
export const labelOf = (list: Opt[], v?: string | null) => { const o = list.find((x) => x.value === v); return o ? t(o.label) : nice(v); };
export const sizeLabel = (v?: string | null) => labelOf(SIZES, v);
export const flavorLabel = (v?: string | null) => labelOf(FLAVORS, v);
export const shapeLabel = (v?: string | null) => labelOf(SHAPES, v);
export const creamLabel = (v?: string | null) => labelOf(CREAMS, v);
export const occasionOf = (v?: string | null) => OCCASIONS.find((o) => o.value === v) ?? { value: v ?? 'OTHER', label: v ? nice(v) : msg('Aur koi'), emoji: '⭐' };
export const bulkTypeOf = (v?: string | null) => BULK_TYPES.find((x) => x.value === v) ?? { value: v ?? 'OTHER', label: v ? nice(v) : msg('Aur koi'), emoji: '📦' };

/** "Birthday · 2 Pound · Chocolate". */
export function cakeLine(o: Pick<CakeOrder, 'occasion' | 'size' | 'flavor' | 'customWeightKg' | 'customFlavorDesc' | 'productName'>) {
  return [
    o.productName,
    t(occasionOf(o.occasion).label),
    o.size === 'CUSTOM' && o.customWeightKg ? `${o.customWeightKg} kg` : sizeLabel(o.size),
    o.flavor === 'CUSTOM_FLAVOR' && o.customFlavorDesc ? o.customFlavorDesc : flavorLabel(o.flavor),
  ].filter(Boolean).join(' · ');
}

/** "3 ghante me", "2 din late". */
export function leftText(h: number | null): string {
  const l = leftOf(h);
  switch (l.kind) {
    case 'none': return t('Date nahi');
    case 'minutesLate': return t('{{value}} minute late', { value: l.value });
    case 'hoursLate': return t('{{p}} ghante late', { p: l.value });
    case 'daysLate': return t('{{value}} din late', { value: l.value });
    case 'minutes': return t('{{value}} minute me', { value: l.value });
    case 'hours': return t('{{h}} ghante me', { h: l.value });
    default: return t('{{value}} din baad', { value: l.value });
  }
}

export const dateTime = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');
export const dayOnly = (iso?: string | null) => (iso ? formatDate(iso, { year: true }) : '—');
export const timeOnly = (iso?: string | null) => (iso ? formatTime(iso) : '');

/* ───────────────────────── WhatsApp ───────────────────────── */

/** Cake order text in the shop's bill language (customer documents follow the shop setting). */
export function cakeText(o: CakeOrder, shop: string, lang: MessageLang) {
  const due = dueOf(o);
  return cakeMessage({
    customer: o.customerName, shop, number: o.orderNumber, confirmed: !['DRAFT', 'QUOTED'].includes(o.status), cake: cakeLine(o),
    messageOnCake: o.messageOnCake, delivered: isDelivery(o.deliveryType), when: dateTime(o.neededBy), address: o.deliveryAddress,
    total: formatMoney(o.total), paid: o.paidAmount > 0 ? formatMoney(o.paidAmount) : null, due: due > 0 ? formatMoney(due) : null, status: t(statusOf(o.status).label),
  }, lang);
}

export function bulkText(o: BulkOrder, shop: string, lang: MessageLang) {
  const total = bulkPrice(o);
  const due = Math.max(total - Number(o.paidAmount || 0), 0);
  return bulkMessage({
    contact: o.contactPerson, shop, number: o.orderNumber, confirmed: !['DRAFT', 'QUOTED'].includes(o.status), event: t(bulkTypeOf(o.orderType).label),
    when: dateTime(o.eventDate), venue: o.venue, items: bulkLines(o.items).map((l) => `${l.name} × ${l.qty}`),
    total: formatMoney(total), paid: o.paidAmount > 0 ? formatMoney(o.paidAmount) : null, due: due > 0 ? formatMoney(due) : null,
  }, lang);
}
