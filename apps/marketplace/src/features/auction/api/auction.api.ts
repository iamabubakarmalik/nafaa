import { marketplaceClient } from '@api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const auctionApi = {
  list: (params?: any) => marketplaceClient.get('/auctions', { params }).then(unwrap<any>),
  active: () => marketplaceClient.get('/auctions/live').then(unwrap<any>),
  detail: (id: string) => marketplaceClient.get(`/auctions/${id}`).then(unwrap<any>),
  bid: (id: string, amount: number) =>
    marketplaceClient.post(`/auctions/${id}/bid`, { amount }).then(unwrap<any>),
  myBids: () => marketplaceClient.get('/auctions/my-bids').then(unwrap<any>),
};
