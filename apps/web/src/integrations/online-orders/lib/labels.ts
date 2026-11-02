import { createElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BrandLogo, brandForChannel, brandForCourier, type BrandName } from '@/assets/brands/BrandLogo';
import type { OnlineOrderStatus } from '../api/online-orders.api';
import { t } from '@core/i18n';

export const STATUS_LABEL: Record<OnlineOrderStatus, { label: string; short: string; tone: string; dot: string }> = {
  PENDING:          { label: t('Naya order'),    short: t('Naya'),     tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',       dot: 'bg-amber-500' },
  ACCEPTING:        { label: t('Bill ban raha'), short: t('Ruko…'),    tone: 'bg-slate-100 text-slate-700 dark:bg-ink-700/40 dark:text-ink-300',       dot: 'bg-slate-400' },
  CONFIRMED:        { label: t('Accept ho gaya'), short: t('Accept'),  tone: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',               dot: 'bg-sky-500' },
  PREPARING:        { label: t('Tayyar ho raha'), short: t('Packing'), tone: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',   dot: 'bg-indigo-500' },
  READY:            { label: t('Pack ho gaya'),  short: t('Ready'),    tone: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',   dot: 'bg-violet-500' },
  OUT_FOR_DELIVERY: { label: t('Raste me hai'),  short: t('Raste me'), tone: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',   dot: 'bg-orange-500' },
  DELIVERED:        { label: t('Deliver ho gaya'), short: t('Delivered'), tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  CANCELLED:        { label: t('Cancel'),        short: t('Cancel'),   tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',           dot: 'bg-rose-500' },
  REJECTED:         { label: t('Reject'),        short: t('Reject'),   tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',           dot: 'bg-rose-500' },
  RETURNED:         { label: t('Wapas aaya (RTO)'), short: t('RTO'),    tone: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300', dot: 'bg-fuchsia-500' },
};

/** Agle qadam ka button — "kya karna hai" saaf likha ho */
export const NEXT_ACTION: Partial<Record<OnlineOrderStatus, string>> = {
  CONFIRMED: t('Packing shuru'),
  PREPARING: t('Pack ho gaya'),
  READY: t('Rider ko de diya'),
  OUT_FOR_DELIVERY: t('Deliver ho gaya'),
};

export const PLATFORM: Record<string, { label: string; emoji: string; color: string }> = {
  woocommerce: { label: 'WooCommerce', emoji: '🟣', color: '#7f54b3' },
  wordpress:   { label: 'WordPress',   emoji: '🔵', color: '#21759b' },
  shopify:     { label: 'Shopify',     emoji: '🟢', color: '#95bf47' },
  custom:      { label: t('Website'),     emoji: '🌐', color: '#10b981' },
};

export const SOURCE_BY_TYPE: Record<string, { label: string; emoji: string }> = {
  CUSTOM_WEBSITE: { label: t('Website'), emoji: '🌐' },
  DARAZ:          { label: 'Daraz', emoji: '🛒' },
  FOODPANDA:      { label: 'Foodpanda', emoji: '🍔' },
  SHOPIFY:        { label: 'Shopify', emoji: '🟢' },
  WOOCOMMERCE:    { label: 'WooCommerce', emoji: '🟣' },
};

export function sourceOf(o: { platform?: string; integration?: { type: string }; metadata?: { platform?: string } | null }): { label: string; emoji: string; brand: BrandName } {
  const platform = o.platform ?? o.metadata?.platform;
  const brand = brandForChannel(o.integration?.type, { platform });
  if (o.integration?.type && o.integration.type !== 'CUSTOM_WEBSITE') {
    return { ...(SOURCE_BY_TYPE[o.integration.type] ?? { label: o.integration.type, emoji: '🔌' }), brand };
  }
  const p = PLATFORM[platform ?? 'custom'] ?? PLATFORM.custom;
  return { label: p.label, emoji: p.emoji, brand };
}

const brandIcons = new Map<BrandName, LucideIcon>();
/** A brand logo shaped like a Lucide icon, for FilterMenu / MoreFilters options. */
export function brandIcon(name: BrandName): LucideIcon {
  let icon = brandIcons.get(name);
  if (!icon) {
    icon = (() => createElement(BrandLogo, { name, size: 24 })) as unknown as LucideIcon;
    brandIcons.set(name, icon);
  }
  return icon;
}

export const rs = (n: number) => `Rs ${Math.round(Number(n) || 0).toLocaleString('en-PK')}`;

export function timeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'abhi';
  const m = Math.floor(s / 60);
  if (m < 60) return t('{{m}} min pehle', { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('{{h}} ghante pehle', { h });
  const d = Math.floor(h / 24);
  return d === 1 ? 'kal' : t('{{d}} din pehle', { d });
}

export function whenText(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

/** 03001234567 → 923001234567 (WhatsApp link ke liye) */
export function waNumber(phone?: string | null): string | null {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (d.length < 10) return null;
  if (d.startsWith('92')) return d;
  if (d.startsWith('0')) return '92' + d.slice(1);
  if (d.length === 10) return '92' + d;
  return d;
}

/** COD ka paisa kahan hai */
export const PAYMENT_LABEL: Record<string, { label: string; tone: string }> = {
  PAID: { label: t('Paisa mil gaya'), tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  COLLECTED: { label: t('Courier ke paas'), tone: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' },
  NOT_COLLECTED: { label: t('Paisa nahi aaya (RTO)'), tone: 'bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-ink-300' },
  PENDING: { label: t('Baqi'), tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
};

export const COURIER_OPTIONS = [
  { code: 'RIDER', name: 'Apna rider' },
  { code: 'TCS', name: 'TCS' },
  { code: 'LEOPARDS', name: 'Leopards' },
  { code: 'POSTEX', name: 'PostEx' },
  { code: 'TRAX', name: 'Trax' },
  { code: 'MNP', name: 'M&P' },
  { code: 'BLUE_EX', name: 'BlueEx' },
  { code: 'CALL_COURIER', name: 'Call Courier' },
  { code: 'DAEWOO', name: 'Daewoo FastEx' },
  { code: 'TPL_RIDER', name: 'Rider (TPL)' },
  { code: 'OTHER', name: 'Doosra' },
];

/** Courier code or the name shown on an order (e.g. "TCS", "M&P", "Apna rider") → logo. */
export function courierBrand(nameOrCode?: string | null): BrandName {
  const direct = brandForCourier(nameOrCode);
  if (direct !== 'other') return direct;
  const k = String(nameOrCode ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!k) return 'other';
  if (k.startsWith('TCS')) return 'tcs';
  if (k.includes('LEOPARD')) return 'leopards';
  if (k.includes('POSTEX')) return 'postex';
  if (k.includes('TRAX')) return 'trax';
  if (k === 'MP' || k.startsWith('MNP') || k.includes('MULLER')) return 'mnp';
  if (k.includes('CALLCOURIER')) return 'callcourier';
  if (k.includes('BLUEEX') || k === 'BLUEX') return 'blueex';
  if (k.includes('DAEWOO')) return 'daewoo';
  if (k.includes('TPL')) return 'tpl';
  if (k.includes('RIDER')) return 'rider';
  return 'other';
}
