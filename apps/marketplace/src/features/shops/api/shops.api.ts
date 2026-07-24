import { marketplaceClient, unwrap } from '@/api/client';
import type { Shop, Product, Review } from '@/types';

export interface ListShopsParams {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  city?: string;
  area?: string;
  industry?: string;
  category?: string;
  search?: string;
  minVerification?: 'UNVERIFIED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  onlyOpen?: boolean;
  freeDelivery?: boolean;
  bargainEnabled?: boolean;
  groupBuyEnabled?: boolean;
  minRating?: number;
  sortBy?: 'distance' | 'rating' | 'popular' | 'newest' | 'delivery_time';
  limit?: number;
  offset?: number;
}

export interface ShopProductsParams {
  category?: string;
  search?: string;
  inStockOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'bestsellers' | 'newest' | 'price_asc' | 'price_desc' | 'rating';
  limit?: number;
  offset?: number;
}

export interface ShopReviewsParams {
  rating?: number;
  withPhotos?: boolean;
  withVideo?: boolean;
  sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
  limit?: number;
  offset?: number;
}

export const shopsApi = {
  list: (params: ListShopsParams) =>
    marketplaceClient.get('/shops', { params }).then(unwrap<{
      items: Shop[]; total: number; limit: number; offset: number;
    }>),

  bySlug: (slug: string, lat?: number, lng?: number) =>
    marketplaceClient
      .get(`/shops/by-slug/${slug}`, { params: { lat, lng } })
      .then(unwrap<Shop & { recentReviews: Review[] }>),

  byId: (shopId: string, lat?: number, lng?: number) =>
    marketplaceClient
      .get(`/shops/${shopId}`, { params: { lat, lng } })
      .then(unwrap<Shop & { recentReviews: Review[] }>),

  products: (shopId: string, params: ShopProductsParams) =>
    marketplaceClient
      .get(`/shops/${shopId}/products`, { params })
      .then(unwrap<{
        items: Product[];
        total: number;
        limit: number;
        offset: number;
        facets: { categories: { name: string; count: number }[] };
      }>),

  reviews: (shopId: string, params: ShopReviewsParams) =>
    marketplaceClient
      .get(`/shops/${shopId}/reviews`, { params })
      .then(unwrap<{
        items: Review[];
        total: number;
        limit: number;
        offset: number;
        distribution: Record<number, number>;
      }>),

  hours: (shopId: string) =>
    marketplaceClient.get(`/shops/${shopId}/hours`).then(unwrap<{
      workingHours: any;
      holidayDates: string[];
      isOpen: boolean;
      isPaused: boolean;
      pausedReason?: string | null;
      currentlyOpen: boolean;
    }>),

  similar: (shopId: string, limit = 10) =>
    marketplaceClient.get(`/shops/${shopId}/similar`, { params: { limit } }).then(unwrap<Shop[]>),

  follow: (shopId: string) =>
    marketplaceClient.post(`/shops/${shopId}/follow`).then(unwrap<{ success: boolean; isFollowing: boolean }>),

  unfollow: (shopId: string) =>
    marketplaceClient.delete(`/shops/${shopId}/follow`).then(unwrap<{ success: boolean; isFollowing: boolean }>),

  followed: (limit = 20, offset = 0) =>
    marketplaceClient.get('/shops/followed/list', { params: { limit, offset } }).then(unwrap<{
      items: Shop[]; total: number;
    }>),
};
