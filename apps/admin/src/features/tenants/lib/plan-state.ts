/**
 * One way to describe a shop's plan in the admin panel: a state badge and a
 * line with the exact end (Pakistan time), e.g. "Basic · ends 12 Nov 2026,
 * 1:04 PM", "Trial · ends …" or "Expired 12 Nov, 1:04 PM".
 */

import { formatPkDateTime, formatTimeLeft } from '@/lib/format';

export type PlanState = 'trial' | 'active' | 'free' | 'grace' | 'expired';
export type BadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'brand' | 'default';

export const PLAN_STATE: Record<PlanState | 'paused', { label: string; variant: BadgeTone }> = {
  trial: { label: 'Trial', variant: 'info' },
  active: { label: 'Active', variant: 'success' },
  free: { label: 'Free', variant: 'brand' },
  grace: { label: 'In grace', variant: 'warning' },
  expired: { label: 'Expired', variant: 'danger' },
  paused: { label: 'Paused', variant: 'danger' },
};

/** "Basic · ends 12 Nov 2026, 1:04 PM" and friends. */
export function planEndLine(state: PlanState, planName: string | null | undefined, endsAt: string | null | undefined): string {
  const name = planName || 'No plan';
  if (state === 'free') return `${planName || 'Free'} · never ends`;
  if (!endsAt) return state === 'expired' ? (planName ? `${name} · expired` : 'No plan') : name;
  if (state === 'trial') return `Trial · ends ${formatPkDateTime(endsAt)}`;
  if (state === 'active') return `${name} · ends ${formatPkDateTime(endsAt)}`;
  if (state === 'grace') return `${name} · unpaid, stops ${formatPkDateTime(endsAt)}`;
  return `Expired ${formatPkDateTime(endsAt, { short: new Date(endsAt).getFullYear() === new Date().getFullYear() })}`;
}

/** "in 5 h" / "3 days ago"; empty for free plans or without a date. */
export const planEndHint = (state: PlanState, endsAt: string | null | undefined) =>
  state === 'free' || !endsAt ? '' : formatTimeLeft(endsAt);
