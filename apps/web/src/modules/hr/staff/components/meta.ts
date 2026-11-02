/**
 * Roles, statuses, permission wording and small helpers shared by the staff
 * list, profile and form.
 */

import { Briefcase, Crown, ShoppingCart, UserCog, UserRound, type LucideIcon } from 'lucide-react';
import { permissionLabel } from '@core/lib/permissions';
import type { PersonStatus } from '../api/people.api';
import { t } from '@core/i18n';

/** Every query of these pages lives under this key. */
export const PEOPLE_KEY = 'staff-people';
/** Keys a change to a person refreshes: these pages, the old team/staff lists and commission. */
export const AFFECTED_KEYS = [PEOPLE_KEY, 'team', 'staff', 'commission'];

export type RoleKey = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF' | 'NO_LOGIN';
export type AssignableRole = 'MANAGER' | 'CASHIER' | 'STAFF';

export const ROLES: Record<RoleKey, { label: string; hint: string; color: string; icon: LucideIcon }> = {
  OWNER: { label: t('Malik'), hint: t('Sab kuch kar sakta hai — permission ki zaroorat nahi'), color: '#d97706', icon: Crown },
  MANAGER: { label: t('Manager'), hint: t('Apni branch chalata hai: sale, maal, expenses, reports'), color: '#7c3aed', icon: UserCog },
  CASHIER: { label: t('Cashier'), hint: t('Counter par sale, galla aur customer'), color: '#2563eb', icon: ShoppingCart },
  STAFF: { label: t('Staff'), hint: t('Maal dekhna aur madad — counter nahi'), color: '#0891b2', icon: UserRound },
  NO_LOGIN: { label: t('Bina login'), hint: t('Sirf HR record: tankhwah aur haazri — app nahi kholta'), color: '#64748b', icon: Briefcase },
};
export const ASSIGNABLE: AssignableRole[] = ['MANAGER', 'CASHIER', 'STAFF'];
export const roleOf = (role: string | null | undefined) => ROLES[(role ?? 'NO_LOGIN') as RoleKey] ?? ROLES.STAFF;

export const STATUS: Record<PersonStatus, { label: string; tone: string; dot: string }> = {
  ACTIVE: { label: t('Kaam par'), tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  ON_LEAVE: { label: t('Chhutti par'), tone: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  INACTIVE: { label: t('Band'), tone: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  LEFT: { label: t('Chhor gaye'), tone: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
};

export const SALARY_TYPES: Array<{ id: string; label: string; unit: string }> = [
  { id: 'MONTHLY', label: t('Mahana'), unit: t('har mahine') },
  { id: 'DAILY', label: t('Dihari'), unit: t('har din') },
  { id: 'HOURLY', label: t('Ghante ke hisaab'), unit: t('har ghanta') },
  { id: 'COMMISSION', label: t('Sirf commission'), unit: '' },
  { id: 'HYBRID', label: t('Tankhwah + commission'), unit: t('har mahine') },
  { id: 'PER_TASK', label: t('Kaam ke hisaab'), unit: t('har kaam') },
];
export const salaryTypeOf = (id: string) => SALARY_TYPES.find((s) => s.id === id) ?? { id, label: id, unit: '' };

/**
 * What each permission opens, in plain words. Industry permissions fall back
 * to their label from core.
 */
const PERM_TEXT: Record<string, [string, string]> = {
  'pos.use': [t('POS counter'), t('Sale ka counter khol sakta hai')],
  'pos.discount_override': [t('Had se zyada discount'), t('Settings wali discount ki had aur PIN is par nahi lagte — sirf bharose wale banday ko dein')],
  'pos.price_tier': [t('Price tier badalna'), t('Counter par Wholesale / Credit price chun sakta hai. Customer ya udhaar se jo price khud lagti hai us ke liye ye zaroori nahi')],
  'sales.view': [t('Sale dekhna'), t('Purane bill aur sale ki list')],
  'sales.void': [t('Bill void karna'), t('Bana hua bill radd kar sakta hai (PIN setting alag hai)')],
  'returns.view': [t('Return dekhna'), t('Wapas aaye maal ki list')],
  'returns.create': [t('Return lena'), t('Customer ka maal wapas le kar paise lauta sakta hai')],
  'customers.view': [t('Customers dekhna'), t('Customer ki list aur details')],
  'customers.edit': [t('Customers badalna'), t('Naya customer banana aur details badalna')],
  'khata.view': [t('Khata dekhna'), t('Kis ka kitna udhaar hai')],
  'khata.manage': [t('Khata chalana'), t('Udhaar ki receiving aur entry')],
  'loyalty.view': [t('Loyalty dekhna'), t('Points aur inaam')],
  'discounts.view': [t('Discount dekhna'), t('Discount codes ki list')],
  'discounts.manage': [t('Discount banana'), t('Naye discount aur offers')],
  'cash_register.view': [t('Galla dekhna'), t('Shift aur galle ka hisaab')],
  'cash_register.open': [t('Shift kholna'), t('Galla khol kar sale shuru')],
  'cash_register.close': [t('Shift band karna'), t('Galla gin kar band karna')],
  'products.view': [t('Maal dekhna'), t('Maal, rate aur stock — counter ke liye zaroori')],
  'products.create': [t('Maal banana'), t('Naya maal jorna')],
  'products.edit': [t('Maal badalna'), t('Rate, naam aur details badalna')],
  'products.delete': [t('Maal mitana'), t('Maal hamesha ke liye hatana')],
  'brands.view': [t('Brands dekhna'), t('Brand ki list')],
  'tags.view': [t('Tags dekhna'), t('Tag ki list')],
  'categories.view': [t('Categories dekhna'), t('Counter par category ke button')],
  'low_stock.view': [t('Kam stock dekhna'), t('Khatam hone wala maal')],
  'barcode_labels.view': [t('Barcode labels'), t('Label chhapna')],
  'stock_movements.view': [t('Stock ki aamad-o-raft'), t('Maal kab aaya, kab gaya')],
  'stock_adjustments.manage': [t('Stock theek karna'), t('Ginti ke baad stock kam ya zyada karna')],
  'stock_transfers.manage': [t('Stock bhejna'), t('Ek branch se doosri branch maal')],
  'suppliers.view': [t('Suppliers dekhna'), t('Supplier aur un ka khata')],
  'suppliers.edit': [t('Suppliers badalna'), t('Supplier banana aur payment likhna')],
  'purchases.view': [t('Purchase dekhna'), t('Kharide maal ke bill')],
  'purchases.create': [t('Purchase karna'), t('Naya purchase bill aur order')],
  'dashboard.view': [t('Dashboard'), t('Aaj ki sale aur khulasa')],
  'cost.view': [t('Cost aur profit'), t('Maal kitne ka aaya aur kitna profit')],
  'reports.view': [t('Reports'), t('Sale, stock aur doosri reports')],
  'profit_report.view': [t('Profit report'), t('Profit report aur P&L')],
  'staff.view': [t('Staff dekhna'), t('Staff ki list, haazri aur tankhwah')],
  'staff.manage': [t('Staff sambhalna'), t('HR record banana, haazri aur tankhwah likhna')],
  'commission.own': [t('Apni commission'), t('Sirf apni kamai dekhna')],
  'commission.view': [t('Sab ki commission'), t('Har bande ki commission dekhna')],
  'commission.manage': [t('Commission rules'), t('Rules banana aur payment likhna')],
  'expenses.view': [t('Expenses dekhna'), t('Kharchon ki list')],
  'expenses.create': [t('Expense likhna'), t('Naya expense aur payment')],
  'exports.view': [t('Data export'), t('Excel/CSV nikalna')],
  'backup.manage': [t('Backup'), t('Poora data download karna')],
  'team.view': [t('Team dekhna'), t('Login, permission aur login history dekhna')],
  'team.manage': [t('Team sambhalna'), t('Login aur permission — abhi sirf malik kar sakta hai')],
  'shops.view': [t('Branches dekhna'), t('Branch ki list — counter ke liye zaroori')],
  'shops.manage': [t('Branches sambhalna'), t('Nayi branch aur details')],
  'activity.view': [t('Activity log'), t('Kis ne kya kiya')],
  'settings.view': [t('Settings dekhna'), t('Dukaan ki settings — counter ke liye zaroori')],
  'settings.edit': [t('Settings badalna'), t('Aam settings badalna')],
  'settings.manage': [t('Khaas settings'), t('PIN, backup aur integrations')],
  'billing.view': [t('Billing dekhna'), t('Nafaa ka plan aur bill')],
  'billing.manage': [t('Billing sambhalna'), t('Plan badalna aur payment')],
  'plans.view': [t('Plans dekhna'), t('Nafaa ke plans')],
  'plan_usage.view': [t('Plan ka istemal'), t('Kitna plan istemal hua')],
  'referrals.view': [t('Referrals'), t('Doston ko Nafaa')],
  'online_orders.view': [t('Online order dekhna'), t('Website aur app se aaye order')],
  'online_orders.manage': [t('Online order chalana'), t('Order qubool, pack aur deliver karna')],
  'catalog.view': [t('Online catalog dekhna'), t('Online dukaan me kaunsa maal dikhta hai')],
  'catalog.manage': [t('Online catalog badalna'), t('Online dukaan ka maal aur rate badalna')],
};
export const permText = (key: string): [string, string] => PERM_TEXT[key] ?? [permissionLabel(key), ''];

/** A temporary password: easy to read out (no 0/O, 1/l), with a capital, a digit and a sign. */
export function makePassword() {
  const pick = <T,>(s: ArrayLike<T>) => s[Math.floor(Math.random() * s.length)];
  const words = ['Nafaa', 'Dukaan', 'Galla', 'Bazar', 'Sitara', 'Chaman'];
  return `${pick(words)}@${Math.floor(2000 + Math.random() * 7000)}${pick('abcdefghjkmnpqrstuvwxyz')}`;
}

export const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const dayTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—');
export const time = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) : '—');

/** "abhi", "20 min pehle", "3 ghante pehle", "5 din pehle", else the date. */
export function ago(iso?: string | null) {
  if (!iso) return t('Kabhi nahi');
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t('Abhi');
  if (s < 3600) return t('{{value}} min pehle', { value: Math.floor(s / 60) });
  if (s < 86400) return t('{{value}} ghante pehle', { value: Math.floor(s / 3600) });
  if (s < 30 * 86400) return t('{{value}} din pehle', { value: Math.floor(s / 86400) });
  return day(iso);
}

/** Years/months since joining, e.g. "1 saal 4 mahine". */
export function tenure(iso?: string | null) {
  if (!iso) return '—';
  const months = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (30.44 * 86400_000)));
  if (months < 1) return t('Naya');
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && t('{{count}} saal', { count: y }), m && t('{{count}} mahine', { count: m })].filter(Boolean).join(' ');
}

/** Short device name from a user agent when the server saved none. */
export function deviceOf(name: string | null, ua: string | null) {
  if (name) return name;
  if (!ua) return t('Anjaan device');
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : '';
  const app = /Electron/i.test(ua) ? t('Desktop app') : /Edg\//i.test(ua) ? t('Edge') : /Chrome/i.test(ua) ? t('Chrome') : /Firefox/i.test(ua) ? t('Firefox') : /Safari/i.test(ua) ? t('Safari') : t('Browser');
  return [os, app].filter(Boolean).join(' · ');
}

/** WhatsApp link for a Pakistani number (03xx → 923xx). */
export const waLink = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '92')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export function apiError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

/** Download rows as a CSV file Excel opens with Urdu/Unicode intact. */
export function downloadCsv(name: string, rows: Array<Array<string | number | null | undefined>>) {
  const cell = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([`﻿${rows.map((r) => r.map(cell).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
