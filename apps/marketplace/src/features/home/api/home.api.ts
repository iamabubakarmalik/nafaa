import { marketplaceClient } from '@/api/marketplace-client';
const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export const homeApi = {
  discover: (params: { lat?: number; lng?: number; city?: string; radiusKm?: number }) =>
    marketplaceClient.get('/home/discover', { params }).then(unwrap<any>),

  nearbyShops: (params: any) =>
    marketplaceClient.get('/home/nearby-shops', { params }).then(unwrap<any>),

  trending: (params: any) =>
    marketplaceClient.get('/home/trending-products', { params }).then(unwrap<any>),

  searchSuggestions: (q: string) =>
    marketplaceClient.get('/home/search-suggestions', { params: { q } }).then(unwrap<any>),
};
