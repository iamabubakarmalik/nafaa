/**
 * Meta ads API (Marketing hub): connection status, campaigns with ad sets
 * and ads, the insights pull, pause / resume / budget / duplicate, the
 * Boost product wizard, ad rules and the change log with undo. All under
 * /ads/meta.
 */

import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type MetaStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
export type AccessReason = 'paused' | 'not_configured' | 'soon' | null;

export interface MetaAdsStatus {
  access: { live: boolean; reason: AccessReason; beta: boolean };
  connected: boolean;
  connectionStatus: string | null;
  lastError: string | null;
  adAccount: { id: string; name: string; currency: string } | null;
  pageId: string | null;
  hasInstagram: boolean;
  shopCurrency: string;
  needsRate: boolean;
  settings: { autoPull: boolean; fxRate: number | null; maxChangePct: number; maxActionsPerDay: number; lastPullAt: string | null; lastPullError: string | null; lastRulesRunAt: string | null };
}

export interface MetaAdRow { id: string; adSetId: string; campaignId: string; name: string; status: MetaStatus; effectiveStatus: string; thumbnail: string | null }
export interface MetaAdSetRow { id: string; campaignId: string; name: string; status: MetaStatus; effectiveStatus: string; dailyBudget: number | null; lifetimeBudget: number | null; optimizationGoal: string | null; ads: MetaAdRow[] }
export interface MetaCampaignRow {
  id: string; name: string; status: MetaStatus; effectiveStatus: string; objective: string | null;
  dailyBudget: number | null; lifetimeBudget: number | null; budgetLevel: 'CAMPAIGN' | 'ADSET'; createdAt: string | null;
  spend: number; impressions: number; clicks: number; purchases: number; conversations: number; cpa: number | null; metaRoas: number | null; ctr: number | null;
  adSets: MetaAdSetRow[];
}
export interface MetaOverview {
  range: { from: string; to: string };
  account: { id: string; name: string; currency: string };
  totals: { spend: number; impressions: number; clicks: number; purchases: number; active: number };
  campaigns: MetaCampaignRow[];
}

export type RuleKind = 'ROAS_PAUSE' | 'CPA_LOWER' | 'ROAS_RAISE' | 'SPEND_CAP';
export interface AdRule {
  id: string; name: string; kind: RuleKind; threshold: number; days: number; pct: number; minSpend: number;
  campaignIds: string[]; mode: 'SUGGEST' | 'AUTO'; enabled: boolean;
}
export type AdRuleInput = Omit<AdRule, 'id'>;

export interface RuleReason { kind: RuleKind; value: number | null; threshold: number; days: number; spend: number; delivered: number; held?: 'CAP_PCT' | 'CAP_COUNT' }
export type ActionKind = 'PAUSE' | 'RESUME' | 'BUDGET' | 'DUPLICATE' | 'CREATE';
export type ActionStatus = 'SUGGESTED' | 'APPLIED' | 'FAILED' | 'UNDONE' | 'DISMISSED' | 'HELD';
export interface AdAction {
  id: string; ruleId: string | null; ruleName: string | null; objectType: 'CAMPAIGN' | 'ADSET' | 'AD'; objectId: string; objectName: string | null;
  action: ActionKind; before: { status?: string; dailyBudget?: number | null } | null; after: { status?: string; dailyBudget?: number | null; createdIds?: string[] } | null;
  changePct: number | null; source: 'RULE' | 'MANUAL' | 'BOOST'; status: ActionStatus; reason: RuleReason | null; error: string | null;
  day: string; createdAt: string; appliedAt: string | null; appliedById: string | null; undoneAt: string | null; canUndo: boolean;
}

export interface DryRunAction {
  ruleId: string; ruleName: string; mode: 'SUGGEST' | 'AUTO'; campaignId: string; campaignName: string; action: ActionKind;
  before: { status?: string; dailyBudget?: number | null }; after: { status?: string; dailyBudget?: number | null }; changePct: number; reason: RuleReason;
}

export interface BoostOptions {
  account: { id: string; name: string; currency: string };
  page: { id: string; name: string; instagram: string | null } | null;
  pixel: boolean;
  cities: string[];
  minDailyBudget: number;
}
export interface BoostPayload {
  productId: string; name: string; destination: 'WEBSITE' | 'WHATSAPP'; link: string | null; imageUrl?: string;
  dailyBudget: number; days: number; audience: { ageMin: number; ageMax: number; gender: 'ALL' | 'MALE' | 'FEMALE' }; cityNames: string[];
  copy: { headline: string; primaryText: string; description?: string | null };
}

export const META_ADS_KEY = 'meta-ads';

export const metaAdsApi = {
  status: () => apiClient.get('/ads/meta/status').then((r) => unwrap<MetaAdsStatus>(r)),
  saveSettings: (b: Partial<{ autoPull: boolean; fxRate: number | null; maxChangePct: number; maxActionsPerDay: number }>) => apiClient.put('/ads/meta/settings', b).then((r) => unwrap<MetaAdsStatus['settings']>(r)),
  overview: (from: string, to: string, fresh = false) => apiClient.get('/ads/meta/overview', { params: { from, to, ...(fresh && { fresh: '1' }) } }).then((r) => unwrap<MetaOverview>(r)),
  pull: (days = 7) => apiClient.post('/ads/meta/pull', { days }, { timeout: 120_000 }).then((r) => unwrap<{ added: number; changed: number; removed: number; days: number }>(r)),
  setStatus: (id: string, status: 'ACTIVE' | 'PAUSED') => apiClient.patch(`/ads/meta/objects/${id}/status`, { status }).then((r) => unwrap<{ ok: boolean; actionId?: string }>(r)),
  setBudget: (id: string, dailyBudget: number) => apiClient.patch(`/ads/meta/objects/${id}/budget`, { dailyBudget }).then((r) => unwrap<{ ok: boolean; dailyBudget: number; actionId: string }>(r)),
  duplicate: (id: string) => apiClient.post(`/ads/meta/objects/${id}/duplicate`, {}).then((r) => unwrap<{ ok: boolean; id: string | null; actionId: string }>(r)),
  boostOptions: () => apiClient.get('/ads/meta/boost/options').then((r) => unwrap<BoostOptions>(r)),
  boost: (b: BoostPayload) => apiClient.post('/ads/meta/boost', b, { timeout: 120_000 }).then((r) => unwrap<{ ok: boolean; campaignId: string; actionId: string; manageUrl: string }>(r)),
  launch: (actionId: string) => apiClient.post(`/ads/meta/boost/${actionId}/launch`, {}).then((r) => unwrap<{ ok: boolean }>(r)),
  rules: () => apiClient.get('/ads/meta/rules').then((r) => unwrap<{ rules: AdRule[]; caps: { maxChangePct: number; maxActionsPerDay: number } }>(r)),
  createRule: (b: AdRuleInput) => apiClient.post('/ads/meta/rules', b).then((r) => unwrap<AdRule>(r)),
  updateRule: (id: string, b: Partial<AdRuleInput>) => apiClient.patch(`/ads/meta/rules/${id}`, b).then((r) => unwrap<AdRule>(r)),
  removeRule: (id: string) => apiClient.delete(`/ads/meta/rules/${id}`).then((r) => unwrap<{ deleted: boolean }>(r)),
  dryRun: (rule?: AdRuleInput) => apiClient.post('/ads/meta/rules/dry-run', rule ? { rule } : {}, { timeout: 120_000 }).then((r) => unwrap<{ actions: DryRunAction[]; autoAllowed: string[]; autoHeld: Array<{ campaignId: string; held: string }> }>(r)),
  runRules: () => apiClient.post('/ads/meta/rules/run', {}, { timeout: 120_000 }).then((r) => unwrap<{ suggested: number; applied: number; held: number }>(r)),
  actions: (status?: ActionStatus) => apiClient.get('/ads/meta/actions', { params: { status } }).then((r) => unwrap<{ items: AdAction[]; counts: Partial<Record<ActionStatus, number>> }>(r)),
  apply: (id: string) => apiClient.post(`/ads/meta/actions/${id}/apply`, {}).then((r) => unwrap<AdAction>(r)),
  dismiss: (id: string) => apiClient.post(`/ads/meta/actions/${id}/dismiss`, {}).then((r) => unwrap<{ ok: boolean }>(r)),
  undo: (id: string) => apiClient.post(`/ads/meta/actions/${id}/undo`, {}).then((r) => unwrap<AdAction>(r)),
};
