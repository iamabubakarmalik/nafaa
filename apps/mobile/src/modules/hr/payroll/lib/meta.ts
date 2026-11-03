/** Labels, tones and helpers shared by the payroll screens. Months are "YYYY-MM". */

import { Building2, CheckCircle2, Clock, Landmark, Smartphone, Wallet, XCircle, type LucideIcon } from 'lucide-react-native';
import { businessDayKey, formatDate, formatDateTime } from '@/core/format';
import { msg, t } from '@/core/i18n';
import type { StatusTone } from '@/design';
import type { AccountKind, RecordStatus, SalaryType } from '../api/payroll';

export const PAYROLL_KEY = 'hr-payroll';
/** Other screens whose numbers move when a salary is paid. */
export const TOUCHED_KEYS = [PAYROLL_KEY, 'cash-register', 'register', 'money', 'hr-commission', 'staff', 'pnl', 'dashboard'];

export const SALARY_TYPE: Record<SalaryType, { label: string; unit: string }> = {
  MONTHLY: { label: msg('Mahana'), unit: msg('mahina') },
  DAILY: { label: msg('Dihari'), unit: msg('din') },
  HOURLY: { label: msg('Ghante ke hisaab'), unit: msg('ghante') },
  PER_TASK: { label: msg('Kaam ke hisaab'), unit: msg('kaam') },
  COMMISSION: { label: msg('Sirf commission'), unit: '' },
  HYBRID: { label: msg('Tankhwah + commission'), unit: msg('mahina') },
};

export const STATUS: Record<RecordStatus, { label: string; tone: StatusTone; icon: LucideIcon }> = {
  PAID: { label: msg('Ada ho gayi'), tone: 'success', icon: CheckCircle2 },
  PARTIAL: { label: msg('Kuch baqi'), tone: 'warning', icon: Clock },
  PENDING: { label: msg('Abhi deni hai'), tone: 'danger', icon: Clock },
  CANCELLED: { label: msg('Cancel'), tone: 'neutral', icon: XCircle },
};

export const ACCOUNT_ICON: Record<AccountKind, LucideIcon> = { CASH: Landmark, BANK: Building2, WALLET: Smartphone };
export const DRAWER_ICON = Wallet;

export const METHOD_LABEL: Record<string, string> = {
  CASH: msg('Cash'), BANK_TRANSFER: msg('Bank'), JAZZCASH: msg('JazzCash'), EASYPAISA: msg('Easypaisa'), CARD: msg('Card'),
};

const MONTHS = [msg('Jan'), msg('Feb'), msg('Mar'), msg('Apr'), msg('May'), msg('Jun'), msg('Jul'), msg('Aug'), msg('Sep'), msg('Oct'), msg('Nov'), msg('Dec')];
/** "2026-10" → "Oct 2026" (months are translated at render). */
export const monthName = (key: string, tr: (s: string) => string) => `${tr(MONTHS[Number(key.slice(5, 7)) - 1] ?? '')} ${key.slice(0, 4)}`;

export const currentMonth = (startHour = 0) => businessDayKey(new Date(), startHour).slice(0, 7);

export function shiftMonth(key: string, by: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const day = (iso?: string | null) => (iso ? formatDate(iso) : '—');
export const dayTime = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');

/** One key per dialog, so a double tap or a retry posts once. */
export const requestKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;

/** "2 din", "1.5 din". */
export const qty = (v: number, unit: string) => `${Number.isInteger(v) ? v : v.toFixed(1)} ${unit}`;
const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
/** "1 day", "2.5 days" (plural in every language). */
export const days = (v: number) => t('{{count}} din', { count: num(v) });
/** "1 hour", "3 hours". */
export const hours = (v: number) => t('{{count}} ghante', { count: num(v) });
