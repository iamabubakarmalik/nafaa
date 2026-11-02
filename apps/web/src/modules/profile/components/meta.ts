/** Labels and formatting shared by the profile tabs. */

import { Crown, Shield, ShieldCheck, User, UserCog, type LucideIcon } from 'lucide-react';
import { t } from '@core/i18n';

export const ROLE: Record<string, { label: string; icon: LucideIcon }> = {
  OWNER: { label: t('Malik'), icon: Crown },
  MANAGER: { label: t('Manager'), icon: UserCog },
  CASHIER: { label: t('Cashier'), icon: User },
  STAFF: { label: t('Staff'), icon: Shield },
  SUPER_ADMIN: { label: t('Nafaa admin'), icon: ShieldCheck },
};

export const day = (v?: string | null) => (v ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v)) : '—');

export function ago(v?: string | null) {
  if (!v) return '—';
  const mins = Math.floor((Date.now() - new Date(v).getTime()) / 60_000);
  if (mins < 1) return t('Abhi');
  if (mins < 60) return t('{{mins}} minute pehle', { mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('{{hrs}} ghante pehle', { hrs });
  const days = Math.floor(hrs / 24);
  return days < 7 ? t('{{days}} din pehle', { days }) : day(v);
}

export const errorText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;
