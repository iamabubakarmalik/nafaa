/**
 * Words used for partner types, stages, earnings and visit flags on the
 * admin partner pages. Flag wording matches the API (modules/partners/
 * shared/visit-checks.ts) so the portal and the admin read the same.
 */

import type { EarningKind, LeadStage, PartnerType, VisitFlag } from '@/api/admin-partners.api';

export const TYPE_LABEL: Record<PartnerType, string> = {
  REFERRAL: 'Referral partner',
  FIELD_AGENT: 'Field agent',
  RESELLER: 'City reseller',
  TRAINER: 'Trainer',
  EMPLOYEE: 'Nafaa employee',
};
export const PARTNER_TYPES = Object.keys(TYPE_LABEL) as PartnerType[];

export const STAGE_LABEL: Record<LeadStage, string> = {
  VISITED: 'Visited',
  DEMO: 'Demo given',
  SIGNED_UP: 'Signed up',
  ACTIVATED: 'Activated',
  PAID: 'Paid',
  LOST: 'Lost',
};
export const LEAD_STAGES = Object.keys(STAGE_LABEL) as LeadStage[];
export const STAGE_TONE: Record<LeadStage, 'default' | 'info' | 'warning' | 'success' | 'danger' | 'brand'> = {
  VISITED: 'default', DEMO: 'info', SIGNED_UP: 'brand', ACTIVATED: 'warning', PAID: 'success', LOST: 'danger',
};

export const KIND_LABEL: Record<EarningKind, string> = {
  SIGNUP_BONUS: 'Signup bonus',
  ACTIVATION_BONUS: 'Activation bonus',
  RECURRING: 'Recurring share',
  OVERRIDE: 'Manager override',
  SLAB_BONUS: 'Target bonus',
  ADJUSTMENT: 'Adjustment',
};

export const FLAG_TEXT: Record<VisitFlag, string> = {
  NO_GPS: 'No location',
  LOW_ACCURACY: 'Weak location (over 200 m)',
  FAR_FROM_LEAD: 'Over 500 m from the shop’s first visit',
  FAST_TRAVEL: 'Too fast from the last visit (over 120 km/h)',
  OUT_OF_HOURS: 'Outside 8 AM–10 PM',
  TOO_MANY: 'Over 40 visits that day',
};

export const PAYOUT_METHOD_LABEL: Record<string, string> = { JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa', BANK: 'Bank transfer' };
export const methodLabel = (m: string | null | undefined) => (m ? PAYOUT_METHOD_LABEL[m] ?? m : 'Not set');

export const SOURCE_LABEL: Record<string, string> = { code: 'Partner code at signup', lead: 'Matched a partner lead', admin: 'Set by an admin' };

export const mapsLink = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;

/** "2026-11" → "November 2026". */
export const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

/** The Pakistan month key for today ("2026-11"). */
export const currentMonth = () => {
  const pk = new Date(Date.now() + 5 * 3_600_000);
  return `${pk.getUTCFullYear()}-${String(pk.getUTCMonth() + 1).padStart(2, '0')}`;
};
