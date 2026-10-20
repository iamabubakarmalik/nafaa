import { apiClient } from '@core/api/client';

export type GamingTopupProvider =
  | 'PSN' | 'XBOX_LIVE' | 'NINTENDO' | 'STEAM' | 'EPIC_GAMES'
  | 'GOOGLE_PLAY' | 'APPLE_STORE' | 'ITUNES'
  | 'ROBUX' | 'FORTNITE_VBUCKS' | 'PUBG_UC'
  | 'MOBILE_LEGENDS_DIAMONDS' | 'FREE_FIRE_DIAMONDS'
  | 'DISCORD_NITRO' | 'NETFLIX' | 'SPOTIFY' | 'OTHER';

export interface GamingTopup {
  id: string;
  topupNumber: string;
  provider: GamingTopupProvider;
  topupType: string;
  denominationValue: number;
  denominationCurrency: string;
  cardCode?: string;
  cardPin?: string;
  cardSerial?: string;
  costPrice: number;
  sellingPrice: number;
  profit: number;
  isRedeemed: boolean;
  redeemedAt?: string;
  soldAt?: string;
  soldToCustomerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveredVia?: string;
  deliveryReference?: string;
  expiryDate?: string;
  regionRestriction?: string;
  notes?: string;
  supplierRef?: string;
  /** The bill that sold it was cancelled (only on a single card). */
  billVoided?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TopupInventoryRow {
  provider: string;
  topupType: string;
  denomination: number;
  count: number;
  sellingPrice: number;
  avgCost: number;
  nearestExpiry?: string | null;
}
export interface CounterCardKind extends TopupInventoryRow { productId: string; name: string; sku: string }
export interface GivenCard {
  id: string; topupNumber: string; provider: string; topupType: string; denominationValue: number; denominationCurrency: string;
  cardCode?: string | null; cardPin?: string | null; cardSerial?: string | null; expiryDate?: string | null;
}
export interface TopupSummary { totalCards: number; available: number; sold: number; redeemed: number; removed: number; totalRevenue: number; totalProfit: number; stockValue: number }
export interface TopupPage { items: GamingTopup[]; total: number; page: number; limit: number }

const unwrap = <T,>(res: { data?: { data?: unknown } }): T => (res.data?.data ?? res.data) as T;

export const gamingTopupsApi = {
  bulkCreate: (data: {
    provider: string; topupType: string; denominationValue: number;
    costPrice: number; sellingPrice: number;
    cards: Array<{ cardCode: string; cardPin?: string; cardSerial?: string }>;
    expiryDate?: string; supplierRef?: string;
  }) => apiClient.post('/gaming/digital-topups/bulk', data).then(unwrap<{ created: number; from: string; to: string }>),
  page: (params: { provider?: string; status?: string; search?: string; page: number; limit: number }) =>
    apiClient.get('/gaming/digital-topups', { params }).then(unwrap<TopupPage>),
  inventory: () => apiClient.get('/gaming/digital-topups/inventory').then(unwrap<TopupInventoryRow[]>),
  counter: () => apiClient.get('/gaming/digital-topups/counter').then(unwrap<CounterCardKind[]>),
  assignSale: (saleId: string) => apiClient.post('/gaming/digital-topups/assign-sale', { saleId }).then(unwrap<{ saleNumber: string; missing: number; cards: GivenCard[] }>),
  summary: () => apiClient.get('/gaming/digital-topups/summary').then(unwrap<TopupSummary>),
  getOne: (id: string) => apiClient.get('/gaming/digital-topups/' + id).then(unwrap<GamingTopup>),
  redeem: (id: string) => apiClient.post('/gaming/digital-topups/' + id + '/redeem').then(unwrap<GamingTopup>),
  restore: (id: string) => apiClient.post('/gaming/digital-topups/' + id + '/restore').then(unwrap<GamingTopup>),
  remove: (id: string, reason?: string) => apiClient.delete('/gaming/digital-topups/' + id, { data: { reason } }).then(unwrap<GamingTopup>),
};
