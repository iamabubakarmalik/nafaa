/** Labels, colours, icons and links for audit event types and severities. */

import {
  Ban, BadgePercent, Banknote, KeyRound, LogIn, PackageMinus, PackageX, RotateCcw, Settings2, TrendingDown, Trash2, Truck, Wallet,
  type LucideIcon,
} from 'lucide-react';
import { receiptLink } from '@modules/sales/history/receiptPrefs';
import type { AuditEvent, AuditType, Severity } from './api';

export interface TypeMeta { label: string; icon: LucideIcon; color: string; hint: string; money: 'sale' | 'cost' | 'none' }

export const TYPE_META: Record<AuditType, TypeMeta> = {
  void: { label: 'Void bill', icon: Ban, color: '#e11d48', hint: 'Cancel kiye gaye bill. Bill kis ka tha, kitni der baad cancel hua, wajah likhi ya nahi.', money: 'sale' },
  refund: { label: 'Return', icon: RotateCcw, color: '#ea580c', hint: 'Maal return. Cash return, bina customer ka bill, purana bill aur dukaan band hone ke baad ki return khaas dekhi jati hai.', money: 'sale' },
  discount: { label: 'Bari discount', icon: BadgePercent, color: '#db2777', hint: 'Jin bill par haath ki discount aap ki had se zyada thi. Code aur points ki discount is me nahi.', money: 'sale' },
  below_cost: { label: 'Cost se kam', icon: TrendingDown, color: '#b45309', hint: 'Jin bill me koi cheez apni cost se kam rate par biki.', money: 'cost' },
  pin: { label: 'PIN', icon: KeyRound, color: '#7c3aed', hint: 'Malik ke PIN se approval, ghalat PIN, PIN badalna ya hatana.', money: 'none' },
  drawer: { label: 'Drawer farq', icon: Wallet, color: '#0891b2', hint: 'Shift band karte waqt galle me paisa kam ya zyada nikla, ya drawer band hi nahi hua.', money: 'sale' },
  cash_out: { label: 'Galle se nikale', icon: Banknote, color: '#0d9488', hint: 'Shift ke dauran galle se nikala gaya cash. Bari amount aur bina wajah wale khaas.', money: 'sale' },
  stock_loss: { label: 'Stock kam kiya', icon: PackageMinus, color: '#64748b', hint: 'Haath se stock ghataya, gum ya chori likha, ya ginti me maal kam nikla. Cost par.', money: 'cost' },
  damage: { label: 'Kharab maal', icon: PackageX, color: '#a16207', hint: 'Damage report. Chori, aur jo khud likh kar khud approve kiya gaya, khaas dekhein.', money: 'cost' },
  transfer_short: { label: 'Transfer kam', icon: Truck, color: '#4f46e5', hint: 'Branch se branch maal bheja magar kam pohncha. Cost par.', money: 'cost' },
  expense_deleted: { label: 'Expense mitaya', icon: Trash2, color: '#be123c', hint: 'Likha hua expense baad me mita diya gaya.', money: 'none' },
  settings: { label: 'Settings / team', icon: Settings2, color: '#475569', hint: 'Settings, team member, branch, integration ya data download me badlav.', money: 'none' },
  login: { label: 'Login', icon: LogIn, color: '#2563eb', hint: 'Nakam login aur naye device se login.', money: 'none' },
};

export const TYPE_ORDER = Object.keys(TYPE_META) as AuditType[];

export const SEVERITY_META: Record<Severity, { label: string; color: string; soft: string; hint: string }> = {
  high: { label: 'Zaroor dekhein', color: '#e11d48', soft: 'bg-rose-50 text-rose-700 ring-rose-200', hint: 'Bari amount ya kai shak wali baatein ek saath' },
  medium: { label: 'Dhyan dein', color: '#f59e0b', soft: 'bg-amber-50 text-amber-800 ring-amber-200', hint: 'Ek do baatein aam se hat kar' },
  low: { label: 'Aam', color: '#94a3b8', soft: 'bg-slate-100 text-slate-600 ring-slate-200', hint: 'Record ke liye — aksar theek hota hai' },
};

export const ROLE_LABEL: Record<string, string> = { OWNER: 'Malik', MANAGER: 'Manager', CASHIER: 'Cashier', STAFF: 'Staff', SUPER_ADMIN: 'Admin' };

/** Page that holds the event's own record, if any. */
export function eventLink(e: Pick<AuditEvent, 'ref' | 'type'>): { to: string; label: string } | null {
  const { kind, id, code } = e.ref;
  switch (kind) {
    case 'sale': return id ? { to: receiptLink(id), label: 'Bill kholein' } : null;
    case 'return': return { to: code ? `/returns?q=${encodeURIComponent(code)}` : '/returns', label: 'Return dekhein' };
    case 'register': return { to: '/cash-register', label: 'Cash register' };
    case 'adjustment': return { to: '/stock-adjustments', label: 'Stock adjustments' };
    case 'damage': return { to: '/damage', label: 'Damage report' };
    case 'transfer': return { to: '/transfers', label: 'Transfers' };
    case 'expense': return { to: '/expenses', label: 'Expenses' };
    case 'login': return { to: '/settings?tab=security', label: 'Security settings' };
    default: return e.type === 'settings' ? { to: '/activity-log', label: 'Activity log' } : null;
  }
}

export const when = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
export const whenFull = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(v));
export const timeOnly = (v: string) => new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(v));

/** "2026-10-04" → "4 Oct", "2026-10" → "Oct 26". */
export const keyLabel = (k: string) =>
  k.length === 7
    ? new Date(`${k}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' })
    : new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export const hourLabel = (h: number) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);

/** Score colour band. */
export const scoreColor = (s: number) => (s >= 70 ? '#e11d48' : s >= 40 ? '#f59e0b' : '#16a34a');
