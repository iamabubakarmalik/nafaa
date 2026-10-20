/**
 * Nafaa's own price, for best-of items and compare cards. Read only from the
 * Plan table through GET /public/site/plans (ARCH D10): the lowest paid
 * monthly price and the trial plan's own label. Nothing about plans is typed
 * here, so a plan change in Admin → Plans shows up through the `plans` tag.
 */
import type { PublicPlan } from '@/lib/cms/contract/cms-contract';
import { getPlans } from '@/lib/cms/client';
import { isProduction } from '@/lib/cms/env';
import { formatPkr } from './format';

export interface NafaaPriceSummary {
  /** "Rs 1,500", or null when no paid public plan exists. */
  minPaidMonthly: string | null;
  /** The trial plan's tagline or name ("7 din Free Trial"), or null. */
  trialLabel: string | null;
  trialDays: number | null;
}

export function summarisePlans(plans: readonly PublicPlan[]): NafaaPriceSummary {
  const paid = plans.filter((plan) => plan.priceMonthly > 0).map((plan) => plan.priceMonthly);
  const trial = plans.find((plan) => plan.priceMonthly === 0 && plan.trialDays > 0) ?? plans.find((plan) => plan.priceMonthly === 0);
  return {
    minPaidMonthly: paid.length ? formatPkr(Math.min(...paid)) : null,
    trialLabel: trial ? (trial.display.tagline ?? trial.name) : null,
    trialDays: trial?.trialDays ?? null,
  };
}

/** Plans with a development fallback (empty) when the API is down; production fails loudly. */
export async function loadPlans(): Promise<PublicPlan[]> {
  try {
    return await getPlans();
  } catch (error) {
    if (isProduction) throw error;
    return [];
  }
}
