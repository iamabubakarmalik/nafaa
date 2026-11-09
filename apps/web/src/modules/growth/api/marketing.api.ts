/**
 * Marketing hub API: campaign attribution report, campaigns (utm and
 * discount codes), product links for the UTM builder, Meta Conversions API
 * settings and event log, and Nafaa AI ad copy. All under /ads.
 */

import { apiClient } from '@core/api/client';
import type { AdPlatform } from './growth.api';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type TrafficSource = 'META' | 'GOOGLE' | 'TIKTOK' | 'SNAPCHAT' | 'WHATSAPP' | 'EMAIL' | 'PHONE' | 'REFERRAL' | 'ORGANIC' | 'DIRECT' | 'OTHER' | 'MARKETPLACE' | 'UNKNOWN' | 'INFLUENCER';

export interface Numbers {
  spend: number; placed: number; delivered: number; returned: number; cancelled: number; open: number;
  placedSales: number; deliveredSales: number; deliveryRate: number | null;
  roas: number | null; costPerOrder: number | null; newCustomers: number; cac: number | null;
  profitBeforeAds: number | null; profitAfterAds: number | null;
}

export interface Fatigue { from: number; to: number; days: Array<{ day: string; cpo: number }> }

export interface CampaignRow extends Numbers {
  key: string; id: string | null; platform: AdPlatform; name: string | null; status: string;
  utmCampaign: string | null; discountCodes: string[]; byCode: number; byUtm: number;
  adSets: Array<{ name: string; spend: number }>; fatigue: Fatigue | null; spendDays: number;
}

export interface BudgetMove {
  kind: 'MOVE' | 'CUT';
  from: { key: string; name: string; roas: number | null };
  to: { key: string; name: string; roas: number | null } | null;
  dailyAmount: number;
}

export interface MarketingReport {
  range: { from: string; to: string };
  seesProfit: boolean;
  totals: Numbers & { attributedPct: number | null };
  campaigns: CampaignRow[];
  sources: Array<Numbers & { source: TrafficSource }>;
  daily: Array<{ day: string; spend: number; placed: number; delivered: number }>;
  suggestions: BudgetMove[];
  fatigued: Array<Fatigue & { key: string; name: string | null; platform: AdPlatform }>;
  unmatched: { utmCampaigns: Array<{ value: string; orders: number }>; codes: Array<{ code: string; orders: number }> };
}

export interface Campaign {
  id: string; platform: AdPlatform; name: string; utmCampaign: string | null; discountCodes: string[]; productIds: string[];
  dailyBudget: number | null; status: 'ACTIVE' | 'PAUSED' | 'ENDED'; note: string | null; createdAt: string; updatedAt: string;
}
export interface CampaignPayload {
  platform: AdPlatform; name: string; utmCampaign?: string | null; discountCodes?: string[]; dailyBudget?: number | null;
  status?: Campaign['status']; note?: string | null;
}

export interface ProductLinks {
  stores: Array<{ id: string; name: string; type: string; url: string | null }>;
  items: Array<{ id: string; name: string; price: number; image: string | null; links: Array<{ integrationId: string; channel: string; type: string; url: string }> }>;
}

export interface CapiOverview {
  enabled: boolean; pixelId: string | null; hasToken: boolean; tokenEnd: string | null; testCode: string | null;
  eventName: 'Purchase' | 'OrderDelivered'; sendCheckouts: boolean; since: string | null; paused: boolean; dryRun: boolean;
  last7: { sent: number; failed: number; pending: number; skipped: number };
}
export interface CapiEvent {
  id: string; eventName: string; status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED'; value: number | null; currency: string;
  attempts: number; lastError: string | null; sentAt: string | null; createdAt: string; nextAttemptAt: string | null; test: boolean;
  order: { id: string; number: string; customer: string } | null; checkoutId: string | null;
}

export interface CopySet { headline: string; primaryText: string; cta: string }
export interface AdCopy { roman: CopySet; urdu: CopySet; en: CopySet; source: 'ai' | 'template' }

export const MARKETING_KEY = 'marketing';

export const marketingApi = {
  report: (from: string, to: string) => apiClient.get('/ads/marketing/report', { params: { from, to } }).then((r) => unwrap<MarketingReport>(r)),
  campaigns: () => apiClient.get('/ads/marketing/campaigns').then((r) => unwrap<{ items: Campaign[]; fromSpend: Array<{ platform: AdPlatform; name: string; spend: number; lastDay: string | null }> }>(r)),
  createCampaign: (b: CampaignPayload) => apiClient.post('/ads/marketing/campaigns', b).then((r) => unwrap<Campaign>(r)),
  updateCampaign: (id: string, b: Partial<CampaignPayload>) => apiClient.patch(`/ads/marketing/campaigns/${id}`, b).then((r) => unwrap<Campaign>(r)),
  removeCampaign: (id: string) => apiClient.delete(`/ads/marketing/campaigns/${id}`).then((r) => unwrap<{ deleted: boolean }>(r)),
  productLinks: (search: string) => apiClient.get('/ads/marketing/product-links', { params: { search, limit: 20 } }).then((r) => unwrap<ProductLinks>(r)),
  copy: (b: { productId?: string; name?: string; price?: number | null; offer?: string; audience?: string; platform?: string }) =>
    apiClient.post('/ads/marketing/copy', b, { timeout: 120_000 }).then((r) => unwrap<AdCopy>(r)),
  capi: () => apiClient.get('/ads/capi').then((r) => unwrap<CapiOverview>(r)),
  saveCapi: (b: Partial<{ enabled: boolean; pixelId: string | null; token: string | null; testCode: string | null; eventName: string; sendCheckouts: boolean }>) =>
    apiClient.put('/ads/capi/settings', b).then((r) => unwrap<CapiOverview>(r)),
  testCapi: () => apiClient.post('/ads/capi/test', {}).then((r) => unwrap<{ ok: boolean; message: string | null; dryRun: boolean }>(r)),
  capiEvents: (q: { status?: string; page?: number }) => apiClient.get('/ads/capi/events', { params: q }).then((r) => unwrap<{ items: CapiEvent[]; total: number; page: number; pages: number }>(r)),
  retryCapi: (id: string) => apiClient.post(`/ads/capi/events/${id}/retry`, {}).then((r) => unwrap<CapiEvent>(r)),
};

/** utm-tagged link; other query parameters are kept (same rule as the API's utmLink). */
export function utmLink(base: string, tags: { source: string; medium?: string; campaign?: string; content?: string; term?: string }): string {
  const url = base.trim();
  const [path, hash] = url.split('#');
  const qi = path.indexOf('?');
  const keep = qi >= 0 ? path.slice(qi + 1).split('&').filter((p) => p && !/^utm_/i.test(p)) : [];
  const head = qi >= 0 ? path.slice(0, qi) : path;
  const add = ([['utm_source', tags.source], ['utm_medium', tags.medium], ['utm_campaign', tags.campaign], ['utm_content', tags.content], ['utm_term', tags.term]] as Array<[string, string | undefined]>)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}=${encodeURIComponent(v!.trim())}`);
  const q = [...keep, ...add].join('&');
  return `${head}${q ? `?${q}` : ''}${hash !== undefined ? `#${hash}` : ''}`;
}
