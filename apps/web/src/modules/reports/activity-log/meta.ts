/**
 * Turns raw activity-log rows into readable sentences: "Bilal ne branch
 * badli". Labels for actions and record types, the colour and icon of each
 * kind of action, and the page that holds the record.
 */

import {
  Ban, Banknote, Building2, CalendarCheck, Download, KeyRound, Lock, LogOut, Pencil, Plus, Power, Receipt, RotateCcw, Settings2,
  ShieldCheck, ShoppingBag, Trash2, UserRound, type LucideIcon,
} from 'lucide-react';
import { receiptLink } from '@modules/sales/history/receiptPrefs';
import type { ActivityEntry } from './api/activity-log.api';
import { t } from '@core/i18n';

/** Words after "<name> ne …" for actions with their own meaning. */
const ACTION_TEXT: Record<string, string> = {
  SALE_VOIDED: t('bill void kiya'),
  REFUND_PIN_APPROVED: t('PIN se return approve ki'),
  EXPENSE_DELETED: t('expense mitaya'),
  LEAVE_REQUESTED: t('chhutti maangi'),
  LEAVE_APPROVED: t('chhutti approve ki'),
  LEAVE_REJECTED: t('chhutti radd ki'),
  LEAVE_CANCELLED: t('chhutti cancel ki'),
  PAYROLL_RUN: t('tankhwah banayi'),
  SALARY_ADVANCE: t('advance diya'),
  SALARY_CANCELLED: t('tankhwah radd ki'),
  SALARY_ADVANCE_CANCELLED: t('advance radd kiya'),
  COMMISSION_PAID: t('commission di'),
  COMMISSION_PAY_UNDONE: t('commission ki payment wapas li'),
  PIN_VERIFY_FAILED: t('ghalat PIN dala'),
  PIN_SET: t('malik ka PIN lagaya'),
  PIN_RESET: t('PIN badla'),
  PIN_RESET_FAILED: t('PIN badalne ki nakam koshish ki'),
  PIN_REMOVED: t('PIN hataya'),
  PAGE_LOCKS_UPDATED: t('pages ke taale badle'),
  SESSION_REVOKED: t('kisi device se logout karaya'),
  DATA_EXPORTED: t('data download kiya'),
  BACKUP_DOWNLOADED: t('backup download kiya'),
  SETTINGS_UPDATED: t('settings badlin'),
  SETTINGS_RESET: t('settings pehle jaisi kin'),
  OWNERSHIP_TRANSFERRED: t('malikana kisi aur ko diya'),
  TENANT_DELETION_REQUESTED: t('account band karne ki darkhwast di'),
  INTEGRATION_UPDATED: t('integration badli'),
  ONLINE_ORDER_VIEWED: t('online order dekha'),
  COLLECTION_SALE_STARTED: t('collection par Sale lagayi'),
  COLLECTION_SALE_CHANGED: t('collection ki Sale badli'),
  COLLECTION_SALE_ENDED: t('collection ki Sale khatam ki'),
  GARMENT_EXCHANGE: t('exchange kiya'),
};

/** Short labels for the action filter. */
const ACTION_LABEL: Record<string, string> = {
  CREATE: t('Banaya'), UPDATE: t('Badla'), DELETE: t('Mitaya'), FORCE_DELETE: t('Poora mitaya'), ACTIVATE: t('Chalu kiya'), DEACTIVATE: t('Band kiya'),
  SALE_VOIDED: t('Bill void'), REFUND_PIN_APPROVED: t('PIN se return'), EXPENSE_DELETED: t('Expense mitaya'),
  LEAVE_REQUESTED: t('Chhutti maangi'), LEAVE_APPROVED: t('Chhutti approve'), LEAVE_REJECTED: t('Chhutti radd'), LEAVE_CANCELLED: t('Chhutti cancel'),
  PAYROLL_RUN: t('Tankhwah'), SALARY_ADVANCE: t('Advance'), SALARY_CANCELLED: t('Tankhwah radd'), SALARY_ADVANCE_CANCELLED: t('Advance radd'),
  COMMISSION_PAID: t('Commission di'), COMMISSION_PAY_UNDONE: t('Commission wapas'),
  PIN_VERIFY_FAILED: t('Ghalat PIN'), PIN_SET: t('PIN lagaya'), PIN_RESET: t('PIN badla'), PIN_RESET_FAILED: t('PIN badalna nakam'), PIN_REMOVED: t('PIN hataya'),
  PAGE_LOCKS_UPDATED: t('Page locks'), SESSION_REVOKED: t('Device logout'), DATA_EXPORTED: t('Data download'), BACKUP_DOWNLOADED: t('Backup download'),
  SETTINGS_UPDATED: t('Settings badlin'), SETTINGS_RESET: t('Settings reset'), OWNERSHIP_TRANSFERRED: t('Malikana diya'),
  TENANT_DELETION_REQUESTED: t('Account band'), INTEGRATION_UPDATED: t('Integration'), ONLINE_ORDER_VIEWED: t('Online order dekha'),
  COLLECTION_SALE_STARTED: t('Collection Sale shuru'), COLLECTION_SALE_CHANGED: t('Collection Sale badli'), COLLECTION_SALE_ENDED: t('Collection Sale khatam'),
  GARMENT_EXCHANGE: t('Exchange'),
};

const ENTITY_LABEL: Record<string, string> = {
  Shop: 'branch', TeamMember: 'login', Staff: 'staff', Sale: 'bill', SaleReturn: 'wapsi', Expense: 'kharcha', StaffLeave: 'chhutti',
  SalaryPayment: 'tankhwah', CommissionPayout: 'commission', TenantSettings: 'settings', Integration: 'integration', Session: 'session',
  backup: 'backup', ChannelOrder: t('online order'), Tenant: 'account', Attendance: 'haazri', GarmentCollection: 'collection',
};

const VERB: Record<string, string> = {
  CREATE: 'banaya', UPDATE: 'badla', DELETE: 'mitaya', FORCE_DELETE: t('poora mita diya'), ACTIVATE: t('chalu kiya'), DEACTIVATE: t('band kiya'),
};

const humanize = (k: string) => k.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const actionLabel = (a: string) => ACTION_LABEL[a] ?? humanize(a);
export const entityLabel = (e: string) => {
  const l = ENTITY_LABEL[e];
  return l ? l.charAt(0).toUpperCase() + l.slice(1) : humanize(e);
};

type Kind = 'create' | 'update' | 'delete' | 'money' | 'security' | 'other';

const KIND_META: Record<Kind, { icon: LucideIcon; color: string }> = {
  create: { icon: Plus, color: '#16a34a' },
  update: { icon: Pencil, color: '#2563eb' },
  delete: { icon: Trash2, color: '#e11d48' },
  money: { icon: Banknote, color: '#d97706' },
  security: { icon: ShieldCheck, color: '#7c3aed' },
  other: { icon: Settings2, color: '#64748b' },
};

/** A more specific icon where one fits. */
const ACTION_ICON: Record<string, LucideIcon> = {
  SALE_VOIDED: Ban, REFUND_PIN_APPROVED: RotateCcw, EXPENSE_DELETED: Receipt, ACTIVATE: Power, DEACTIVATE: Power,
  PIN_VERIFY_FAILED: KeyRound, PIN_SET: KeyRound, PIN_RESET: KeyRound, PIN_RESET_FAILED: KeyRound, PIN_REMOVED: KeyRound,
  PAGE_LOCKS_UPDATED: Lock, SESSION_REVOKED: LogOut, DATA_EXPORTED: Download, BACKUP_DOWNLOADED: Download,
  ONLINE_ORDER_VIEWED: ShoppingBag, LEAVE_REQUESTED: CalendarCheck, LEAVE_APPROVED: CalendarCheck, LEAVE_REJECTED: CalendarCheck,
};
const ENTITY_ICON: Record<string, LucideIcon> = { Shop: Building2, TeamMember: UserRound, Staff: UserRound };

export function kindOf(action: string): Kind {
  if (/DELETE|VOID|REMOVED|CANCEL|UNDONE|DELETION/.test(action)) return 'delete';
  if (/PIN|SESSION|LOCK|OWNERSHIP|EXPORT|BACKUP/.test(action)) return 'security';
  if (/SALARY|PAYROLL|COMMISSION|REFUND/.test(action)) return 'money';
  if (action === 'CREATE' || action === 'ACTIVATE' || action.endsWith('_REQUESTED') || action.endsWith('_APPROVED')) return 'create';
  if (action === 'UPDATE' || action === 'DEACTIVATE' || action.endsWith('_UPDATED') || action.endsWith('_RESET')) return 'update';
  return 'other';
}

export function iconOf(e: Pick<ActivityEntry, 'action' | 'entityType'>): { icon: LucideIcon; color: string } {
  const k = KIND_META[kindOf(e.action)];
  return { icon: ACTION_ICON[e.action] ?? (e.entityType && ENTITY_ICON[e.entityType]) ?? k.icon, color: k.color };
}

/** "Bilal ne branch badla" style sentence; the record's name comes from the detail line. */
export function sentence(e: ActivityEntry): string {
  const who = e.user?.fullName ?? t('System');
  const own = ACTION_TEXT[e.action];
  if (own) return t('{{who}} ne {{own}}', { who, own });
  const verb = VERB[e.action];
  const what = e.entityType ? ENTITY_LABEL[e.entityType] ?? humanize(e.entityType).toLowerCase() : '';
  if (verb) return t('{{who}} ne {{value}}{{verb}}', { who, value: what ? `${what} ` : '', verb });
  return `${who}: ${humanize(e.action)}${what ? ` (${what})` : ''}`;
}

/** The stored description without the actor's email at the start (older rows begin with it). */
export function detailOf(e: ActivityEntry): string {
  return e.description.replace(/^\S+@\S+\s+/, '').replace(/^\w/, (c) => c.toUpperCase());
}

/** Page that holds the record, if there is one. */
export function linkOf(e: ActivityEntry): { to: string; label: string } | null {
  const id = e.entityId;
  switch (e.entityType) {
    case 'Shop': return id && e.action !== 'DELETE' && e.action !== 'FORCE_DELETE' ? { to: `/shops/${id}/edit`, label: t('Branch kholein') } : { to: '/shops', label: t('Branches') };
    case 'TeamMember':
    case 'Staff': return id && e.action !== 'DELETE' ? { to: `/staff/${id}`, label: t('Profile kholein') } : { to: '/staff', label: t('Staff') };
    case 'Sale': return id ? { to: receiptLink(id), label: t('Bill kholein') } : null;
    case 'SaleReturn': return { to: '/returns', label: t('Return dekhein') };
    case 'Expense': return { to: '/expenses', label: t('Expenses') };
    case 'StaffLeave': return { to: '/staff/attendance', label: t('Haazri') };
    case 'CommissionPayout': return { to: '/staff/commission', label: t('Commission') };
    case 'TenantSettings':
    case 'Integration': return { to: '/settings', label: t('Settings') };
    case 'Session': return { to: '/settings/security', label: t('Security') };
    case 'ChannelOrder': return id ? { to: `/online-orders?order=${id}`, label: t('Order kholein') } : null;
    default: return e.action.startsWith('PIN_') || e.action === 'PAGE_LOCKS_UPDATED' ? { to: '/settings/security', label: t('Security') } : null;
  }
}

/** "Windows · Chrome" from a user agent. */
export function deviceOf(ua?: string | null): string | null {
  if (!ua) return null;
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : ''; // i18n-ignore
  const app = /Electron/i.test(ua) ? t('Desktop app') : /Expo|okhttp/i.test(ua) ? t('Mobile app') : /Edg\//i.test(ua) ? t('Edge') : /Chrome/i.test(ua) ? t('Chrome') : /Firefox/i.test(ua) ? t('Firefox') : /Safari/i.test(ua) ? t('Safari') : t('Browser');
  return [os, app].filter(Boolean).join(' · ');
}
