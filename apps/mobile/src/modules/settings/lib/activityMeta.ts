/**
 * Turns raw activity-log rows into readable sentences ("Bilal ne branch badla"),
 * with labels for actions and record types and the page that holds the record
 * (same wording as the web reports/activity-log/meta.ts).
 */

import { Ban, Banknote, Building2, Download, KeyRound, Lock, LogOut, Pencil, Plus, Power, Receipt, RotateCcw, Settings2, ShieldCheck, Trash2, UserRound, type LucideIcon } from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import type { ActivityEntry } from '../api/settings';

/** Words after "<name> ne …" for actions with their own meaning. */
const ACTION_TEXT: Record<string, string> = {
  SALE_VOIDED: msg('bill void kiya'),
  REFUND_PIN_APPROVED: msg('PIN se return approve ki'),
  EXPENSE_DELETED: msg('expense mitaya'),
  LEAVE_REQUESTED: msg('chhutti maangi'),
  LEAVE_APPROVED: msg('chhutti approve ki'),
  LEAVE_REJECTED: msg('chhutti radd ki'),
  LEAVE_CANCELLED: msg('chhutti cancel ki'),
  PAYROLL_RUN: msg('tankhwah banayi'),
  SALARY_ADVANCE: msg('advance diya'),
  SALARY_CANCELLED: msg('tankhwah radd ki'),
  SALARY_ADVANCE_CANCELLED: msg('advance radd kiya'),
  COMMISSION_PAID: msg('commission di'),
  COMMISSION_PAY_UNDONE: msg('commission ki payment wapas li'),
  PIN_VERIFY_FAILED: msg('ghalat PIN dala'),
  PIN_SET: msg('malik ka PIN lagaya'),
  PIN_RESET: msg('PIN badla'),
  PIN_RESET_FAILED: msg('PIN badalne ki nakam koshish ki'),
  PIN_REMOVED: msg('PIN hataya'),
  PAGE_LOCKS_UPDATED: msg('pages ke taale badle'),
  SESSION_REVOKED: msg('kisi device se logout karaya'),
  DATA_EXPORTED: msg('data download kiya'),
  BACKUP_DOWNLOADED: msg('backup download kiya'),
  SETTINGS_UPDATED: msg('settings badlin'),
  SETTINGS_RESET: msg('settings pehle jaisi kin'),
  OWNERSHIP_TRANSFERRED: msg('malikana kisi aur ko diya'),
  TENANT_DELETION_REQUESTED: msg('account band karne ki darkhwast di'),
  INTEGRATION_UPDATED: msg('integration badli'),
  ONLINE_ORDER_VIEWED: msg('online order dekha'),
  COLLECTION_SALE_STARTED: msg('collection par Sale lagayi'),
  COLLECTION_SALE_CHANGED: msg('collection ki Sale badli'),
  COLLECTION_SALE_ENDED: msg('collection ki Sale khatam ki'),
  GARMENT_EXCHANGE: msg('exchange kiya'),
};

/** Short labels for the action filter. */
const ACTION_LABEL: Record<string, string> = {
  CREATE: msg('Banaya'), UPDATE: msg('Badla'), DELETE: msg('Mitaya'), FORCE_DELETE: msg('Poora mitaya'), ACTIVATE: msg('Chalu kiya'), DEACTIVATE: msg('Band kiya'),
  SALE_VOIDED: msg('Bill void'), REFUND_PIN_APPROVED: msg('PIN se return'), EXPENSE_DELETED: msg('Expense mitaya'),
  LEAVE_REQUESTED: msg('Chhutti maangi'), LEAVE_APPROVED: msg('Chhutti approve'), LEAVE_REJECTED: msg('Chhutti radd'), LEAVE_CANCELLED: msg('Chhutti cancel'),
  PAYROLL_RUN: msg('Tankhwah'), SALARY_ADVANCE: msg('Advance'), SALARY_CANCELLED: msg('Tankhwah radd'), SALARY_ADVANCE_CANCELLED: msg('Advance radd'),
  COMMISSION_PAID: msg('Commission di'), COMMISSION_PAY_UNDONE: msg('Commission wapas'),
  PIN_VERIFY_FAILED: msg('Ghalat PIN'), PIN_SET: msg('PIN lagaya'), PIN_RESET: msg('PIN badla'), PIN_RESET_FAILED: msg('PIN badalna nakam'), PIN_REMOVED: msg('PIN hataya'),
  PAGE_LOCKS_UPDATED: msg('Page locks'), SESSION_REVOKED: msg('Device logout'), DATA_EXPORTED: msg('Data download'), BACKUP_DOWNLOADED: msg('Backup download'),
  SETTINGS_UPDATED: msg('Settings badlin'), SETTINGS_RESET: msg('Settings reset'), OWNERSHIP_TRANSFERRED: msg('Malikana diya'),
  TENANT_DELETION_REQUESTED: msg('Account band'), INTEGRATION_UPDATED: msg('Integration'), ONLINE_ORDER_VIEWED: msg('Online order dekha'),
  COLLECTION_SALE_STARTED: msg('Collection Sale shuru'), COLLECTION_SALE_CHANGED: msg('Collection Sale badli'), COLLECTION_SALE_ENDED: msg('Collection Sale khatam'),
  GARMENT_EXCHANGE: msg('Exchange'),
};

const ENTITY_LABEL: Record<string, string> = {
  Shop: 'branch', TeamMember: 'login', Staff: 'staff', Sale: 'bill', SaleReturn: 'wapsi', Expense: 'kharcha', StaffLeave: 'chhutti',
  SalaryPayment: 'tankhwah', CommissionPayout: 'commission', TenantSettings: 'settings', Integration: 'integration', Session: 'session',
  backup: 'backup', ChannelOrder: msg('online order'), Tenant: 'account', Attendance: 'haazri', GarmentCollection: 'collection',
};

const VERB: Record<string, string> = {
  CREATE: 'banaya', UPDATE: 'badla', DELETE: 'mitaya', FORCE_DELETE: msg('poora mita diya'), ACTIVATE: msg('chalu kiya'), DEACTIVATE: msg('band kiya'),
};

const humanize = (k: string) => k.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export const actionLabel = (a: string) => (ACTION_LABEL[a] ? t(ACTION_LABEL[a]) : humanize(a));
export const entityLabel = (e: string) => {
  const l = ENTITY_LABEL[e];
  return l ? t(l.charAt(0).toUpperCase() + l.slice(1)) : humanize(e);
};


export type Kind = 'create' | 'update' | 'delete' | 'money' | 'security' | 'other';
const KIND_META: Record<Kind, { icon: LucideIcon; tone: 'success' | 'info' | 'danger' | 'warning' | 'brand' | 'muted' }> = {
  create: { icon: Plus, tone: 'success' }, update: { icon: Pencil, tone: 'info' }, delete: { icon: Trash2, tone: 'danger' },
  money: { icon: Banknote, tone: 'warning' }, security: { icon: ShieldCheck, tone: 'brand' }, other: { icon: Settings2, tone: 'muted' },
};
const ACTION_ICON: Record<string, LucideIcon> = {
  SALE_VOIDED: Ban, REFUND_PIN_APPROVED: RotateCcw, EXPENSE_DELETED: Receipt, ACTIVATE: Power, DEACTIVATE: Power,
  PIN_VERIFY_FAILED: KeyRound, PIN_SET: KeyRound, PIN_RESET: KeyRound, PIN_RESET_FAILED: KeyRound, PIN_REMOVED: KeyRound,
  PAGE_LOCKS_UPDATED: Lock, SESSION_REVOKED: LogOut, DATA_EXPORTED: Download, BACKUP_DOWNLOADED: Download,
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

export function iconOf(e: Pick<ActivityEntry, 'action' | 'entityType'>) {
  const k = KIND_META[kindOf(e.action)];
  return { icon: ACTION_ICON[e.action] ?? (e.entityType && ENTITY_ICON[e.entityType]) ?? k.icon, tone: k.tone };
}

/** "Bilal ne branch badla" style sentence. */
export function sentence(e: ActivityEntry): string {
  const who = e.user?.fullName ?? t('System');
  const own = ACTION_TEXT[e.action];
  if (own) return t('{{who}} ne {{own}}', { who, own: t(own) });
  const verb = VERB[e.action];
  const what = e.entityType ? t(ENTITY_LABEL[e.entityType] ?? humanize(e.entityType).toLowerCase()) : '';
  if (verb) return t('{{who}} ne {{value}}{{verb}}', { who, value: what ? `${what} ` : '', verb: t(verb) });
  return `${who}: ${humanize(e.action)}${what ? ` (${what})` : ''}`;
}

/** The stored description without the actor's email at the start (older rows begin with it). */
export function detailOf(e: ActivityEntry): string {
  return e.description.replace(/^\S+@\S+\s+/, '').replace(/^\w/, (c) => c.toUpperCase());
}

/** App route of the record, if there is one. */
export function routeOf(e: ActivityEntry): { href: string; label: string } | null {
  const id = e.entityId;
  switch (e.entityType) {
    case 'Shop': return { href: '/shops', label: t('Branches') };
    case 'TeamMember':
    case 'Staff': return id && e.action !== 'DELETE' ? { href: `/staff/${id}`, label: t('Profile kholein') } : { href: '/staff', label: t('Staff') };
    case 'Sale': return id ? { href: `/sales/${id}`, label: t('Bill kholein') } : null;
    case 'SaleReturn': return { href: '/returns', label: t('Return dekhein') };
    case 'Expense': return { href: '/expenses', label: t('Expenses') };
    case 'StaffLeave': return { href: '/staff/attendance', label: t('Haazri') };
    case 'ChannelOrder': return id ? { href: `/online/orders/${id}`, label: t('Order kholein') } : null;
    case 'TenantSettings': case 'Integration': return { href: '/settings', label: t('Settings') };
    default: return null;
  }
}
