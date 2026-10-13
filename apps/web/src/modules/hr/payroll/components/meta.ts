/**
 * Labels, colours and small helpers shared by the payroll page, its dialogs,
 * analytics, payslips, print-outs and CSV.
 */

import { Building2, CheckCircle2, Clock, Landmark, Smartphone, Wallet, XCircle, type LucideIcon } from 'lucide-react';
import { businessDayKey } from '@core/lib/business-day';
import type { AccountKind, RecordStatus, SalaryType } from '../api/payroll.api';

/** Every payroll query lives under this key. */
export const PAYROLL_KEY = 'payroll';

/** Other pages whose numbers move when a salary is paid. */
export const TOUCHED_KEYS = [PAYROLL_KEY, 'cash-register', 'money', 'commission', 'staff', 'pnl'];

export const SALARY_TYPE: Record<SalaryType, { label: string; unit: string }> = {
  MONTHLY: { label: 'Mahana', unit: 'mahina' },
  DAILY: { label: 'Dihari', unit: 'din' },
  HOURLY: { label: 'Ghante ke hisaab', unit: 'ghante' },
  PER_TASK: { label: 'Kaam ke hisaab', unit: 'kaam' },
  COMMISSION: { label: 'Sirf commission', unit: '' },
  HYBRID: { label: 'Tankhwah + commission', unit: 'mahina' },
};

export const STATUS: Record<RecordStatus, { label: string; tone: string; icon: LucideIcon }> = {
  PAID: { label: 'Ada ho gayi', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  PARTIAL: { label: 'Kuch baqi', tone: 'bg-amber-50 text-amber-800 ring-amber-200', icon: Clock },
  PENDING: { label: 'Abhi deni hai', tone: 'bg-rose-50 text-rose-700 ring-rose-200', icon: Clock },
  CANCELLED: { label: 'Cancel', tone: 'bg-slate-100 text-slate-500 ring-slate-200', icon: XCircle },
};

export const ACCOUNT_ICON: Record<AccountKind, LucideIcon> = { CASH: Landmark, BANK: Building2, WALLET: Smartphone };
export const DRAWER_ICON = Wallet;

export const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash', BANK_TRANSFER: 'Bank', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa', CARD: 'Card',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10" → "Oct 2026". */
export const monthName = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1] ?? ''} ${key.slice(0, 4)}`;

/** The business month today falls in. */
export const currentMonth = (startHour = 0) => businessDayKey(new Date(), startHour).slice(0, 7);

export function shiftMonth(key: string, by: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const dayTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');

/** One key per dialog, so a double click or a retry posts once. */
export const requestKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

/** "2 din", "1.5 din". */
export const qty = (v: number, unit: string) => `${Number.isInteger(v) ? v : v.toFixed(1)} ${unit}`;

export function downloadCsv(name: string, header: string[][], head: string[], rows: Array<Array<string | number>>) {
  const csv = [...header, [''], head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
