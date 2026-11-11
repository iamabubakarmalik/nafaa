/**
 * Helpers shared by the partner portal, the commission job and the admin
 * partner pages.
 */

import { randomInt } from 'crypto';
import type { PartnerPlan, PrismaClient } from '@prisma/client';

/** Days a lead's phone stays with the partner who added it first. */
export const LEAD_LOCK_DAYS = 30;
/** Smallest payout a partner can ask for, in PKR. */
export const MIN_PAYOUT = 500;
export const SYSTEM_TENANT_SLUG = 'nafaa-system';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Partner codes look like "NP7K3QXA": no hyphen, so they never clash with shop codes ("NAFAA-…"). */
export function makePartnerCode(): string {
  let s = 'NP';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return s;
}

/** "+92 300-1234567", "923001234567", "3001234567" → "03001234567". Anything else is returned trimmed. */
export function normalizePhone(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (/^923\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  if (/^3\d{9}$/.test(digits)) return `0${digits}`;
  if (/^03\d{9}$/.test(digits)) return digits;
  return (raw ?? '').trim();
}

/** Every way a Pakistani mobile number may be stored on a shop or user. */
export function phoneVariants(phone: string): string[] {
  const p = normalizePhone(phone);
  if (!/^03\d{9}$/.test(p)) return [p];
  const rest = p.slice(1);
  return [p, `92${rest}`, `+92${rest}`, `+92 ${rest}`, rest];
}

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

/** "2026-11" for a date in Pakistan time. */
export function pkMonth(d: Date = new Date()): string {
  const pk = new Date(d.getTime() + 5 * 3_600_000);
  return `${pk.getUTCFullYear()}-${String(pk.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** UTC start of a Pakistan month ("2026-11" → 2026-10-31T19:00Z). */
export function pkMonthStart(month: string): Date {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1) - 5 * 3_600_000);
}

export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

export interface PlanSlab { signups: number; bonus: number }

export function planSlabs(plan: Pick<PartnerPlan, 'slabs'>): PlanSlab[] {
  const raw = Array.isArray(plan.slabs) ? (plan.slabs as unknown[]) : [];
  return raw
    .map((s) => s as Partial<PlanSlab>)
    .filter((s) => Number(s.signups) > 0 && Number(s.bonus) > 0)
    .map((s) => ({ signups: Math.floor(Number(s.signups)), bonus: Number(s.bonus) }))
    .sort((a, b) => a.signups - b.signups);
}

/**
 * The plan everyone without their own plan uses. Created on first use with
 * zero amounts, so nothing is earned until an admin sets the numbers.
 */
export async function defaultPlan(prisma: PrismaClient | { partnerPlan: PrismaClient['partnerPlan'] }): Promise<PartnerPlan> {
  const found = await prisma.partnerPlan.findFirst({ where: { isDefault: true }, orderBy: { createdAt: 'asc' } });
  if (found) return found;
  return prisma.partnerPlan.create({
    data: {
      name: 'Standard',
      description: 'Default plan for partners without their own plan. Set the amounts before partners start.',
      isDefault: true,
    },
  });
}
