/**
 * Jewelry words, units and query keys shared by the jewelry screens (mirror
 * of the web jewelry lib/meta.ts). Labels are source keys marked with msg()
 * and translated where shown. The price maths is in @nafaa/core/industries/jewelry.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  TOLA, profilePrice, r2, r3, rateMap, type PricedPiece,
} from '@nafaa/core/industries/jewelry';
import { formatDate, formatDateTime, formatNumber } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import { jewelryProductsApi, metalRatesApi, type JewelryCategory, type JewelryFacts, type MetalRate } from './api';

export { TOLA, r2, r3 };

export const KEYS = {
  rates: 'jewelry-rates', profiles: 'jewelry-profiles', orders: 'jewelry-orders', exchanges: 'jewelry-exchanges', karigars: 'jewelry-karigars',
  metal: 'jewelry-metal-stock', repairs: 'jewelry-repairs', dashboard: 'jewelry-dashboard',
} as const;

/** Refreshes jewelry screens, and the shared ones after a bill. */
export function refreshJewelry(keys: string[], bill = false) {
  const all = [...keys, KEYS.dashboard, ...(bill ? ['sales-history', 'customers-directory', 'customer', 'customer-ledger', 'inv', 'offline', 'cash-register'] : [])];
  all.forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}

export const grams = (g: number | null | undefined) => `${formatNumber(r3(Number(g) || 0), { maxDecimals: 3 })} g`;
export const tola = (g: number | null | undefined) => `${formatNumber((Number(g) || 0) / TOLA, { maxDecimals: 3 })} ${t('tola')}`;

export const PURITY_LABEL: Record<string, string> = {
  KARAT_24: '24K', KARAT_22: '22K', KARAT_21: '21K', KARAT_18: '18K', KARAT_14: '14K', KARAT_10: '10K', KARAT_9: '9K',
  STERLING_925: msg('Sterling 925'), SILVER_999: msg('Chandi 999'), SILVER_925: msg('Chandi 925'), SILVER_800: msg('Chandi 800'),
  PLATINUM_950: msg('Platinum 950'), PLATINUM_900: msg('Platinum 900'), OTHER: msg('Doosra'),
};
export const purityLabel = (p?: string | null) => (p ? t(PURITY_LABEL[p] ?? p) : '—');

export const METAL_LABEL: Record<string, string> = {
  GOLD: msg('Sona'), SILVER: msg('Chandi'), PLATINUM: msg('Platinum'), PALLADIUM: msg('Palladium'), ROSE_GOLD: msg('Rose gold'),
  WHITE_GOLD: msg('White gold'), IMITATION: msg('Artificial'), MIXED: msg('Mix'), OTHER: msg('Doosra'),
};
export const metalLabel = (m?: string | null) => (m ? t(METAL_LABEL[m] ?? m) : '—');

export const CATEGORY_LABEL: Record<JewelryCategory, string> = {
  RING: msg('Angoothi'), NECKLACE: msg('Necklace'), EARRINGS: msg('Bundey / earrings'), BANGLE: msg('Choori'), BRACELET: msg('Bracelet'), ANKLET: msg('Payal (anklet)'),
  PENDANT: msg('Pendant'), CHAIN: msg('Chain'), NOSE_PIN: msg('Nath / koka'), NOSE_RING: msg('Nath'), MAANG_TIKKA: msg('Teeka'), JHUMKA: msg('Jhumka'), CHOKER: msg('Choker'),
  MANGALSUTRA: msg('Mangalsutra'), HAAR: msg('Haar'), KUNDAN_SET: msg('Kundan set'), BRIDAL_SET: msg('Bridal set'), KADA: msg('Kara'), PAYAL: msg('Payal'), TOE_RING: msg('Bichhua'),
  BROOCH: msg('Brooch'), CUFFLINK: msg('Cufflink'), TIE_PIN: msg('Tie pin'), WATCH: msg('Ghari'), COIN: msg('Sikka'), BAR: msg('Biscuit / bar'), BULLION: msg('Bullion'),
  BUTTON: msg('Button'), RAKHI: msg('Rakhi'), OTHER: msg('Doosra'),
};
export const categoryLabel = (c?: string | null) => (c ? t(CATEGORY_LABEL[c as JewelryCategory] ?? c) : '—');
export const MAIN_CATEGORIES: JewelryCategory[] = ['RING', 'EARRINGS', 'BANGLE', 'NECKLACE', 'CHAIN', 'PENDANT', 'BRACELET', 'HAAR', 'BRIDAL_SET', 'KUNDAN_SET', 'JHUMKA', 'NOSE_PIN', 'MAANG_TIKKA', 'KADA', 'PAYAL', 'COIN', 'BAR', 'OTHER'];

export const STYLES: Array<[string, string]> = [
  ['TRADITIONAL', msg('Desi / traditional')], ['MODERN', msg('Modern')], ['BRIDAL', msg('Bridal')], ['DAILY_WEAR', msg('Roz pehnne wala')], ['PARTY_WEAR', msg('Party')],
  ['KUNDAN', msg('Kundan')], ['POLKI', msg('Polki')], ['MEENAKARI', msg('Meenakari')], ['JADAU', msg('Jadau')], ['ANTIQUE', msg('Antique')], ['TURKISH', msg('Turkish')],
  ['ITALIAN', msg('Italian')], ['DUBAI', msg('Dubai')], ['HANDMADE', msg('Haath ka bana')], ['MACHINE_MADE', msg('Machine ka bana')], ['OTHER', msg('Doosra')],
];
export const STONES: Array<[string, string]> = [
  ['CZ', msg('Zircon / CZ')], ['DIAMOND', msg('Heera')], ['RUBY', msg('Yaqoot (ruby)')], ['EMERALD', msg('Zamurrad')], ['SAPPHIRE', msg('Neelam')], ['PEARL', msg('Moti')],
  ['KUNDAN_STONE', msg('Kundan')], ['TURQUOISE', msg('Feroza')], ['CORAL', msg('Marjan')], ['OTHER', msg('Doosra')],
];

interface StatusMeta { label: string; tone: StatusTone }
const ORDER_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: msg('Draft'), tone: 'neutral' }, QUOTED: { label: msg('Qeemat batayi'), tone: 'neutral' }, CONFIRMED: { label: msg('Pakka'), tone: 'info' },
  DESIGNING: { label: msg('Design'), tone: 'accent' }, METAL_ISSUED: { label: msg('Karigar ko sona diya'), tone: 'warning' }, IN_PRODUCTION: { label: msg('Ban raha hai'), tone: 'warning' },
  POLISHING: { label: msg('Polish'), tone: 'warning' }, QUALITY_CHECK: { label: msg('Check'), tone: 'accent' }, HALLMARKING: { label: msg('Hallmark'), tone: 'accent' },
  READY: { label: msg('Tayyar'), tone: 'success' }, DELIVERED: { label: msg('De diya'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' }, ON_HOLD: { label: msg('Ruka hua'), tone: 'neutral' },
};
export const orderStatus = (s: string): StatusMeta => ORDER_STATUS[s] ?? { label: s, tone: 'neutral' };

export const REPAIR_STATUS: Record<string, StatusMeta> = {
  RECEIVED: { label: msg('Liya gaya'), tone: 'neutral' }, IN_PROGRESS: { label: msg('Kaam ho raha'), tone: 'warning' }, READY: { label: msg('Tayyar'), tone: 'success' },
  DELIVERED: { label: msg('De diya'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
};

export const ENTRY_LABEL: Record<string, { label: string; in: boolean }> = {
  PURCHASE: { label: msg('Khareed'), in: true }, OPENING: { label: msg('Shuru ka stock'), in: true }, RETURN: { label: msg('Wapsi'), in: true },
  RECEIVE: { label: msg('Karigar se wapas'), in: true }, EXCHANGE_IN: { label: msg('Purana sona aaya'), in: true },
  ISSUE: { label: msg('Karigar ko diya'), in: false }, ADJUSTMENT: { label: msg('Kami / wapas diya'), in: false }, SALE: { label: msg('Becha'), in: false },
};
export const entryLabel = (type: string) => { const e = ENTRY_LABEL[type]; return e ? { label: t(e.label), in: e.in } : { label: type, in: false }; };

export const EXCHANGE_TYPES: Array<{ value: string; label: string }> = [
  { value: 'OLD_GOLD_EXCHANGE', label: msg('Purana sona') }, { value: 'OLD_SILVER_EXCHANGE', label: msg('Purani chandi') }, { value: 'BROKEN_JEWELRY', label: msg('Toota zewar') },
  { value: 'PURE_METAL_DEPOSIT', label: msg('Khalis sona') }, { value: 'COIN_EXCHANGE', label: msg('Sikka / biscuit') }, { value: 'MELT_AND_REMAKE', label: msg('Galane ke liye') },
];
export const exchangeLabel = (type: string) => { const e = EXCHANGE_TYPES.find((x) => x.value === type); return e ? t(e.label) : type; };

export const day = (d?: string | null) => (d ? formatDate(d) : '—');
export const dayTime = (d?: string | null) => (d ? formatDateTime(d) : '—');

/** Today's rates (shared by every jewelry screen). */
export function useMetalRates() {
  const q = useQuery({ queryKey: [KEYS.rates, 'current'], queryFn: metalRatesApi.current, staleTime: 60_000 });
  const rates = useMemo(() => rateMap(q.data), [q.data]);
  return { ...q, rates, list: q.data ?? [] };
}

/** Every piece's karat, weight and charges with its price at today's rates. */
export function useJewelryFacts() {
  const factsQ = useQuery({ queryKey: [KEYS.profiles, 'facts'], queryFn: jewelryProductsApi.facts, staleTime: 60_000 });
  const { rates, list } = useMetalRates();
  const byProduct = useMemo(() => {
    const m = new Map<string, JewelryFacts & { price: ReturnType<typeof profilePrice> }>();
    for (const f of factsQ.data ?? []) m.set(f.productId, { ...f, price: profilePrice(f as PricedPiece, rates) });
    return m;
  }, [factsQ.data, rates]);
  return { byProduct, rates, rateList: list, loading: factsQ.isLoading };
}

export type { MetalRate };
