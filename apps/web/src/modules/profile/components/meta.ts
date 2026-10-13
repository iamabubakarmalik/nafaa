/** Labels and formatting shared by the profile tabs. */

import { Crown, Shield, ShieldCheck, User, UserCog, type LucideIcon } from 'lucide-react';

export const ROLE: Record<string, { label: string; icon: LucideIcon }> = {
  OWNER: { label: 'Malik', icon: Crown },
  MANAGER: { label: 'Manager', icon: UserCog },
  CASHIER: { label: 'Cashier', icon: User },
  STAFF: { label: 'Staff', icon: Shield },
  SUPER_ADMIN: { label: 'Nafaa admin', icon: ShieldCheck },
};

export const day = (v?: string | null) => (v ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v)) : '—');

export function ago(v?: string | null) {
  if (!v) return '—';
  const mins = Math.floor((Date.now() - new Date(v).getTime()) / 60_000);
  if (mins < 1) return 'Abhi';
  if (mins < 60) return `${mins} minute pehle`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ghante pehle`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days} din pehle` : day(v);
}

export const errorText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;
