/**
 * Plain names for API codes (stages, earning kinds, statuses, partner types),
 * with the badge colour each one uses.
 */

import type { BadgeVariant } from '@/design-system/components';
import type { EarningKind, EarningStatus, LeadStage, PartnerType, PayoutMethod, PayoutStatus } from '@/api/types';

export const STAGES: LeadStage[] = ['VISITED', 'DEMO', 'SIGNED_UP', 'ACTIVATED', 'PAID', 'LOST'];
/** The forward path of a lead (Lost is off to the side). */
export const STAGE_PATH: LeadStage[] = ['VISITED', 'DEMO', 'SIGNED_UP', 'ACTIVATED', 'PAID'];

export const STAGE: Record<LeadStage, { label: string; badge: BadgeVariant; color: string }> = {
  VISITED: { label: 'Visited', badge: 'default', color: '#64748b' },
  DEMO: { label: 'Demo', badge: 'info', color: '#2563eb' },
  SIGNED_UP: { label: 'Signed up', badge: 'brand', color: '#059669' },
  ACTIVATED: { label: 'Activated', badge: 'accent', color: '#d97706' },
  PAID: { label: 'Paid', badge: 'success', color: '#16a34a' },
  LOST: { label: 'Lost', badge: 'danger', color: '#e11d48' },
};

export const INTEREST: Record<string, { label: string; badge: BadgeVariant }> = {
  HOT: { label: 'Hot', badge: 'danger' },
  WARM: { label: 'Warm', badge: 'warning' },
  COLD: { label: 'Cold', badge: 'info' },
};

export const EARNING_KIND: Record<EarningKind, string> = {
  SIGNUP_BONUS: 'Signup bonus',
  ACTIVATION_BONUS: 'Activation bonus',
  RECURRING: 'Mahana Commission',
  OVERRIDE: 'Team ka hissa',
  SLAB_BONUS: 'Target bonus',
  ADJUSTMENT: 'Nafaa ki taraf se tabdeeli',
};

export const EARNING_STATUS: Record<EarningStatus, { label: string; badge: BadgeVariant }> = {
  PENDING: { label: 'Intezar me', badge: 'warning' },
  PAYABLE: { label: 'Mil sakta hai', badge: 'brand' },
  PAID: { label: 'Mil gaya', badge: 'success' },
  REVERSED: { label: 'Wapas hua', badge: 'danger' },
};

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; badge: BadgeVariant }> = {
  REQUESTED: { label: 'Bheji gayi', badge: 'warning' },
  APPROVED: { label: 'Manzoor', badge: 'info' },
  PAID: { label: 'Paid', badge: 'success' },
  REJECTED: { label: 'Radd', badge: 'danger' },
};

export const PAYOUT_METHOD: Record<PayoutMethod, string> = {
  JAZZCASH: 'JazzCash',
  EASYPAISA: 'Easypaisa',
  BANK: 'Bank account',
};

export const PARTNER_TYPE: Record<PartnerType, { label: string; help: string }> = {
  REFERRAL: { label: 'Referral partner', help: 'Apna link ya code dukaandaron ko dein. Wo Nafaa par aayein to aap ko Commission milta hai.' },
  FIELD_AGENT: { label: 'Field agent', help: 'Dukaanon par ja kar Nafaa dikhayein, har Visit app me likhein aur Signup karwayein.' },
  RESELLER: { label: 'City reseller', help: 'Apne shehar me Nafaa bechein aur wahan ki dukaanon ko sambhalein.' },
  TRAINER: { label: 'Trainer', help: 'Nayi dukaanon me Nafaa set karein aur staff ko chalana sikhayein.' },
  EMPLOYEE: { label: 'Nafaa employee', help: 'Nafaa ki field team.' },
};

/** Visit check codes from the server, in plain words. */
export const VISIT_FLAG: Record<string, string> = {
  NO_GPS: 'Location nahi thi',
  LOW_ACCURACY: 'Location kamzor thi',
  FAR_FROM_LEAD: 'Dukaan se door',
  FAST_TRAVEL: 'Bohat tez safar',
  OUT_OF_HOURS: 'Kaam ke waqt se bahar',
  TOO_MANY: 'Ek din me bohat visits',
};
