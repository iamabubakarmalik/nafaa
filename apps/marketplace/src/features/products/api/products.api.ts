import { marketplaceClient, unwrap } from '@/api/client';
import type { Product, Review } from '@/types';

export interface SearchProductsParams {
  q?: string;
  category?: string;
  subCategory?: string;
  shopId?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  bargainEnabled?: boolean;
  groupBuyEnabled?: boolean;
  onDiscount?: boolean;
  freeDelivery?: boolean;
  sortBy?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'bestsellers';
  limit?: number;
  offset?: number;
}

export interface ProductReviewsParams {
  rating?: number;
  withPhotos?: boolean;
  withVideo?: boolean;
  sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
  limit?: number;
  offset?: number;
}

export const productsApi = {
  search: (params: SearchProductsParams) =>
    marketplaceClient.get('/products', { params }).then(unwrap<{
      items: Product[];
      total: number;
      limit: number;
      offset: number;
      facets: { categories: { name: string; count: number }[] };
    }>),

  detail: (productId: string) =>
    marketplaceClient.get(`/products/${productId}`).then(unwrap<any>),

  reviews: (productId: string, params: ProductReviewsParams) =>
    marketplaceClient.get(`/products/${productId}/reviews`, { params }).then(unwrap<{
      items: Review[];
      total: number;
      limit: number;
      offset: number;
      distribution: Record<number, number>;
    }>),

  priceCompare: (productId: string) =>
    marketplaceClient.get(`/products/${productId}/price-compare`).then(unwrap<{
      baseProductId: string;
      alternatives: any[];
    }>),

  categories: () =>
    marketplaceClient.get('/products/categories').then(unwrap<{ name: string; productCount: number }[]>),

  subCategories: (name: string) =>
    marketplaceClient.get(`/products/categories/${encodeURIComponent(name)}/sub`).then(unwrap<{
      name: string; productCount: number;
    }[]>),
};
