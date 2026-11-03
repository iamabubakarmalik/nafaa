/** Labels for the customer list filters and the khata book. */

import { AlertTriangle, BookOpen, Crown, Users, Wallet, type LucideIcon } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import type { AgingBucket, DirectoryActivity, DirectorySort, DirectoryType } from '../api/customers';

export const TYPES: Array<{ value: DirectoryType; label: string; icon: LucideIcon }> = [
  { value: 'all', label: msg('Sab'), icon: Users },
  { value: 'vip', label: msg('VIP'), icon: Crown },
  { value: 'khata', label: msg('Udhaar wale'), icon: BookOpen },
  { value: 'advance', label: msg('Advance'), icon: Wallet },
  { value: 'overLimit', label: msg('Had se zyada'), icon: AlertTriangle },
];

export const ACTIVITY: Array<{ value: DirectoryActivity; label: string }> = [
  { value: 'all', label: msg('Sab') },
  { value: 'new', label: msg('Is mahine naye') },
  { value: 'active30', label: msg('30 din mein aaye') },
  { value: 'inactive30', label: msg('30 din se nahi aaye') },
  { value: 'inactive60', label: msg('60 din se nahi aaye') },
  { value: 'inactive90', label: msg('90 din se nahi aaye') },
  { value: 'never', label: msg('Kabhi nahi khareeda') },
];

export const SORTS: Array<{ value: DirectorySort; label: string }> = [
  { value: 'recent', label: msg('Naye jore pehle') }, { value: 'old', label: msg('Purane pehle') },
  { value: 'name', label: msg('Naam (A–Z)') }, { value: 'nameDesc', label: msg('Naam (Z–A)') },
  { value: 'spent', label: msg('Zyada khareedne wale') }, { value: 'visits', label: msg('Zyada aane wale') },
  { value: 'average', label: msg('Bara ausat bill') }, { value: 'lastVisit', label: msg('Haal hi mein aaye') },
  { value: 'balance', label: msg('Zyada udhaar') }, { value: 'aging', label: msg('Purana udhaar pehle') },
];

export const STATUS: Array<{ value: 'active' | 'inactive' | 'all'; label: string }> = [
  { value: 'active', label: msg('Chalu') }, { value: 'inactive', label: msg('Band') }, { value: 'all', label: msg('Sab') },
];

export const AGING: Array<{ id: AgingBucket; label: string; tone: 'success' | 'warning' | 'danger' }> = [
  { id: 'd0', label: msg('7 din se kam'), tone: 'success' },
  { id: 'd7', label: msg('7–30 din'), tone: 'warning' },
  { id: 'd30', label: msg('30–90 din'), tone: 'warning' },
  { id: 'd90', label: msg('90+ din'), tone: 'danger' },
];

export const LEDGER_LABEL: Record<string, { label: string; tone: 'danger' | 'success' | 'warning' | 'neutral' | 'info' | 'accent' }> = {
  SALE_CREDIT: { label: msg('Udhaar sale'), tone: 'danger' },
  PAYMENT_RECEIVED: { label: msg('Payment aayi'), tone: 'success' },
  ADJUSTMENT: { label: msg('Udhaar / tabdeeli'), tone: 'warning' },
  OPENING_BALANCE: { label: msg('Purana khata'), tone: 'neutral' },
  REFUND: { label: msg('Maal wapas'), tone: 'info' },
  LOYALTY_REDEEMED: { label: msg('Points istemal'), tone: 'accent' },
};
