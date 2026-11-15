/**
 * Merchant journey rules, kept free of the database so they are easy to read
 * and test: milestones, the step a shop is stuck at, its health, the apps it
 * uses and where it came from. AdminJourneyService gathers the facts.
 */

export type Platform = 'web' | 'android' | 'ios' | 'desktop';
export type Health = 'active' | 'at_risk' | 'stuck' | 'churned';
export type StuckStep = 'onboarding' | 'first_product' | 'first_sale' | 'paid';
export type Uses = 'web' | 'mobile' | 'both' | 'none';

export const HEALTH_LABEL: Record<Health, string> = {
  active: 'Active',
  at_risk: 'At risk',
  stuck: 'Stuck',
  churned: 'Churned',
};

export const STUCK_LABEL: Record<StuckStep, string> = {
  onboarding: 'Setup (onboarding)',
  first_product: 'Adding first product',
  first_sale: 'Making first bill',
  paid: 'Buying a plan',
};

/** The web app's five onboarding steps and the saved API step that marks each done. */
export const ONBOARDING_STEPS: Array<{ id: string; label: string; apiStep: number; required: boolean }> = [
  { id: 'business', label: 'Business info', apiStep: 1, required: true },
  { id: 'branch', label: 'First branch', apiStep: 3, required: false },
  { id: 'products', label: 'First products', apiStep: 6, required: false },
  { id: 'receipt', label: 'Bill and payment', apiStep: 4, required: false },
  { id: 'staff', label: 'Invite staff', apiStep: 7, required: false },
];

export interface JourneyRow {
  signupPlatform: string | null;
  signupAppVersion: string | null;
  signupMethod: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  ftSource: string | null;
  ftMedium: string | null;
  ftCampaign: string | null;
  ftTerm: string | null;
  ftContent: string | null;
  cta: string | null;
  referrerDomain: string | null;
  referralCode: string | null;
  landingPage: string | null;
  inferred: boolean;
  signupRecordedAt: Date | null;
  lastSeenWebAt: Date | null;
  lastSeenDesktopAt: Date | null;
  lastSeenAndroidAt: Date | null;
  lastSeenIosAt: Date | null;
  firstSeenAndroidAt: Date | null;
  firstSeenIosAt: Date | null;
}

/** Everything known about one shop that the rules need. */
export interface TenantFacts {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  status: string;
  createdAt: Date;
  lastActiveAt: Date | null;
  partnerId: string | null;
  referredById: string | null;
  onboarding: { isCompleted: boolean; isSkipped: boolean; completedSteps: number[]; currentStep: number; completedAt: Date | null } | null;
  firstProductAt: Date | null;
  lastProductAt: Date | null;
  firstSaleAt: Date | null;
  lastSaleAt: Date | null;
  firstCustomerAt: Date | null;
  firstKhataAt: Date | null;
  lastKhataAt: Date | null;
  firstPurchaseAt: Date | null;
  lastPurchaseAt: Date | null;
  staffAddedAt: Date | null;
  storeLiveAt: Date | null;
  channelAt: Date | null;
  /** First time the mobile app was seen (device registration or presence). */
  mobileAt: Date | null;
  mobileLastSeen: { android: Date | null; ios: Date | null };
  paidAt: Date | null;
  trialEndsAt: Date | null;
  journey: JourneyRow | null;
}

const DAY = 86_400_000;
const minDate = (...d: Array<Date | null | undefined>) => d.filter((x): x is Date => !!x).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
const maxDate = (...d: Array<Date | null | undefined>) => d.filter((x): x is Date => !!x).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
const days = (ms: number) => Math.floor(ms / DAY);

/** Setup counts as done when finished or skipped, the required business step is saved, or the shop already works (shops older than onboarding). */
export function onboardingDone(f: TenantFacts): boolean {
  const o = f.onboarding;
  if (o && (o.isCompleted || o.isSkipped || o.completedSteps.includes(1))) return true;
  return !!(f.firstProductAt || f.firstSaleAt);
}

export function onboardingDoneAt(f: TenantFacts): Date | null {
  if (!onboardingDone(f)) return null;
  return f.onboarding?.completedAt ?? minDate(f.firstProductAt, f.firstSaleAt) ?? null;
}

/** Last seen per app: the journey row, filled in by device registrations for older app builds. */
export function platformsSeen(f: TenantFacts): Record<Platform, Date | null> {
  const j = f.journey;
  return {
    web: j?.lastSeenWebAt ?? null,
    desktop: j?.lastSeenDesktopAt ?? null,
    android: maxDate(j?.lastSeenAndroidAt, f.mobileLastSeen.android),
    ios: maxDate(j?.lastSeenIosAt, f.mobileLastSeen.ios),
  };
}

/** Apps used in the last 30 days. */
export function usesOf(f: TenantFacts, now: Date): Uses {
  const since = now.getTime() - 30 * DAY;
  const seen = platformsSeen(f);
  const recent = (d: Date | null) => !!d && d.getTime() >= since;
  const web = recent(seen.web) || recent(seen.desktop);
  const mobile = recent(seen.android) || recent(seen.ios);
  return web && mobile ? 'both' : web ? 'web' : mobile ? 'mobile' : 'none';
}

export function lastSeenOf(f: TenantFacts): Date | null {
  const seen = platformsSeen(f);
  return maxDate(f.lastActiveAt, f.lastSaleAt, seen.web, seen.desktop, seen.android, seen.ios);
}

export function stuckAt(f: TenantFacts): StuckStep | null {
  if (!onboardingDone(f)) return 'onboarding';
  if (!f.firstProductAt) return 'first_product';
  if (!f.firstSaleAt) return 'first_sale';
  if (!f.paidAt) return 'paid';
  return null;
}

/** The first of the web app's onboarding steps not saved yet (for the Journey tab). */
export function onboardingNextStep(f: TenantFacts): string | null {
  const o = f.onboarding;
  if (!o || o.isCompleted || o.isSkipped) return null;
  return ONBOARDING_STEPS.find((s) => !o.completedSteps.includes(s.apiStep))?.label ?? null;
}

/**
 * Health in four states, checked in this order:
 *   churned  nobody seen (and no bill) for 30+ days
 *   stuck    no bill yet, 2+ days after signing up
 *   at_risk  not seen for 7+ days, no bill in 7 days after selling before,
 *            or an unpaid trial ending within 3 days
 *   active   everything else
 */
export function healthOf(f: TenantFacts, now: Date): { state: Health; reason: string } {
  const lastSeen = lastSeenOf(f);
  const idle = days(now.getTime() - (lastSeen ?? f.createdAt).getTime());
  const age = days(now.getTime() - f.createdAt.getTime());
  if (idle >= 30) return { state: 'churned', reason: lastSeen ? `Not seen for ${idle} days` : `Never used Nafaa in ${idle} days` };
  if (!f.firstSaleAt && age >= 2) {
    const step = stuckAt(f);
    return { state: 'stuck', reason: `No bill ${age} days after signing up${step ? ` · stuck at ${STUCK_LABEL[step].toLowerCase()}` : ''}` };
  }
  if (idle >= 7) return { state: 'at_risk', reason: `Not seen for ${idle} days` };
  if (f.firstSaleAt && f.lastSaleAt && now.getTime() - f.lastSaleAt.getTime() >= 7 * DAY) return { state: 'at_risk', reason: `No bill for ${days(now.getTime() - f.lastSaleAt.getTime())} days` };
  if (!f.paidAt && f.trialEndsAt) {
    const left = Math.ceil((f.trialEndsAt.getTime() - now.getTime()) / DAY);
    if (left <= 3) return { state: 'at_risk', reason: left < 0 ? 'Trial ended, not paid' : left === 0 ? 'Trial ends today' : `Trial ends in ${left} day${left === 1 ? '' : 's'}` };
  }
  return { state: 'active', reason: f.firstSaleAt ? 'Using Nafaa' : 'New shop' };
}

/** Where the shop came from, as one short label for grouping. */
export function sourceOf(f: TenantFacts): string {
  const j = f.journey;
  const pick = (v: string | null | undefined) => (v ? v.trim().toLowerCase() : null);
  return pick(j?.ftSource)
    ?? pick(j?.utmSource)
    ?? (f.partnerId ? 'partner' : null)
    ?? (j?.referralCode || f.referredById ? 'referral' : null)
    ?? pick(j?.referrerDomain)
    ?? (j?.signupRecordedAt ? 'direct' : 'unknown');
}

export function signupPlatformOf(f: TenantFacts): Platform | 'unknown' {
  const p = f.journey?.signupPlatform;
  return p === 'web' || p === 'android' || p === 'ios' || p === 'desktop' ? p : 'unknown';
}

export function lastImportantAction(f: TenantFacts): { label: string; at: Date } | null {
  const candidates: Array<{ label: string; at: Date | null }> = [
    { label: 'Made a bill', at: f.lastSaleAt },
    { label: 'Added a product', at: f.lastProductAt },
    { label: 'Recorded a purchase', at: f.lastPurchaseAt },
    { label: 'Khata entry', at: f.lastKhataAt },
    { label: 'Finished setup', at: f.onboarding?.completedAt ?? null },
  ];
  const best = candidates.filter((c): c is { label: string; at: Date } => !!c.at).sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  return best ?? null;
}

export interface Milestone {
  key: string;
  label: string;
  done: boolean;
  at: Date | null;
  /** Part of the main funnel (the others are extras). */
  core: boolean;
}

export function milestonesOf(f: TenantFacts): Milestone[] {
  const firstCustomer = minDate(f.firstCustomerAt, f.firstKhataAt);
  const m = (key: string, label: string, at: Date | null, core = false, done = !!at): Milestone => ({ key, label, done, at, core });
  return [
    m('signup', 'Signed up', f.createdAt, true),
    m('onboarding', 'Setup done', onboardingDoneAt(f), true, onboardingDone(f)),
    m('first_product', 'First product', f.firstProductAt, true),
    m('first_sale', 'First bill', f.firstSaleAt, true),
    m('first_customer', 'First customer or khata entry', firstCustomer),
    m('first_purchase', 'First purchase / stock in', f.firstPurchaseAt),
    m('staff', 'Staff added', f.staffAddedAt),
    m('mobile_app', 'Mobile app used', f.mobileAt),
    m('store_live', 'Online store live', f.storeLiveAt),
    m('channel', 'Sales channel connected', f.channelAt),
    m('paid', 'Plan purchased', f.paidAt, true),
  ];
}

/** Summary used by lists and filters. */
export interface JourneySummary {
  signupPlatform: Platform | 'unknown';
  source: string;
  stuckAt: StuckStep | null;
  health: Health;
  healthReason: string;
  uses: Uses;
  lastSeenAt: Date | null;
  lastAction: { label: string; at: Date } | null;
}

export function summarize(f: TenantFacts, now: Date): JourneySummary {
  const h = healthOf(f, now);
  return {
    signupPlatform: signupPlatformOf(f),
    source: sourceOf(f),
    stuckAt: stuckAt(f),
    health: h.state,
    healthReason: h.reason,
    uses: usesOf(f, now),
    lastSeenAt: lastSeenOf(f),
    lastAction: lastImportantAction(f),
  };
}

/**
 * Funnel steps in order. Each step counts the shops that reached it, so a
 * paid shop that was quiet this week still counts as paid.
 */
export const FUNNEL_STEPS = [
  { key: 'signup', label: 'Signed up' },
  { key: 'onboarding', label: 'Setup done' },
  { key: 'first_product', label: 'First product' },
  { key: 'first_sale', label: 'First bill' },
  { key: 'active7', label: 'Active in last 7 days' },
  { key: 'paid', label: 'Paid' },
] as const;

/** Which funnel steps a shop reached, in FUNNEL_STEPS order. */
export function funnelReached(f: TenantFacts, now: Date): boolean[] {
  const seen = lastSeenOf(f);
  const active7 = !!seen && now.getTime() - seen.getTime() < 7 * DAY;
  return [true, onboardingDone(f), !!f.firstProductAt, !!f.firstSaleAt, active7, !!f.paidAt];
}
