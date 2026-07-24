import { marketplaceClient, unwrap } from '@/api/client';

export interface PlaceBidPayload {
  amount: number;
  isAutoBid?: boolean;
  maxAutoBid?: number;
}

export const auctionApi = {
  list: (params: { shopId?: string; status?: string; limit?: number; offset?: number } = {}) =>
    marketplaceClient.get('/auctions', { params }).then(unwrap<{
      items: any[]; total: number;
    }>),

  detail: (id: string) =>
    marketplaceClient.get(`/auctions/${id}`).then(unwrap<any>),

  bid: (id: string, payload: PlaceBidPayload) =>
    marketplaceClient.post(`/auctions/${id}/bid`, payload).then(unwrap<any>),

  myBids: (limit = 20, offset = 0) =>
    marketplaceClient.get('/auctions/my/bids', { params: { limit, offset } }).then(unwrap<any>),

  myWins: () =>
    marketplaceClient.get('/auctions/my/wins').then(unwrap<any>),
};
