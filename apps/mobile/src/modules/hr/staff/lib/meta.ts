/**
 * Roles, statuses, permission wording and small helpers shared by the staff
 * list, profile and form. Labels are marked with msg() and translated where
 * they are shown.
 */

import { Briefcase, Crown, ShoppingCart, UserCog, UserRound, type LucideIcon } from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import { formatDate, formatDateTime, formatTime } from '@/core/format';
import type { StatusTone } from '@/design';
import { permissionLabel } from '@/core/permissions';
import type { PersonStatus } from '../api/people';

/** Every staff query lives under this key. */
export const PEOPLE_KEY = 'staff-people';
/** A change to a person refreshes these (also the older lists that read the same data). */
export const AFFECTED_KEYS = [PEOPLE_KEY, 'team', 'staff', 'commission'];

export type RoleKey = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STAFF' | 'NO_LOGIN';
export type AssignableRole = 'MANAGER' | 'CASHIER' | 'STAFF';

export const ROLES: Record<RoleKey, { label: string; hint: string; tone: StatusTone; icon: LucideIcon }> = {
  OWNER: { label: msg('Malik'), hint: msg('Sab kuch kar sakta hai — permission ki zaroorat nahi'), tone: 'warning', icon: Crown },
  MANAGER: { label: msg('Manager'), hint: msg('Apni branch chalata hai: sale, maal, expenses, reports'), tone: 'accent', icon: UserCog },
  CASHIER: { label: msg('Cashier'), hint: msg('Counter par sale, galla aur customer'), tone: 'info', icon: ShoppingCart },
  STAFF: { label: msg('Staff'), hint: msg('Maal dekhna aur madad — counter nahi'), tone: 'brand', icon: UserRound },
  NO_LOGIN: { label: msg('Bina login'), hint: msg('Sirf HR record: tankhwah aur haazri — app nahi kholta'), tone: 'neutral', icon: Briefcase },
};
export const ASSIGNABLE: AssignableRole[] = ['MANAGER', 'CASHIER', 'STAFF'];
export const roleOf = (role: string | null | undefined) => ROLES[(role ?? 'NO_LOGIN') as RoleKey] ?? ROLES.STAFF;
export const roleLabel = (role: string | null | undefined) => t(roleOf(role).label);

export const STATUS: Record<PersonStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Kaam par'), tone: 'success' },
  ON_LEAVE: { label: msg('Chhutti par'), tone: 'warning' },
  INACTIVE: { label: msg('Band'), tone: 'neutral' },
  LEFT: { label: msg('Chhor gaye'), tone: 'danger' },
};

export const SALARY_TYPES: Array<{ id: string; label: string; unit: string }> = [
  { id: 'MONTHLY', label: msg('Mahana'), unit: msg('har mahine') },
  { id: 'DAILY', label: msg('Dihari'), unit: msg('har din') },
  { id: 'HOURLY', label: msg('Ghante ke hisaab'), unit: msg('har ghanta') },
  { id: 'COMMISSION', label: msg('Sirf commission'), unit: '' },
  { id: 'HYBRID', label: msg('Tankhwah + commission'), unit: msg('har mahine') },
  { id: 'PER_TASK', label: msg('Kaam ke hisaab'), unit: msg('har kaam') },
];
export const salaryTypeOf = (id: string) => {
  const s = SALARY_TYPES.find((x) => x.id === id);
  return s ? { id: s.id, label: t(s.label), unit: s.unit ? t(s.unit) : '' } : { id, label: id, unit: '' };
};

/** What each permission opens, in plain words. Others fall back to the core label. */
const PERM_TEXT: Record<string, [string, string]> = {
  'pos.use': [msg('POS counter'), msg('Sale ka counter khol sakta hai')],
  'pos.discount_override': [msg('Had se zyada discount'), msg('Settings wali discount ki had aur PIN is par nahi lagte — sirf bharose wale banday ko dein')],
  'pos.price_tier': [msg('Price tier badalna'), msg('Counter par Wholesale / Credit price chun sakta hai. Customer ya udhaar se jo price khud lagti hai us ke liye ye zaroori nahi')],
  'sales.view': [msg('Sale dekhna'), msg('Purane bill aur sale ki list')],
  'sales.void': [msg('Bill void karna'), msg('Bana hua bill radd kar sakta hai (PIN setting alag hai)')],
  'returns.view': [msg('Return dekhna'), msg('Wapas aaye maal ki list')],
  'returns.create': [msg('Return lena'), msg('Customer ka maal wapas le kar paise lauta sakta hai')],
  'customers.view': [msg('Customers dekhna'), msg('Customer ki list aur details')],
  'customers.edit': [msg('Customers badalna'), msg('Naya customer banana aur details badalna')],
  'khata.view': [msg('Khata dekhna'), msg('Kis ka kitna udhaar hai')],
  'khata.manage': [msg('Khata chalana'), msg('Udhaar ki receiving aur entry')],
  'loyalty.view': [msg('Loyalty dekhna'), msg('Points aur inaam')],
  'discounts.view': [msg('Discount dekhna'), msg('Discount codes ki list')],
  'discounts.manage': [msg('Discount banana'), msg('Naye discount aur offers')],
  'cash_register.view': [msg('Galla dekhna'), msg('Shift aur galle ka hisaab')],
  'cash_register.open': [msg('Shift kholna'), msg('Galla khol kar sale shuru')],
  'cash_register.close': [msg('Shift band karna'), msg('Galla gin kar band karna')],
  'products.view': [msg('Maal dekhna'), msg('Maal, rate aur stock — counter ke liye zaroori')],
  'products.create': [msg('Maal banana'), msg('Naya maal jorna')],
  'products.edit': [msg('Maal badalna'), msg('Rate, naam aur details badalna')],
  'products.delete': [msg('Maal mitana'), msg('Maal hamesha ke liye hatana')],
  'brands.view': [msg('Brands dekhna'), msg('Brand ki list')],
  'tags.view': [msg('Tags dekhna'), msg('Tag ki list')],
  'categories.view': [msg('Categories dekhna'), msg('Counter par category ke button')],
  'low_stock.view': [msg('Kam stock dekhna'), msg('Khatam hone wala maal')],
  'barcode_labels.view': [msg('Barcode labels'), msg('Label chhapna')],
  'stock_movements.view': [msg('Stock ki aamad-o-raft'), msg('Maal kab aaya, kab gaya')],
  'stock_adjustments.manage': [msg('Stock theek karna'), msg('Ginti ke baad stock kam ya zyada karna')],
  'stock_transfers.manage': [msg('Stock bhejna'), msg('Ek branch se doosri branch maal')],
  'suppliers.view': [msg('Suppliers dekhna'), msg('Supplier aur un ka khata')],
  'suppliers.edit': [msg('Suppliers badalna'), msg('Supplier banana aur payment likhna')],
  'purchases.view': [msg('Purchase dekhna'), msg('Kharide maal ke bill')],
  'purchases.create': [msg('Purchase karna'), msg('Naya purchase bill aur order')],
  'dashboard.view': [msg('Dashboard'), msg('Aaj ki sale aur khulasa')],
  'cost.view': [msg('Cost aur profit'), msg('Maal kitne ka aaya aur kitna profit')],
  'reports.view': [msg('Reports'), msg('Sale, stock aur doosri reports')],
  'profit_report.view': [msg('Profit report'), msg('Profit report aur P&L')],
  'staff.view': [msg('Staff dekhna'), msg('Staff ki list, haazri aur tankhwah')],
  'staff.manage': [msg('Staff sambhalna'), msg('HR record banana, haazri aur tankhwah likhna')],
  'commission.own': [msg('Apni commission'), msg('Sirf apni kamai dekhna')],
  'commission.view': [msg('Sab ki commission'), msg('Har bande ki commission dekhna')],
  'commission.manage': [msg('Commission rules'), msg('Rules banana aur payment likhna')],
  'expenses.view': [msg('Expenses dekhna'), msg('Kharchon ki list')],
  'expenses.create': [msg('Expense likhna'), msg('Naya expense aur payment')],
  'exports.view': [msg('Data export'), msg('Excel/CSV nikalna')],
  'backup.manage': [msg('Backup'), msg('Poora data download karna')],
  'team.view': [msg('Team dekhna'), msg('Login, permission aur login history dekhna')],
  'team.manage': [msg('Team sambhalna'), msg('Login aur permission — abhi sirf malik kar sakta hai')],
  'shops.view': [msg('Branches dekhna'), msg('Branch ki list — counter ke liye zaroori')],
  'shops.manage': [msg('Branches sambhalna'), msg('Nayi branch aur details')],
  'activity.view': [msg('Activity log'), msg('Kis ne kya kiya')],
  'settings.view': [msg('Settings dekhna'), msg('Dukaan ki settings — counter ke liye zaroori')],
  'settings.edit': [msg('Settings badalna'), msg('Aam settings badalna')],
  'settings.manage': [msg('Khaas settings'), msg('PIN, backup aur integrations')],
  'billing.view': [msg('Billing dekhna'), msg('Nafaa ka plan aur bill')],
  'billing.manage': [msg('Billing sambhalna'), msg('Plan badalna aur payment')],
  'plans.view': [msg('Plans dekhna'), msg('Nafaa ke plans')],
  'plan_usage.view': [msg('Plan ka istemal'), msg('Kitna plan istemal hua')],
  'referrals.view': [msg('Referrals'), msg('Doston ko Nafaa')],
  'online_orders.view': [msg('Online order dekhna'), msg('Website aur app se aaye order')],
  'online_orders.manage': [msg('Online order chalana'), msg('Order qubool, pack aur deliver karna')],
  'catalog.view': [msg('Online catalog dekhna'), msg('Online dukaan me kaunsa maal dikhta hai')],
  'catalog.manage': [msg('Online catalog badalna'), msg('Online dukaan ka maal aur rate badalna')],
};
export const permText = (key: string): [string, string] => {
  const p = PERM_TEXT[key];
  return p ? [t(p[0]), p[1] ? t(p[1]) : ''] : [permissionLabel(key), ''];
};

/** A temporary password that is easy to read out (no 0/O, 1/l), with a capital, a digit and a sign. */
export function makePassword() {
  const pick = <T,>(s: ArrayLike<T>) => s[Math.floor(Math.random() * s.length)];
  const words = ['Nafaa', 'Dukaan', 'Galla', 'Bazar', 'Sitara', 'Chaman'];
  return `${pick(words)}@${Math.floor(2000 + Math.random() * 7000)}${pick('abcdefghjkmnpqrstuvwxyz')}`;
}

export const day = (iso?: string | null) => (iso ? formatDate(iso) : '—');
export const dayTime = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');
export const time = (iso?: string | null) => (iso ? formatTime(iso) : '—');

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

/** Years and months since joining. */
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
  const app = /Nafaa|okhttp|Expo/i.test(ua) ? t('Nafaa app') : /Edg\//i.test(ua) ? 'Edge' : /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : t('Browser');
  return [os, app].filter(Boolean).join(' · ');
}

/** WhatsApp link for a Pakistani number (03xx becomes 923xx). */
export const waLink = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '92')}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const cleanPhone = (p?: string | null) => (p && p !== '—' ? p : null);
export const todayKey = () => new Date().toISOString().slice(0, 10);
