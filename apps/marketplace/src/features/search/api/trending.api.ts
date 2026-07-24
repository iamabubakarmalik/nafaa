import { marketplaceClient, unwrap } from '@/api/client';

export const trendingApi = {
  trendingSearches: (city?: string) =>
    marketplaceClient.get('/search/trending', { params: { city } }).then(unwrap<{
      searches: string[]; categories: string[]; hashtags: string[];
    }>),

  popularNow: () =>
    marketplaceClient.get('/search/popular-now').then(unwrap<any[]>),

  suggestions: (query: string) =>
    marketplaceClient.get('/search/autocomplete', { params: { q: query } }).then(unwrap<{
      queries: string[]; products: any[]; shops: any[]; categories: string[];
    }>),
};
