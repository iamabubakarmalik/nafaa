/**
 * Roles, statuses, permission wording and small helpers shared by the staff
 * list, profile and form.
 */

import { Briefcase, Crown, ShoppingCart, UserCog, UserRound, type LucideIcon } from 'lucide-react';
import { permissionLabel } from '@core/lib/permissions';
import type { PersonStatus } from '../api/people.api';

/** Every query of these pages lives under this key. */
export const PEOPLE_KEY = 'staff-people';
/** Keys a change to a person refreshes: these pages, the old team/staff lists and commission. */
export const AFFECTED_KEYS = [PEOPLE_KEY, 'team', 'staff', 'commission'];

export type RoleKey = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF' | 'NO_LOGIN';
export type AssignableRole = 'MANAGER' | 'CASHIER' | 'STAFF';

export const ROLES: Record<RoleKey, { label: string; hint: string; color: string; icon: LucideIcon }> = {
  OWNER: { label: 'Malik', hint: 'Sab kuch kar sakta hai — permission ki zaroorat nahi', color: '#d97706', icon: Crown },
  MANAGER: { label: 'Manager', hint: 'Apni branch chalata hai: sale, maal, expenses, reports', color: '#7c3aed', icon: UserCog },
  CASHIER: { label: 'Cashier', hint: 'Counter par sale, galla aur customer', color: '#2563eb', icon: ShoppingCart },
  STAFF: { label: 'Staff', hint: 'Maal dekhna aur madad — counter nahi', color: '#0891b2', icon: UserRound },
  NO_LOGIN: { label: 'Bina login', hint: 'Sirf HR record: tankhwah aur haazri — app nahi kholta', color: '#64748b', icon: Briefcase },
};
export const ASSIGNABLE: AssignableRole[] = ['MANAGER', 'CASHIER', 'STAFF'];
export const roleOf = (role: string | null | undefined) => ROLES[(role ?? 'NO_LOGIN') as RoleKey] ?? ROLES.STAFF;

export const STATUS: Record<PersonStatus, { label: string; tone: string; dot: string }> = {
  ACTIVE: { label: 'Kaam par', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  ON_LEAVE: { label: 'Chhutti par', tone: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  INACTIVE: { label: 'Band', tone: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  LEFT: { label: 'Chhor gaye', tone: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
};

export const SALARY_TYPES: Array<{ id: string; label: string; unit: string }> = [
  { id: 'MONTHLY', label: 'Mahana', unit: 'har mahine' },
  { id: 'DAILY', label: 'Dihari', unit: 'har din' },
  { id: 'HOURLY', label: 'Ghante ke hisaab', unit: 'har ghanta' },
  { id: 'COMMISSION', label: 'Sirf commission', unit: '' },
  { id: 'HYBRID', label: 'Tankhwah + commission', unit: 'har mahine' },
  { id: 'PER_TASK', label: 'Kaam ke hisaab', unit: 'har kaam' },
];
export const salaryTypeOf = (id: string) => SALARY_TYPES.find((s) => s.id === id) ?? { id, label: id, unit: '' };

/**
 * What each permission opens, in plain words. Industry permissions fall back
 * to their label from core.
 */
const PERM_TEXT: Record<string, [string, string]> = {
  'pos.use': ['POS counter', 'Sale ka counter khol sakta hai'],
  'pos.discount_override': ['Had se zyada discount', 'Settings wali discount ki had aur PIN is par nahi lagte — sirf bharose wale banday ko dein'],
  'sales.view': ['Sale dekhna', 'Purane bill aur sale ki list'],
  'sales.void': ['Bill void karna', 'Bana hua bill radd kar sakta hai (PIN setting alag hai)'],
  'returns.view': ['Return dekhna', 'Wapas aaye maal ki list'],
  'returns.create': ['Return lena', 'Customer ka maal wapas le kar paise lauta sakta hai'],
  'customers.view': ['Customers dekhna', 'Customer ki list aur details'],
  'customers.edit': ['Customers badalna', 'Naya customer banana aur details badalna'],
  'khata.view': ['Khata dekhna', 'Kis ka kitna udhaar hai'],
  'khata.manage': ['Khata chalana', 'Udhaar ki receiving aur entry'],
  'loyalty.view': ['Loyalty dekhna', 'Points aur inaam'],
  'discounts.view': ['Discount dekhna', 'Discount codes ki list'],
  'discounts.manage': ['Discount banana', 'Naye discount aur offers'],
  'cash_register.view': ['Galla dekhna', 'Shift aur galle ka hisaab'],
  'cash_register.open': ['Shift kholna', 'Galla khol kar sale shuru'],
  'cash_register.close': ['Shift band karna', 'Galla gin kar band karna'],
  'products.view': ['Maal dekhna', 'Maal, rate aur stock — counter ke liye zaroori'],
  'products.create': ['Maal banana', 'Naya maal jorna'],
  'products.edit': ['Maal badalna', 'Rate, naam aur details badalna'],
  'products.delete': ['Maal mitana', 'Maal hamesha ke liye hatana'],
  'brands.view': ['Brands dekhna', 'Brand ki list'],
  'tags.view': ['Tags dekhna', 'Tag ki list'],
  'categories.view': ['Categories dekhna', 'Counter par category ke button'],
  'low_stock.view': ['Kam stock dekhna', 'Khatam hone wala maal'],
  'barcode_labels.view': ['Barcode labels', 'Label chhapna'],
  'stock_movements.view': ['Stock ki aamad-o-raft', 'Maal kab aaya, kab gaya'],
  'stock_adjustments.manage': ['Stock theek karna', 'Ginti ke baad stock kam ya zyada karna'],
  'stock_transfers.manage': ['Stock bhejna', 'Ek branch se doosri branch maal'],
  'suppliers.view': ['Suppliers dekhna', 'Supplier aur un ka khata'],
  'suppliers.edit': ['Suppliers badalna', 'Supplier banana aur payment likhna'],
  'purchases.view': ['Purchase dekhna', 'Kharide maal ke bill'],
  'purchases.create': ['Purchase karna', 'Naya purchase bill aur order'],
  'dashboard.view': ['Dashboard', 'Aaj ki sale aur khulasa'],
  'cost.view': ['Cost aur profit', 'Maal kitne ka aaya aur kitna profit'],
  'reports.view': ['Reports', 'Sale, stock aur doosri reports'],
  'profit_report.view': ['Profit report', 'Profit report aur P&L'],
  'staff.view': ['Staff dekhna', 'Staff ki list, haazri aur tankhwah'],
  'staff.manage': ['Staff sambhalna', 'HR record banana, haazri aur tankhwah likhna'],
  'commission.own': ['Apni commission', 'Sirf apni kamai dekhna'],
  'commission.view': ['Sab ki commission', 'Har bande ki commission dekhna'],
  'commission.manage': ['Commission rules', 'Rules banana aur payment likhna'],
  'expenses.view': ['Expenses dekhna', 'Kharchon ki list'],
  'expenses.create': ['Expense likhna', 'Naya expense aur payment'],
  'exports.view': ['Data export', 'Excel/CSV nikalna'],
  'backup.manage': ['Backup', 'Poora data download karna'],
  'team.view': ['Team dekhna', 'Login, permission aur login history dekhna'],
  'team.manage': ['Team sambhalna', 'Login aur permission — abhi sirf malik kar sakta hai'],
  'shops.view': ['Branches dekhna', 'Branch ki list — counter ke liye zaroori'],
  'shops.manage': ['Branches sambhalna', 'Nayi branch aur details'],
  'activity.view': ['Activity log', 'Kis ne kya kiya'],
  'settings.view': ['Settings dekhna', 'Dukaan ki settings — counter ke liye zaroori'],
  'settings.edit': ['Settings badalna', 'Aam settings badalna'],
  'settings.manage': ['Khaas settings', 'PIN, backup aur integrations'],
  'billing.view': ['Billing dekhna', 'Nafaa ka plan aur bill'],
  'billing.manage': ['Billing sambhalna', 'Plan badalna aur payment'],
  'plans.view': ['Plans dekhna', 'Nafaa ke plans'],
  'plan_usage.view': ['Plan ka istemal', 'Kitna plan istemal hua'],
  'referrals.view': ['Referrals', 'Doston ko Nafaa'],
  'online_orders.view': ['Online order dekhna', 'Website aur app se aaye order'],
  'online_orders.manage': ['Online order chalana', 'Order qubool, pack aur deliver karna'],
  'catalog.view': ['Online catalog dekhna', 'Online dukaan me kaunsa maal dikhta hai'],
  'catalog.manage': ['Online catalog badalna', 'Online dukaan ka maal aur rate badalna'],
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
  if (!iso) return 'Kabhi nahi';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Abhi';
  if (s < 3600) return `${Math.floor(s / 60)} min pehle`;
  if (s < 86400) return `${Math.floor(s / 3600)} ghante pehle`;
  if (s < 30 * 86400) return `${Math.floor(s / 86400)} din pehle`;
  return day(iso);
}

/** Years/months since joining, e.g. "1 saal 4 mahine". */
export function tenure(iso?: string | null) {
  if (!iso) return '—';
  const months = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (30.44 * 86400_000)));
  if (months < 1) return 'Naya';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} saal`, m && `${m} mahine`].filter(Boolean).join(' ');
}

/** Short device name from a user agent when the server saved none. */
export function deviceOf(name: string | null, ua: string | null) {
  if (name) return name;
  if (!ua) return 'Anjaan device';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : '';
  const app = /Electron/i.test(ua) ? 'Desktop app' : /Edg\//i.test(ua) ? 'Edge' : /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Browser';
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
