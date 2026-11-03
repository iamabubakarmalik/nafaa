import { Crown, Shield, ShieldCheck, User, UserCog, type LucideIcon } from 'lucide-react-native';
import { formatDate, formatRelative } from '@/core/format';
import { msg } from '@/core/i18n';
import type { StatusTone } from '@/design';

export const ROLE: Record<string, { label: string; icon: LucideIcon; tone: StatusTone }> = {
  OWNER: { label: msg('Owner'), icon: Crown, tone: 'accent' },
  MANAGER: { label: msg('Manager'), icon: UserCog, tone: 'brand' },
  CASHIER: { label: msg('Cashier'), icon: User, tone: 'info' },
  STAFF: { label: msg('Staff'), icon: Shield, tone: 'neutral' },
  SUPER_ADMIN: { label: msg('Nafaa admin'), icon: ShieldCheck, tone: 'danger' },
};

export const day = (v?: string | null) => (v ? formatDate(v, { year: true }) : '—');
export const ago = (v?: string | null) => (v ? formatRelative(v) : '—');
