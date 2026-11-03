/** Agri labels, tones and small helpers (mirror of the web agri lib/meta.ts). Labels are source keys marked with msg(). */

import { certState, type AgriKind, type OrderStatus } from '@nafaa/core/industries/agri';
import { businessDayKey } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';

export const AGRI_KEYS = {
  farmers: 'agri-farmers', farmer: 'agri-farmer', orders: 'agri-orders', advisory: 'agri-advisory', plans: 'agri-plans', subsidy: 'agri-subsidy',
  facts: 'agri-product-facts', profile: 'agri-profile', ops: 'agri-ops', byCustomer: 'agri-farmer-by-customer',
} as const;

/** Screens that show the same money. */
const MONEY_KEYS = ['customers-directory', 'customer', 'customer-ledger', 'sales-history', 'dashboard', 'cash-register', 'inv', 'offline'];
export function refreshAgri(keys: string[], money = false) {
  [...keys, AGRI_KEYS.ops, ...(money ? MONEY_KEYS : [])].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const CROPS = [msg('Gandum'), msg('Kapas'), msg('Chawal'), msg('Makai'), msg('Ganna'), msg('Aloo'), msg('Chana'), msg('Sarson'), msg('Chara'), msg('Pyaz'), msg('Tamatar'), msg('Mirch'), msg('Sabzi'), msg('Baagh')];

export const SEASONS: Array<{ value: string; label: string; emoji: string }> = [
  { value: 'KHARIF', label: msg('Kharif'), emoji: '🌧️' }, { value: 'RABI', label: msg('Rabi'), emoji: '❄️' },
  { value: 'ZAID', label: msg('Zaid'), emoji: '☀️' }, { value: 'ALL_SEASON', label: msg('Har season'), emoji: '🔄' },
];
const SEASON_LABEL: Record<string, string> = {
  RABI: msg('Rabi'), KHARIF: msg('Kharif'), ZAID: msg('Zaid'), ALL_SEASON: msg('Har season'), SPRING: msg('Bahar'), SUMMER: msg('Garmi'), MONSOON: msg('Barsaat'), WINTER: msg('Sardi'),
};
export const seasonLabel = (s?: string | null) => (s ? t(SEASON_LABEL[s] ?? s) : '—');

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: msg('Draft'), tone: 'neutral' }, PENDING: { label: msg('Baqi'), tone: 'warning' }, CONFIRMED: { label: msg('Pakka'), tone: 'info' },
  PROCESSING: { label: msg('Tayyari'), tone: 'accent' }, READY: { label: msg('Tayyar'), tone: 'accent' }, OUT_FOR_DELIVERY: { label: msg('Raste me'), tone: 'accent' },
  DELIVERED: { label: msg('Pahunch gaya'), tone: 'success' }, RETURNED: { label: msg('Wapas'), tone: 'danger' }, CANCELLED: { label: msg('Cancel'), tone: 'neutral' },
};
export const CLAIM_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: msg('Baqi'), tone: 'warning' }, APPROVED: { label: msg('Manzoor'), tone: 'info' },
  DISBURSED: { label: msg('Paisa mil gaya'), tone: 'success' }, REJECTED: { label: msg('Radd'), tone: 'danger' },
};
export const FARMER_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Chalu'), tone: 'success' }, SUSPENDED: { label: msg('Roka hua'), tone: 'danger' }, DEFAULTED: { label: msg('Wasooli nahi hui'), tone: 'danger' },
  CLOSED: { label: msg('Band'), tone: 'neutral' }, PENDING_APPROVAL: { label: msg('Baqi'), tone: 'warning' },
};

export const KIND_LABEL: Record<AgriKind, string> = {
  SEEDS: msg('Beej'), FERTILIZER: msg('Khaad'), PESTICIDE: msg('Keeray ki dawa'), HERBICIDE: msg('Ghaas ki dawa'), FUNGICIDE: msg('Fungus ki dawa'), INSECTICIDE: msg('Insecticide'),
  ANIMAL_FEED: msg('Jaanwar ka feed'), POULTRY_FEED: msg('Murghi ka feed'), CATTLE_FEED: msg('Mawayshi feed'), FISH_FEED: msg('Machhli feed'), VETERINARY_MEDICINE: msg('Jaanwar ki dawa'),
  FARM_TOOLS: msg('Auzaar'), IRRIGATION: msg('Paani ka saamaan'), MACHINERY_PART: msg('Machine ka purza'), MULCH_COVER: msg('Tarpal / cover'), GROWTH_HORMONE: msg('Growth hormone'),
  SOIL_CONDITIONER: msg('Zameen sudhaar'), PLANT_NUTRIENT: msg('Poday ki ghiza'), ORGANIC_INPUT: msg('Organic'), OTHER: msg('Aur koi'),
};
export const KIND_EMOJI: Record<AgriKind, string> = {
  SEEDS: '🌱', FERTILIZER: '🧪', PESTICIDE: '🐛', HERBICIDE: '🌿', FUNGICIDE: '🍄', INSECTICIDE: '🦟', ANIMAL_FEED: '🐄', POULTRY_FEED: '🐔', CATTLE_FEED: '🐂', FISH_FEED: '🐟',
  VETERINARY_MEDICINE: '💊', FARM_TOOLS: '🔧', IRRIGATION: '💧', MACHINERY_PART: '⚙️', MULCH_COVER: '🏕️', GROWTH_HORMONE: '🧬', SOIL_CONDITIONER: '🪱', PLANT_NUTRIENT: '🌿', ORGANIC_INPUT: '♻️', OTHER: '📦',
};
export const kindLabel = (k?: string | null) => (k && k in KIND_LABEL ? t(KIND_LABEL[k as AgriKind]) : '—');

export const AGRI_UNITS: Array<{ value: string; label: string }> = [
  { value: 'bag', label: msg('Bori') }, { value: 'kg', label: msg('Kilo') }, { value: 'ton', label: msg('Ton') }, { value: 'gram', label: msg('Gram') }, { value: 'litre', label: msg('Litre') },
  { value: 'ml', label: msg('ML') }, { value: 'bottle', label: msg('Bottle') }, { value: 'packet', label: msg('Packet') }, { value: 'pcs', label: msg('Piece') }, { value: 'bundle', label: msg('Bundle') },
];

export const PAY_METHODS = [
  { value: 'CASH', label: msg('Cash') }, { value: 'BANK_TRANSFER', label: msg('Bank') }, { value: 'JAZZCASH', label: msg('JazzCash') },
  { value: 'EASYPAISA', label: msg('Easypaisa') }, { value: 'CARD', label: msg('Card') }, { value: 'CHEQUE', label: msg('Cheque') },
];

export const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Gilgit-Baltistan', 'AJK', 'ICT'];
export const FARMING = [msg('Fasal'), msg('Mawayshi'), msg('Murghi'), msg('Dairy'), msg('Baghbani'), msg('Machhli')];
export const SOILS = [msg('Maira'), msg('Chikni'), msg('Reti'), msg('Kallar'), msg('Rohi')];
export const WATER = [msg('Nehar'), msg('Tube well'), msg('Barish'), msg('Nehar + tube well'), msg('Drip / sprinkler')];
export const OWNERSHIP = [msg('Apni'), msg('Theke par'), msg('Batai par'), msg('Mushtarka')];

/** Registration text for a product (counter warning, product detail). */
export function certText(expiry?: string | null): { state: ReturnType<typeof certState>['state']; text: string } {
  const c = certState(expiry);
  if (c.state === 'none') return { state: 'none', text: t('Registration ki date nahi bhari') };
  const days = Math.abs(c.days ?? 0);
  if (c.state === 'expired') return { state: 'expired', text: t('Registration {{days}} din pehle khatam — bechna ghair-qanooni hai', { days }) };
  if (c.state === 'soon') return { state: 'soon', text: t('Registration {{days}} din me khatam — renew karwa lein', { days }) };
  return { state: 'ok', text: t('Registration {{days}} din aur chalegi', { days }) };
}

export const todayKey = () => businessDayKey();
export const qty = (n: number) => String(Number((Number(n) || 0).toFixed(2)));
export const opt = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
/** Whole days from today to a stored moment (negative: past). */
export function daysTo(iso?: string | null): number | null {
  if (!iso) return null;
  const a = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${todayKey()}T00:00:00Z`);
  return Number.isNaN(a) ? null : Math.round((a - b) / 86_400_000);
}
export function dayPhrase(d: number | null): string {
  if (d === null) return '—';
  if (d === 0) return t('Aaj');
  if (d === 1) return t('Kal');
  if (d === -1) return t('kal guzra');
  return d > 0 ? t('{{d}} din me', { d }) : t('{{value}} din pehle', { value: -d });
}
