/** Shared bits of the manager setup screens: keys, weekday names, rule texts, small parsers. */

import { Coins, Gift, Layers, BadgePercent, type LucideIcon } from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import { rs } from './meta';
import { DIST_KEY, type ListBase, type PriceList, type SaveScheme, type SchemeSlab, type SchemeType } from '../api/distribution.api';

export const PRICE_LISTS_KEY = [DIST_KEY, 'price-lists'] as const;
export const ROUTES_KEY = [DIST_KEY, 'routes'] as const;
export const SCHEMES_KEY = [DIST_KEY, 'schemes'] as const;

export const WEEKDAYS = [msg('Sunday'), msg('Monday'), msg('Tuesday'), msg('Wednesday'), msg('Thursday'), msg('Friday'), msg('Saturday')];
export const WEEKDAYS_SHORT = [msg('Sun'), msg('Mon'), msg('Tue'), msg('Wed'), msg('Thu'), msg('Fri'), msg('Sat')];

/** "12,5" style typing to a number; null when empty or not a number. */
export const num = (v: string | number | null | undefined): number | null => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
export const digits = (v: string) => v.replace(/[^\d.]/g, '');

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1, 12); };
export const todayKey = () => ymd(new Date());
export const monthStartKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

/** ISO from the API to YYYY-MM-DD. */
export function isoToDayKey(iso: string | null | undefined) {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return ymd(new Date(iso));
}

export const BASE_LABEL: Record<ListBase, string> = { PRICE: msg('Retail price'), WHOLESALE: msg('Wholesale price'), COST: msg('Cost') };

/** "Wholesale price -3%" */
export function ruleText(l: Pick<PriceList, 'basedOn' | 'adjustPct'>) {
  const pct = Number(l.adjustPct) || 0;
  return `${t(BASE_LABEL[l.basedOn] ?? l.basedOn)}${pct ? ` ${pct > 0 ? '+' : '-'}${Math.abs(pct)}%` : ''}`;
}

export const SCHEME_TYPE: Record<SchemeType, { label: string; hint: string; icon: LucideIcon; color: string }> = {
  FREE_QTY: { label: msg('Free maal'), hint: msg('10 lein, 1 free (10+1)'), icon: Gift, color: '#16a34a' },
  PERCENT_OFF: { label: msg('% Discount'), hint: msg('Itne pack se zyada par % kam'), icon: BadgePercent, color: '#2563eb' },
  AMOUNT_PER_UNIT: { label: msg('Rs per pack'), hint: msg('Har pack par itne rupay kam'), icon: Coins, color: '#d97706' },
  SLAB: { label: msg('Slab'), hint: msg('5 par 2%, 10 par 4%'), icon: Layers, color: '#7c3aed' },
};

const n3 = (v: number | null | undefined) => String(Number(Number(v ?? 0).toFixed(3)));

/** "10 Carton par 1 Carton free", "2 Carton se 3% Discount", "5 Carton: 2% · 10 Carton: 4%". */
export function schemeRuleText(
  s: Pick<SaveScheme, 'type' | 'buyQty' | 'buyUnitName' | 'freeQty' | 'freeProductId' | 'value' | 'minOrderValue'> & { slabs?: SchemeSlab[] | null },
  freeProductName?: string | null,
) {
  const unit = s.buyUnitName?.trim() || 'pcs';
  const buy = Number(s.buyQty) || 0;
  let text = '';
  if (s.type === 'FREE_QTY') {
    const free = s.freeProductId ? `${n3(s.freeQty)} ${freeProductName ?? t('doosra item')} (${t('khule')})` : `${n3(s.freeQty)} ${unit}`;
    text = buy > 0 ? t('Har {{buy}} {{unit}} par {{free}} free', { buy: n3(buy), unit, free }) : t('{{free}} free', { free });
  } else if (s.type === 'PERCENT_OFF') {
    text = `${buy > 0 ? t('{{buy}} {{unit}} ya zyada par ', { buy: n3(buy), unit }) : ''}${n3(s.value)}% Discount`;
  } else if (s.type === 'AMOUNT_PER_UNIT') {
    text = t('Har {{unit}} par {{rs}} kam{{value}}', { unit, rs: rs(s.value), value: buy > 0 ? t(' ({{buy}} {{unit}} se)', { buy: n3(buy), unit }) : '' });
  } else {
    text = (s.slabs ?? []).filter((x) => x.minQty > 0).sort((a, b) => a.minQty - b.minQty).map((x) => {
      const parts = [x.percent ? `${n3(x.percent)}%` : '', x.amountPerUnit ? `${rs(x.amountPerUnit)}/${unit}` : '', x.freeQty ? `${n3(x.freeQty)} ${unit} free` : ''].filter(Boolean);
      return `${n3(x.minQty)} ${unit}: ${parts.join(' + ') || '—'}`;
    }).join(' · ') || t('Slab nahi likhe');
  }
  if (s.minOrderValue) text += t(' · order kam az kam {{minOrderValue}}', { minOrderValue: rs(s.minOrderValue) });
  return text;
}

/** Runs `fn` over `items`, `size` at a time; returns how many failed. */
export async function inBatches<T>(items: T[], size: number, fn: (t: T) => Promise<unknown>) {
  let failed = 0;
  for (let i = 0; i < items.length; i += size) {
    const res = await Promise.allSettled(items.slice(i, i + size).map(fn));
    failed += res.filter((r) => r.status === 'rejected').length;
  }
  return failed;
}

/** First message of an API error, or the fallback. */
export function errText(e: unknown, fallback = t('Kaam nahi hua, dobara koshish karein')) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}
