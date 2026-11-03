/** Florist labels and helpers (mirror of the web florist lib/meta.ts). Labels are source keys marked with msg(). */

import { queryClient } from '@/core/query/client';
import { msg, t } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { DeliverySlot, OrderStatus, OrderType } from './api';

export const FLORIST_KEYS = { orders: 'florist-orders', weddings: 'florist-weddings', subscriptions: 'florist-subscriptions', freshness: 'florist-freshness', profiles: 'florist-profiles', overview: 'florist-dashboard-overview' } as const;

const MONEY_KEYS = ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'cash-register', 'inv', 'offline'];
export function refreshFlorist(keys: string[], money = false) {
  [...keys, FLORIST_KEYS.overview, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: msg('Kacha'), tone: 'neutral' }, CONFIRMED: { label: msg('Pakka'), tone: 'info' }, IN_PREPARATION: { label: msg('Ban raha hai'), tone: 'warning' },
  READY_FOR_DELIVERY: { label: msg('Tayyar'), tone: 'accent' }, OUT_FOR_DELIVERY: { label: msg('Raste me'), tone: 'brand' }, DELIVERED: { label: msg('Pohanch gaya'), tone: 'success' },
  CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};
export const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  DRAFT: msg('Pakka karein'), CONFIRMED: msg('Banana shuru'), IN_PREPARATION: msg('Tayyar hai'), READY_FOR_DELIVERY: msg('Rider ko diya'),
};
export const ORDER_TYPE: Record<OrderType, string> = {
  WALK_IN: msg('Counter se'), DELIVERY: msg('Ghar delivery'), EVENT: msg('Event / function'), WEDDING: msg('Shaadi'), SUBSCRIPTION: msg('Subscription'), CORPORATE: msg('Office / company'),
};
export const orderTypeLabel = (v?: string | null) => (v && v in ORDER_TYPE ? t(ORDER_TYPE[v as OrderType]) : v || '—');
export const SLOT: Record<DeliverySlot, string> = {
  MORNING_9_12: msg('Subah 9–12'), AFTERNOON_12_3: msg('Dopahar 12–3'), EVENING_3_6: msg('Shaam 3–6'), NIGHT_6_9: msg('Raat 6–9'), URGENT: msg('Foran (2 ghante)'), SCHEDULED: msg('Khaas waqt'),
};
export const slotLabel = (v?: string | null) => (v && v in SLOT ? t(SLOT[v as DeliverySlot]) : '');

export const WEDDING_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  QUOTED: { label: msg('Quote diya'), tone: 'neutral' }, CONFIRMED: { label: msg('Pakka'), tone: 'info' }, IN_PROGRESS: { label: msg('Kaam jari'), tone: 'warning' },
  COMPLETED: { label: msg('Mukammal'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};
export const SUB_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Chalu'), tone: 'success' }, PAUSED: { label: msg('Ruki hui'), tone: 'warning' }, CANCELLED: { label: msg('Band'), tone: 'neutral' },
};
export const FREQUENCY: Record<string, string> = { DAILY: msg('Roz'), WEEKLY: msg('Har hafta'), BIWEEKLY: msg('Har 2 hafte'), MONTHLY: msg('Har mahina') };
export const frequencyLabel = (v: string) => t(FREQUENCY[v] ?? v);

export const CATEGORY_GROUPS: Array<{ id: 'stem' | 'made' | 'decor' | 'plant' | 'gift'; label: string; items: Array<[string, string]> }> = [
  { id: 'stem', label: msg('Khule phool'), items: [
    ['ROSE_RED', msg('Gulab laal')], ['ROSE_WHITE', msg('Gulab safed')], ['ROSE_PINK', msg('Gulab gulabi')], ['ROSE_YELLOW', msg('Gulab peela')], ['ROSE_MIXED', msg('Gulab mix')],
    ['TULIP', msg('Tulip')], ['LILY', msg('Lily')], ['ORCHID', msg('Orchid')], ['SUNFLOWER', msg('Sunflower')], ['CARNATION', msg('Carnation')], ['GERBERA', msg('Gerbera')],
    ['CHRYSANTHEMUM', msg('Guldaudi')], ['DAISY', msg('Daisy')], ['JASMINE', msg('Motia')], ['MARIGOLD', msg('Genda')], ['IRIS', msg('Iris')], ['HYDRANGEA', msg('Hydrangea')],
    ['PEONY', msg('Peony')], ['ANTHURIUM', msg('Anthurium')], ['BIRD_OF_PARADISE', msg('Bird of paradise')], ['BABY_BREATH', msg("Baby's breath")], ['GREENERY_FILLER', msg('Hariyali / filler')],
  ] },
  { id: 'made', label: msg('Bouquet / arrangement'), items: [
    ['BOUQUET_BIRTHDAY', msg('Birthday bouquet')], ['BOUQUET_ANNIVERSARY', msg('Anniversary bouquet')], ['BOUQUET_WEDDING', msg('Shaadi bouquet')], ['BOUQUET_ROMANCE', msg('Romance bouquet')],
    ['BOUQUET_CONDOLENCE', msg('Taziyat bouquet')], ['BOUQUET_GET_WELL', msg('Get well bouquet')], ['BOUQUET_CONGRATULATIONS', msg('Mubarakbad bouquet')], ['BOUQUET_MIXED', msg('Mix bouquet')],
    ['BASKET_ARRANGEMENT', msg('Tokri')], ['VASE_ARRANGEMENT', msg('Vase arrangement')], ['BOX_ARRANGEMENT', msg('Box arrangement')], ['TABLE_CENTREPIECE', msg('Table centrepiece')],
    ['STANDING_ARRANGEMENT', msg('Stand arrangement')], ['BRIDAL_BOUQUET', msg('Dulhan bouquet')], ['BOUTONNIERE', msg('Boutonniere')], ['FUNERAL_WREATH', msg('Wreath')], ['SYMPATHY_ARRANGEMENT', msg('Taziyat arrangement')],
  ] },
  { id: 'decor', label: msg('Sajawat / haar'), items: [['WEDDING_GARLAND', msg('Haar / sehra')], ['CAR_DECORATION', msg('Gaari sajawat')], ['STAGE_DECORATION', msg('Stage sajawat')], ['MEHNDI_DECORATION', msg('Mehndi sajawat')]] },
  { id: 'plant', label: msg('Paude'), items: [['POTTED_PLANT_INDOOR', msg('Gamla (andar)')], ['POTTED_PLANT_OUTDOOR', msg('Gamla (bahar)')], ['SUCCULENT', msg('Succulent')], ['BONSAI', msg('Bonsai')], ['AIR_PLANT', msg('Air plant')]] },
  { id: 'gift', label: msg('Gift / saman'), items: [
    ['CHOCOLATE_BOX', msg('Chocolate')], ['TEDDY_BEAR', msg('Teddy')], ['BALLOON', msg('Balloon')], ['GREETING_CARD', msg('Card')], ['GIFT_ITEM', msg('Gift')],
    ['VASE_EMPTY', msg('Khali vase')], ['RIBBON', msg('Ribbon')], ['WRAPPING_PAPER', msg('Wrapping')], ['FLORAL_FOAM', msg('Foam')], ['OTHER', msg('Aur')],
  ] },
];
const CATEGORY_LABEL = new Map(CATEGORY_GROUPS.flatMap((g) => g.items));
export const categoryLabel = (v?: string | null) => (v ? t(CATEGORY_LABEL.get(v) ?? v) : '—');

export const OCCASIONS = [msg('Birthday'), msg('Anniversary'), msg('Shaadi'), msg('Mehndi'), msg('Valentine'), msg('Eid'), msg('Get well'), msg('Taziyat'), msg('Mubarakbad'), msg('Mother day'), msg('Office')];
export const COLORS = [msg('Laal'), msg('Safed'), msg('Gulabi'), msg('Peela'), msg('Narangi'), msg('Jamni'), msg('Mix')];
export const SIZES = [msg('Chhota'), msg('Darmiyana'), msg('Bara'), msg('Bohat bara')];
export const WRAPS = [msg('Kaghaz'), msg('Jute'), msg('Box'), msg('Tokri'), msg('Vase')];
