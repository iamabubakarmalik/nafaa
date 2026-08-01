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
  createdAt: string;
  updatedAt: string;
}

export interface TopupInventoryRow {
  provider: string;
  topupType: string;
  denomination: number;
  count: number;
  sellingPrice: number;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gamingTopupsApi = {
  create: (data: Partial<GamingTopup>) =>
    apiClient.post('/gaming/digital-topups', data).then(unwrap<GamingTopup>),

  bulkCreate: (data: {
    provider: string; topupType: string; denominationValue: number;
    costPrice: number; sellingPrice: number;
    cards: Array<{ cardCode: string; cardPin?: string; cardSerial?: string }>;
    expiryDate?: string; supplierRef?: string;
  }) => apiClient.post('/gaming/digital-topups/bulk', data).then(unwrap<{ created: number; items: GamingTopup[] }>),

  list: (params?: { provider?: string; redeemed?: boolean; available?: boolean; search?: string }) =>
    apiClient.get('/gaming/digital-topups', { params }).then(unwrap<GamingTopup[]>),

  inventory: () =>
    apiClient.get('/gaming/digital-topups/inventory').then(unwrap<TopupInventoryRow[]>),

  summary: () => apiClient.get('/gaming/digital-topups/summary').then(unwrap<any>),

  getOne: (id: string, reveal = false) =>
    apiClient.get('/gaming/digital-topups/' + id, { params: { reveal: reveal ? 'true' : undefined } }).then(unwrap<GamingTopup>),

  sell: (id: string, data: {
    customerId?: string; customerName?: string; customerPhone?: string;
    deliveredVia?: string; deliveryReference?: string; actualSellingPrice?: number;
  }) => apiClient.post('/gaming/digital-topups/' + id + '/sell', data).then(unwrap<GamingTopup>),

  redeem: (id: string) =>
    apiClient.post('/gaming/digital-topups/' + id + '/redeem').then(unwrap<GamingTopup>),

  remove: (id: string) =>
    apiClient.delete('/gaming/digital-topups/' + id).then(unwrap),
};
