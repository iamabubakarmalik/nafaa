/**
 * Pure helpers for Meta ads management: reading campaigns and insights from
 * the Marketing API, money in Meta's minor units, and the request bodies the
 * "Boost product" wizard sends. No I/O here, so every mapping is unit tested.
 */

/* ───────────────────────── money ───────────────────────── */

/** Currencies Meta stores without minor units (budget "500" means 500). */
const NO_MINOR = new Set(['CLP', 'COP', 'CRC', 'HUF', 'ISK', 'IDR', 'JPY', 'KRW', 'PYG', 'TWD', 'VND']);

export const minorFactor = (currency: string) => (NO_MINOR.has(String(currency).toUpperCase()) ? 1 : 100);

/** "50000" (PKR) → 500. */
export function fromMinor(raw: unknown, currency: string): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / minorFactor(currency)) * 100) / 100;
}

/** 500 (PKR) → "50000". Meta wants whole minor units as a string. */
export function toMinor(amount: number, currency: string): string {
  return String(Math.round(amount * minorFactor(currency)));
}

/** Smallest daily budget Nafaa will set, per account currency (Meta's own floor is checked by Meta). */
export function minDailyBudget(currency: string): number {
  const c = String(currency).toUpperCase();
  if (c === 'PKR') return 250;
  if (c === 'INR') return 100;
  return 1;
}

/** Budget after a % change, rounded to a whole unit and never below the floor. */
export function changedBudget(current: number, pct: number, currency: string): number {
  const next = Math.round(current * (1 + pct / 100));
  return Math.max(minDailyBudget(currency), next);
}

/* ───────────────────────── objects ───────────────────────── */

export type MetaStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';

export interface MetaCampaign {
  id: string;
  name: string;
  status: MetaStatus;
  /** Meta's view including parents and review (e.g. IN_PROCESS, WITH_ISSUES). */
  effectiveStatus: string;
  objective: string | null;
  /** Daily budget in account currency (major units) when the campaign holds the budget. */
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  /** CAMPAIGN = campaign budget; ADSET = each ad set has its own. */
  budgetLevel: 'CAMPAIGN' | 'ADSET';
  createdAt: string | null;
}

export interface MetaAdSet {
  id: string;
  campaignId: string;
  name: string;
  status: MetaStatus;
  effectiveStatus: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  optimizationGoal: string | null;
}

export interface MetaAd {
  id: string;
  adSetId: string;
  campaignId: string;
  name: string;
  status: MetaStatus;
  effectiveStatus: string;
  thumbnail: string | null;
}

const statusOf = (v: unknown): MetaStatus => (['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'].includes(String(v)) ? (v as MetaStatus) : 'PAUSED');
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export const CAMPAIGN_FIELDS = 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time';
export const ADSET_FIELDS = 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal';
export const AD_FIELDS = 'id,name,adset_id,campaign_id,status,effective_status,creative{thumbnail_url}';

export function mapCampaign(raw: any, currency: string): MetaCampaign {
  const daily = fromMinor(raw?.daily_budget, currency);
  const lifetime = fromMinor(raw?.lifetime_budget, currency);
  return {
    id: s(raw?.id), name: s(raw?.name) || s(raw?.id), status: statusOf(raw?.status), effectiveStatus: s(raw?.effective_status) || s(raw?.status),
    objective: raw?.objective ? String(raw.objective) : null, dailyBudget: daily, lifetimeBudget: lifetime,
    budgetLevel: daily !== null || lifetime !== null ? 'CAMPAIGN' : 'ADSET', createdAt: raw?.created_time ? String(raw.created_time) : null,
  };
}

export function mapAdSet(raw: any, currency: string): MetaAdSet {
  return {
    id: s(raw?.id), campaignId: s(raw?.campaign_id), name: s(raw?.name) || s(raw?.id), status: statusOf(raw?.status), effectiveStatus: s(raw?.effective_status) || s(raw?.status),
    dailyBudget: fromMinor(raw?.daily_budget, currency), lifetimeBudget: fromMinor(raw?.lifetime_budget, currency),
    optimizationGoal: raw?.optimization_goal ? String(raw.optimization_goal) : null,
  };
}

export function mapAd(raw: any): MetaAd {
  return {
    id: s(raw?.id), adSetId: s(raw?.adset_id), campaignId: s(raw?.campaign_id), name: s(raw?.name) || s(raw?.id),
    status: statusOf(raw?.status), effectiveStatus: s(raw?.effective_status) || s(raw?.status),
    thumbnail: raw?.creative?.thumbnail_url ? String(raw.creative.thumbnail_url) : null,
  };
}

/* ───────────────────────── insights ───────────────────────── */

export const INSIGHT_FIELDS = 'campaign_id,campaign_name,adset_id,adset_name,spend,impressions,clicks,actions,action_values,account_currency';

/**
 * Purchase action types in order of preference. Meta reports the same
 * purchase under several types, so only the first one present is used.
 */
export const PURCHASE_TYPES = ['omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_web_purchase', 'onsite_conversion.purchase'];
export const CONVERSATION_TYPES = ['onsite_conversion.messaging_conversation_started_7d'];

/** Value of the first action type present (Meta lists overlapping types). */
export function actionValue(list: unknown, types: string[]): number {
  if (!Array.isArray(list)) return 0;
  for (const type of types) {
    const hit = list.find((a: any) => a?.action_type === type);
    if (hit) {
      const n = Number(hit.value);
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

export interface MappedInsight {
  day: string;
  campaignId: string;
  campaign: string;
  adSetId: string | null;
  adSet: string | null;
  /** In the ad account's currency. */
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
  conversations: number;
  /** Spend per purchase as Meta counts it; null without purchases. */
  cpa: number | null;
  /** Purchase value ÷ spend as Meta counts it. */
  metaRoas: number | null;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** One row of `/insights?time_increment=1`; null when it has no day or campaign. */
export function mapInsightRow(raw: any): MappedInsight | null {
  const day = s(raw?.date_start).slice(0, 10);
  const campaignId = s(raw?.campaign_id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !campaignId) return null;
  const spend = r2(num(raw?.spend));
  const purchases = Math.round(actionValue(raw?.actions, PURCHASE_TYPES));
  const purchaseValue = r2(actionValue(raw?.action_values, PURCHASE_TYPES));
  return {
    day, campaignId, campaign: s(raw?.campaign_name) || campaignId,
    adSetId: raw?.adset_id ? String(raw.adset_id) : null, adSet: raw?.adset_name ? String(raw.adset_name) : null,
    spend, impressions: Math.round(num(raw?.impressions)), clicks: Math.round(num(raw?.clicks)),
    purchases, purchaseValue, conversations: Math.round(actionValue(raw?.actions, CONVERSATION_TYPES)),
    cpa: purchases > 0 ? r2(spend / purchases) : null,
    metaRoas: spend > 0 && purchaseValue > 0 ? r2(purchaseValue / spend) : null,
  };
}

/** A row for the AdSpend table (amount in the shop's currency). */
export interface SpendRow {
  day: string;
  campaign: string;
  adSet: string | null;
  amount: number;
  orders: number | null;
  importKey: string;
  note: string | null;
}

/** Import key of a row pulled from Meta: one per ad set (or campaign) and day. */
export const apiImportKey = (row: Pick<MappedInsight, 'day' | 'campaignId' | 'adSetId'>) => `META:API:${row.adSetId ?? row.campaignId}:${row.day}`;

/**
 * Insights → AdSpend rows. Spend in another currency is converted with the
 * shop's rate (1 USD = `rate` Rs) and the original amount is kept in the note.
 * Rows with no spend are dropped.
 */
export function insightsToSpend(rows: MappedInsight[], currency: string, shopCurrency: string, rate: number | null): SpendRow[] {
  const same = currency.toUpperCase() === shopCurrency.toUpperCase();
  if (!same && !(rate && rate > 0)) throw new Error('RATE_NEEDED');
  return rows.filter((r) => r.spend > 0).map((r) => ({
    day: r.day,
    campaign: r.campaign.slice(0, 120),
    adSet: r.adSet ? r.adSet.slice(0, 120) : null,
    amount: same ? r.spend : r2(r.spend * (rate as number)),
    orders: r.purchases || null,
    importKey: apiImportKey(r),
    note: same ? null : `${currency.toUpperCase()} ${r.spend} × ${rate}`,
  }));
}

/** Days to ask Meta for on a pull: the last `back` days up to today (late conversions keep changing). */
export function pullWindow(today: string, back = 3): { since: string; until: string } {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - Math.max(0, back - 1));
  return { since: d.toISOString().slice(0, 10), until: today };
}

/* ───────────────────────── Boost product ───────────────────────── */

export type Gender = 'ALL' | 'MALE' | 'FEMALE';
export type Destination = 'WEBSITE' | 'WHATSAPP';

export interface Audience {
  /** City targeting keys from Meta's location search; empty = all of Pakistan. */
  cities: Array<{ key: string; name: string }>;
  ageMin: number;
  ageMax: number;
  gender: Gender;
}

/** Cities offered in the wizard; their Meta keys are looked up when the ad is made. */
export const PK_CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Hyderabad', 'Gujranwala', 'Sialkot', 'Quetta'];

export function cleanAudience(raw: any): Audience {
  const ageMin = Math.min(65, Math.max(18, Math.round(Number(raw?.ageMin) || 18)));
  const ageMax = Math.min(65, Math.max(ageMin, Math.round(Number(raw?.ageMax) || 65)));
  const gender: Gender = ['MALE', 'FEMALE'].includes(raw?.gender) ? raw.gender : 'ALL';
  const cities = (Array.isArray(raw?.cities) ? raw.cities : [])
    .filter((c: any) => c && /^\d+$/.test(String(c.key)))
    .slice(0, 25)
    .map((c: any) => ({ key: String(c.key), name: String(c.name ?? '').slice(0, 60) }));
  return { cities, ageMin, ageMax, gender };
}

export function targetingOf(a: Audience) {
  return {
    geo_locations: a.cities.length
      ? { cities: a.cities.map((c) => ({ key: c.key, radius: 25, distance_unit: 'kilometer' })), location_types: ['home', 'recent'] }
      : { countries: ['PK'], location_types: ['home', 'recent'] },
    age_min: a.ageMin,
    age_max: a.ageMax,
    ...(a.gender !== 'ALL' && { genders: [a.gender === 'MALE' ? 1 : 2] }),
    // The shop's own choices are kept; Meta would otherwise widen the audience.
    targeting_automation: { advantage_audience: 0 },
  };
}

export interface BoostPlan {
  name: string;
  destination: Destination;
  /** Product page with UTM tags (website destination). */
  link: string | null;
  pageId: string;
  instagramUserId: string | null;
  /** The shop's Meta pixel; with it a website ad optimises for purchases. */
  pixelId: string | null;
  dailyBudget: number;
  days: number;
  currency: string;
  audience: Audience;
  copy: { headline: string; primaryText: string; description: string | null };
  imageHash: string;
  start: Date;
}

export function objectiveOf(p: Pick<BoostPlan, 'destination' | 'pixelId'>): 'OUTCOME_SALES' | 'OUTCOME_TRAFFIC' {
  if (p.destination === 'WHATSAPP') return 'OUTCOME_SALES';
  return p.pixelId ? 'OUTCOME_SALES' : 'OUTCOME_TRAFFIC';
}

/** Campaign with the budget on the campaign; created PAUSED. */
export function campaignBody(p: BoostPlan) {
  return {
    name: p.name.slice(0, 200),
    objective: objectiveOf(p),
    status: 'PAUSED',
    special_ad_categories: [],
    buying_type: 'AUCTION',
    daily_budget: toMinor(p.dailyBudget, p.currency),
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  };
}

export function adSetBody(p: BoostPlan, campaignId: string) {
  const end = new Date(p.start.getTime() + Math.max(1, p.days) * 86_400_000);
  const base = {
    name: `${p.name} · ${p.audience.cities.length ? p.audience.cities.map((c) => c.name).join(', ').slice(0, 80) : 'Pakistan'}`.slice(0, 200),
    campaign_id: campaignId,
    status: 'PAUSED',
    billing_event: 'IMPRESSIONS',
    targeting: targetingOf(p.audience),
    start_time: p.start.toISOString(),
    end_time: end.toISOString(),
  };
  if (p.destination === 'WHATSAPP') {
    return { ...base, destination_type: 'WHATSAPP', optimization_goal: 'CONVERSATIONS', promoted_object: { page_id: p.pageId } };
  }
  if (p.pixelId) {
    return { ...base, destination_type: 'WEBSITE', optimization_goal: 'OFFSITE_CONVERSIONS', promoted_object: { pixel_id: p.pixelId, custom_event_type: 'PURCHASE' } };
  }
  return { ...base, destination_type: 'WEBSITE', optimization_goal: 'LINK_CLICKS' };
}

export function creativeBody(p: BoostPlan) {
  const whatsapp = p.destination === 'WHATSAPP';
  const link = whatsapp ? 'https://api.whatsapp.com/send' : (p.link as string);
  return {
    name: `${p.name} · creative`.slice(0, 200),
    object_story_spec: {
      page_id: p.pageId,
      ...(p.instagramUserId && { instagram_user_id: p.instagramUserId }),
      link_data: {
        link,
        message: p.copy.primaryText.slice(0, 2000),
        name: p.copy.headline.slice(0, 255),
        ...(p.copy.description && { description: p.copy.description.slice(0, 255) }),
        image_hash: p.imageHash,
        call_to_action: whatsapp
          ? { type: 'WHATSAPP_MESSAGE', value: { app_destination: 'WHATSAPP' } }
          : { type: 'SHOP_NOW', value: { link } },
      },
    },
  };
}

export function adBody(p: BoostPlan, adSetId: string, creativeId: string) {
  return { name: `${p.name} · ad`.slice(0, 200), adset_id: adSetId, creative: { creative_id: creativeId }, status: 'PAUSED' };
}

/** Checks a wizard request before anything is sent to Meta; returns the reason key or null. */
export function boostProblem(p: Omit<BoostPlan, 'imageHash' | 'start' | 'pageId' | 'instagramUserId' | 'pixelId' | 'currency'> & { currency?: string }): string | null {
  if (!p.name.trim()) return 'NAME';
  if (p.destination === 'WEBSITE' && !(p.link && /^https:\/\//i.test(p.link))) return 'LINK';
  if (!(p.days >= 1 && p.days <= 90)) return 'DAYS';
  if (!(p.dailyBudget >= minDailyBudget(p.currency ?? 'PKR'))) return 'BUDGET';
  if (!p.copy.headline.trim() || !p.copy.primaryText.trim()) return 'COPY';
  return null;
}
