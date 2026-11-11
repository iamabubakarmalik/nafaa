/**
 * Billing rules the admin can change (Admin → Billing → Settings). Stored as
 * one JSON SystemSetting ("billing.settings"); missing values use DEFAULTS.
 */

import type { PrismaService } from '../../../prisma/prisma.service';

export interface BillingSettings {
  /** Days a new shop gets everything for free. */
  trialDays: number;
  /** Days after the plan ends before the app stops (0 = stops the same day). */
  graceDays: number;
  /** Days to pay for an add-on turned on with "Add now". */
  addOnPayDays: number;
  /** Days before the period ends that the renewal bill is made and sent. */
  renewalLeadDays: number;
  /** Days before the end on which reminders go out. */
  reminderDays: number[];
  /** Days before the grandfather period ends that owners are told. */
  grandfatherNoticeDays: number[];
  /** Yearly plans get Assisted setup free (and its price off Full activation). */
  yearlyFreeSetup: boolean;
}

export const BILLING_SETTINGS_KEY = 'billing.settings';

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  trialDays: 7,
  graceDays: 3,
  addOnPayDays: 3,
  renewalLeadDays: 7,
  reminderDays: [7, 3, 1],
  grandfatherNoticeDays: [14, 3],
  yearlyFreeSetup: true,
};

const intIn = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
const days = (v: unknown, fallback: number[]) =>
  Array.isArray(v) ? [...new Set(v.map((x) => intIn(x, 0, 60, -1)).filter((x) => x >= 0))].sort((a, b) => b - a) : fallback;

export function cleanBillingSettings(raw: Partial<BillingSettings> | null | undefined): BillingSettings {
  const d = DEFAULT_BILLING_SETTINGS;
  const r = raw ?? {};
  return {
    trialDays: intIn(r.trialDays, 0, 90, d.trialDays),
    graceDays: intIn(r.graceDays, 0, 30, d.graceDays),
    addOnPayDays: intIn(r.addOnPayDays, 0, 30, d.addOnPayDays),
    renewalLeadDays: intIn(r.renewalLeadDays, 1, 30, d.renewalLeadDays),
    reminderDays: days(r.reminderDays, d.reminderDays),
    grandfatherNoticeDays: days(r.grandfatherNoticeDays, d.grandfatherNoticeDays),
    yearlyFreeSetup: typeof r.yearlyFreeSetup === 'boolean' ? r.yearlyFreeSetup : d.yearlyFreeSetup,
  };
}

let cache: { value: BillingSettings; at: number } | null = null;

export async function loadBillingSettings(prisma: PrismaService, fresh = false): Promise<BillingSettings> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.value;
  const row = await prisma.systemSetting.findUnique({ where: { key: BILLING_SETTINGS_KEY }, select: { value: true } });
  let parsed: Partial<BillingSettings> | null = null;
  try { parsed = row ? JSON.parse(row.value) : null; } catch { parsed = null; }
  const value = cleanBillingSettings(parsed);
  cache = { value, at: Date.now() };
  return value;
}

export async function saveBillingSettings(prisma: PrismaService, userId: string, input: Partial<BillingSettings>): Promise<BillingSettings> {
  const value = cleanBillingSettings({ ...(await loadBillingSettings(prisma, true)), ...input });
  await prisma.systemSetting.upsert({
    where: { key: BILLING_SETTINGS_KEY },
    create: { key: BILLING_SETTINGS_KEY, value: JSON.stringify(value), category: 'billing', description: 'Trial, grace and reminder rules', updatedById: userId },
    update: { value: JSON.stringify(value), updatedById: userId },
  });
  // Keep the trial plan's length in step with the setting.
  await prisma.plan.updateMany({ where: { slug: 'free-trial' }, data: { trialDays: value.trialDays } });
  cache = { value, at: Date.now() };
  return value;
}
