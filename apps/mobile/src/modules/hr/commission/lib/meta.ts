/** Query key, labels and helpers shared by the commission screens. Periods are "YYYY-MM" business months. */

import { CheckCircle2, CircleDashed, Clock, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { formatDate, formatDateTime, formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { CommissionBasis, CommissionRule, CommissionValueType, PayStatus } from '../api/commission';

export const COMMISSION_KEY = 'hr-commission';

export const shiftPeriod = (p: string, by: number) => {
  const [y, m] = p.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const MONTHS = [msg('January'), msg('February'), msg('March'), msg('April'), msg('May'), msg('June'), msg('July'), msg('August'), msg('September'), msg('October'), msg('November'), msg('December')];
/** "2026-10" → "October 2026"; short → "Oct 26". */
export function periodLabel(p: string, short = false) {
  const [y, m] = (p ?? '').split('-').map(Number);
  if (!y || !m) return p;
  const name = t(MONTHS[m - 1]);
  return short ? `${name.slice(0, 3)} ${String(y).slice(2)}` : `${name} ${y}`;
}

export const BASIS: Record<CommissionBasis, { label: string; hint: string }> = {
  SALE: { label: msg('Sale par'), hint: msg('Jitna becha us par. Samajhne me sab se aasaan.') },
  PROFIT: { label: msg('Profit par'), hint: msg('Sale me se cost nikaal kar jo bacha us par. Banda discount kam deta hai.') },
  PER_BILL: { label: msg('Har bill par'), hint: msg('Har bill ki fixed amount. Chhoti amount, zyada bill.') },
};

/** "2.5% sale", "Rs 20 har cheez", "Rs 10 har bill". */
export function rateText(r: { basis: CommissionBasis; valueType: CommissionValueType; value: number }) {
  if (r.basis === 'PER_BILL') return t('{{formatPKR}} har bill', { formatPKR: formatPKR(r.value) });
  if (r.valueType === 'FIXED') return t('{{formatPKR}} har cheez', { formatPKR: formatPKR(r.value) });
  return `${r.value}% ${r.basis === 'PROFIT' ? t('Profit') : t('Sale')}`;
}

export function ruleName(r: Pick<CommissionRule, 'name' | 'basis' | 'valueType'>) {
  if (r.name) return r.name;
  if (r.basis === 'PER_BILL') return t('Har bill par');
  if (r.valueType === 'FIXED') return t('Har cheez par');
  return t(BASIS[r.basis].label);
}

export const PAY: Record<PayStatus, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  none: { label: msg('Baqi'), icon: Clock, tone: 'warning' },
  partial: { label: msg('Kuch ada'), icon: CircleDashed, tone: 'info' },
  full: { label: msg('Ada ho gayi'), icon: CheckCircle2, tone: 'success' },
  over: { label: msg('Zyada ada'), icon: TriangleAlert, tone: 'danger' },
};

export const day = (v?: string | Date | null) => (v ? formatDate(v) : '');
export const dayTime = (v?: string | Date | null) => (v ? formatDateTime(v) : '');

/** Signed rupees for lines that can go below zero after returns. */
export const signed = (n: number) => (n < 0 ? `−${formatPKR(Math.abs(n))}` : formatPKR(n));
export const qtyText = (n: number) => String(Number(n.toFixed(3)));
