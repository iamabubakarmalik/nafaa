/**
 * Retention and affiliates on mobile: WhatsApp campaigns sent one by one and
 * the influencer / affiliate list. Same endpoints as the web
 * (integrations/online-orders/api/retention.api.ts).
 */

import { apiClient } from '@/core/api/client';

const unwrap = <T,>(r: { data: unknown }): T => {
  const d = r.data as { data?: unknown } | null;
  return (d && typeof d === 'object' && 'data' in d && d.data !== undefined && !Array.isArray(d) ? d.data : d) as T;
};

export type CampaignTemplate = 'WIN_BACK' | 'NEW_ARRIVAL' | 'REVIEW' | 'RESTOCK' | 'BIRTHDAY' | 'CUSTOM';
export interface CampaignStats { recipients: number; sent: number; skipped: number; pending: number; replied: number; converted: number; revenue: number }
export interface Campaign {
  id: string; name: string; segment: string; template: CampaignTemplate; message: string; code: string | null; link: string | null;
  status: 'OPEN' | 'DONE'; createdAt: string; stats: CampaignStats;
}
export interface CampaignRecipient {
  id: string; name: string; phone: string; text: string; status: 'PENDING' | 'SENT' | 'SKIPPED'; sentAt: string | null; replied: boolean;
  converted: { orderId: string; no: string; total: number; at: string } | null;
}
export interface CampaignDetail extends Campaign { recipients: CampaignRecipient[] }
export interface CampaignList { campaigns: Campaign[]; totals: { campaigns: number; sent: number; pending: number; converted: number; revenue: number; rate: number } }

export interface AffiliateStats {
  orders: number; delivered: number; pending: number; returned: number; sales: number; commission: number; paid: number; due: number; roi: number | null;
}
export interface Affiliate {
  id: string; name: string; phone: string | null; kind: 'INFLUENCER' | 'AFFILIATE'; platform: string | null; handle: string | null; slug: string;
  codes: string[]; commissionType: 'PERCENT' | 'FIXED'; commissionValue: number; active: boolean; stats: AffiliateStats; paidAllTime: number; lastPaidAt: string | null;
}
export interface AffiliateList {
  range: { from: string; to: string };
  affiliates: Affiliate[];
  totals: { affiliates: number; orders: number; delivered: number; sales: number; commission: number; due: number; roi: number | null };
}

export const retentionApi = {
  campaigns: () => apiClient.get('/online-orders/campaigns').then((r) => unwrap<CampaignList>(r)),
  campaign: (id: string) => apiClient.get(`/online-orders/campaigns/${id}`).then((r) => unwrap<CampaignDetail>(r)),
  markRecipient: (id: string, rid: string, body: { status?: 'SENT' | 'SKIPPED' | 'PENDING'; replied?: boolean }) =>
    apiClient.post(`/online-orders/campaigns/${id}/recipients/${rid}`, body).then((r) => unwrap<{ ok: true; pending: number }>(r)),
  affiliates: (q: { from?: string; to?: string }) => apiClient.get('/online-orders/affiliates', { params: q }).then((r) => unwrap<AffiliateList>(r)),
  pay: (id: string, body: { from?: string; to?: string; paymentMethod: string }) =>
    apiClient.post(`/online-orders/affiliates/${id}/pay`, body).then((r) => unwrap<{ amount: number; expenseNumber: string | null }>(r)),
};
