import { marketplaceClient, unwrap } from '@/api/client';
import type { DiscoverFeed, Shop, Product } from '@/types';

export interface DiscoverParams {
  lat?: number;
  lng?: number;
  city?: string;
  radiusKm?: number;
  industry?: string;
  category?: string;
}

export interface NearbyShopsParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  industry?: string;
  category?: string;
  search?: string;
  sortBy?: 'distance' | 'rating' | 'popular' | 'newest';
  limit?: number;
  offset?: number;
}

export const homeApi = {
  discover: (params: DiscoverParams) =>
    marketplaceClient.get('/home/discover', { params }).then(unwrap<DiscoverFeed>),

  nearbyShops: (params: NearbyShopsParams) =>
    marketplaceClient.get('/home/nearby-shops', { params }).then(unwrap<{
      items: Shop[]; total: number; limit: number; offset: number;
    }>),

  trendingProducts: (params: { lat?: number; lng?: number; category?: string; limit?: number }) =>
    marketplaceClient.get('/home/trending-products', { params }).then(unwrap<Product[]>),

  searchSuggestions: (q: string) =>
    marketplaceClient.get('/home/search-suggestions', { params: { q } }).then(unwrap<{
      recent?: string[];
      suggestions?: {
        shops: any[];
        products: any[];
        categories: string[];
      };
    }>),

  recordSearch: (query: string, resultCount: number) =>
    marketplaceClient.post('/home/record-search', { query, resultCount }).then(unwrap),
};
