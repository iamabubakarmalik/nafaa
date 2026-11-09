/**
 * Retention and affiliates: WhatsApp campaigns (one by one), review requests
 * and ratings, online loyalty and referral, influencers and affiliates.
 */

import { apiClient } from '@core/api/client';
import { unwrap } from './online-orders.api';

// ─── Campaigns ───
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
export interface NewCampaign { name?: string; segment: string; template: CampaignTemplate; message: string; code?: string; link?: string; product?: string }

// ─── Reviews ───
export type ReviewFilter = 'TO_SEND' | 'SENT' | 'RATED' | 'LOW' | 'ALL';
export interface ReviewRow {
  id: string; channelOrderId: string; token: string; customerName: string | null; customerPhone: string | null; orderNo: string | null;
  source: 'AUTOMATION' | 'MANUAL'; sentAt: string | null; rating: number | null; comment: string | null; ratedAt: string | null; createdAt: string;
}
export interface ReviewStats {
  requests: number; toSend: number; sent: number; rated: number; average: number | null; responseRate: number; distribution: number[]; low: number;
}
export interface ReviewLink { label: string; url: string }

// ─── Settings ───
export interface RetentionSettings {
  loyalty: { enabled: boolean; pointsPerRupee: number | null };
  referral: { enabled: boolean; friendDiscountType: 'PERCENT' | 'FIXED'; friendDiscount: number; referrerPoints: number; newOnly: boolean };
  reviews: { links: ReviewLink[]; linksFrom: number };
}

// ─── Loyalty ───
export interface LoyaltyEntry {
  id: string; kind: 'EARN' | 'REFERRAL'; status: 'PENDING' | 'DONE' | 'REVERSED' | 'CANCELLED'; points: number; discount: number | null; createdAt: string;
  orderId: string; orderNo: string | null; friend: string | null; orderStatus: string | null; total: number | null; customer: string | null;
}
export interface LoyaltyOverview {
  settings: RetentionSettings;
  counter: { enabled: boolean; pointsPerRupee: number; redemptionRate: number };
  stats: { pointsGiven: number; ordersEarned: number; referrals: number; referralsDone: number; referralsPending: number; referralSales: number; codes: number };
  topReferrers: Array<{ customerId: string; name: string; phone: string | null; friends: number; points: number; sales: number }>;
  entries: LoyaltyEntry[];
  days: number;
}
export interface LoyaltyCustomer { id: string; name: string; phone: string | null; loyaltyPoints: number; code: string | null }
export interface ReferralLookup {
  code: string; referrer: string; referrerPhone: string | null; discount: number; discountType: 'PERCENT' | 'FIXED'; discountValue: number; referrerPoints: number; enabled: boolean;
}

// ─── Affiliates ───
export type CommissionType = 'PERCENT' | 'FIXED';
export interface AffiliateStats {
  orders: number; delivered: number; pending: number; returned: number; sales: number; commission: number; paid: number; due: number;
  roi: number | null; byCode?: number; byLink?: number; manual?: number;
}
export interface Affiliate {
  id: string; name: string; phone: string | null; kind: 'INFLUENCER' | 'AFFILIATE'; platform: string | null; handle: string | null; slug: string;
  codes: string[]; commissionType: CommissionType; commissionValue: number; active: boolean; notes: string | null; createdAt: string;
  stats: AffiliateStats; paidAllTime: number; lastPaidAt: string | null;
}
export interface AffiliateList {
  range: { from: string; to: string };
  affiliates: Affiliate[];
  totals: { affiliates: number; orders: number; delivered: number; sales: number; commission: number; due: number; roi: number | null };
}
export interface AffiliateBody {
  name?: string; phone?: string | null; kind?: string; platform?: string | null; handle?: string | null; slug?: string; codes?: string[];
  commissionType?: CommissionType; commissionValue?: number; active?: boolean; notes?: string | null;
}
export interface StatementLine {
  orderId: string; no: string; status: string; total: number; base: number; commission: number; paid: boolean; source: 'CODE' | 'UTM' | 'MANUAL';
  code: string | null; utmCampaign: string | null; customer: string; city: string | null; channel: string | null; receivedAt: string; deliveredAt: string | null; manual: boolean;
}
export interface AffiliatePayout {
  id: string; periodFrom: string; periodTo: string; orders: number; sales: number; amount: number; paymentMethod: string; expenseNumber: string | null; note: string | null; paidAt: string;
}
export interface AffiliateStatement {
  affiliate: Omit<Affiliate, 'stats' | 'paidAllTime' | 'lastPaidAt'>;
  range: { from: string; to: string };
  totals: AffiliateStats;
  lines: StatementLine[];
  payouts: AffiliatePayout[];
}

export const retentionApi = {
  campaigns: () => apiClient.get('/online-orders/campaigns').then((r) => unwrap<CampaignList>(r)),
  campaign: (id: string) => apiClient.get(`/online-orders/campaigns/${id}`).then((r) => unwrap<CampaignDetail>(r)),
  createCampaign: (body: NewCampaign) => apiClient.post('/online-orders/campaigns', body).then((r) => unwrap<CampaignDetail>(r)),
  markRecipient: (id: string, rid: string, body: { status?: 'SENT' | 'SKIPPED' | 'PENDING'; replied?: boolean }) =>
    apiClient.post(`/online-orders/campaigns/${id}/recipients/${rid}`, body).then((r) => unwrap<{ ok: true; pending: number }>(r)),
  removeCampaign: (id: string) => apiClient.delete(`/online-orders/campaigns/${id}`).then((r) => unwrap<{ ok: true }>(r)),

  reviews: (q: { filter?: ReviewFilter; days?: number; search?: string }) =>
    apiClient.get('/online-orders/reviews', { params: q }).then((r) => unwrap<{ items: ReviewRow[]; stats: ReviewStats; days: number }>(r)),
  requestRecent: (days: number) => apiClient.post('/online-orders/reviews/request-recent', { days }).then((r) => unwrap<{ made: number }>(r)),
  requestForOrder: (orderId: string) => apiClient.post(`/online-orders/reviews/order/${orderId}`, {}).then((r) => unwrap<ReviewRow>(r)),
  reviewSent: (id: string, undo = false) => apiClient.post(`/online-orders/reviews/${id}/sent`, { undo }).then((r) => unwrap<{ ok: true }>(r)),

  settings: () => apiClient.get('/online-orders/retention/settings').then((r) => unwrap<RetentionSettings>(r)),
  saveSettings: (body: Partial<RetentionSettings>) => apiClient.put('/online-orders/retention/settings', body).then((r) => unwrap<RetentionSettings>(r)),

  loyalty: (days = 90) => apiClient.get('/online-orders/loyalty', { params: { days } }).then((r) => unwrap<LoyaltyOverview>(r)),
  loyaltyCustomers: (search?: string) => apiClient.get('/online-orders/loyalty/customers', { params: { search } }).then((r) => unwrap<LoyaltyCustomer[]>(r)),
  referralCode: (customerId: string) => apiClient.post(`/online-orders/loyalty/customers/${customerId}/code`, {}).then((r) => unwrap<{ code: string }>(r)),
  lookupReferral: (code: string, value?: number) =>
    apiClient.get(`/online-orders/loyalty/referral/${encodeURIComponent(code)}`, { params: { value } }).then((r) => unwrap<ReferralLookup>(r)),
  linkReferral: (body: { orderId: string; code: string }) => apiClient.post('/online-orders/loyalty/referrals', body).then((r) => unwrap<LoyaltyEntry>(r)),
  unlinkReferral: (id: string) => apiClient.delete(`/online-orders/loyalty/referrals/${id}`).then((r) => unwrap<{ ok: true }>(r)),

  affiliates: (q: { from?: string; to?: string }) => apiClient.get('/online-orders/affiliates', { params: q }).then((r) => unwrap<AffiliateList>(r)),
  createAffiliate: (body: AffiliateBody) => apiClient.post('/online-orders/affiliates', body).then((r) => unwrap<Affiliate>(r)),
  updateAffiliate: (id: string, body: AffiliateBody) => apiClient.put(`/online-orders/affiliates/${id}`, body).then((r) => unwrap<Affiliate>(r)),
  removeAffiliate: (id: string) => apiClient.delete(`/online-orders/affiliates/${id}`).then((r) => unwrap<{ ok: true; archived: boolean }>(r)),
  statement: (id: string, q: { from?: string; to?: string }) =>
    apiClient.get(`/online-orders/affiliates/${id}/statement`, { params: q }).then((r) => unwrap<AffiliateStatement>(r)),
  linkOrder: (id: string, body: { orderId?: string; orderNo?: string }) => apiClient.post(`/online-orders/affiliates/${id}/orders`, body).then((r) => unwrap<{ ok: true }>(r)),
  unlinkOrder: (id: string, orderId: string) => apiClient.delete(`/online-orders/affiliates/${id}/orders/${orderId}`).then((r) => unwrap<{ ok: true }>(r)),
  pay: (id: string, body: { from?: string; to?: string; paymentMethod: string; note?: string }) =>
    apiClient.post(`/online-orders/affiliates/${id}/pay`, body).then((r) => unwrap<AffiliatePayout>(r)),
};
