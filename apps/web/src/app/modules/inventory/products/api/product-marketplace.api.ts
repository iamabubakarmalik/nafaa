import { apiClient } from '@core/api/client';

const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export interface ProductMarketplaceProfile {
  productId: string;
  shopId: string;
  isListedOnMarketplace: boolean;
  listedAt?: string | null;

  // Public fields
  publicName: string;
  publicDescription?: string;
  publicPrice: number;
  compareAtPrice?: number | null;
  publicImages: string[];
  marketplaceCategory?: string;

  // Availability
  isAvailable: boolean;

  // Features
  bargainEnabled: boolean;
  bargainMinPrice?: number | null;
  groupBuyEnabled: boolean;

  // Stats (read-only)
  ratingAverage?: number;
  ratingCount?: number;
  totalSold?: number;
  wishlistCount?: number;
}

export const productMarketplaceApi = {
  getProfile: (productId: string) =>
    apiClient.get(`/products/${productId}/marketplace-profile`).then((r) => unwrap<ProductMarketplaceProfile>(r)),

  updateProfile: (productId: string, data: Partial<ProductMarketplaceProfile>) =>
    apiClient.patch(`/products/${productId}/marketplace-profile`, data).then((r) => unwrap<ProductMarketplaceProfile>(r)),

  publish: (productId: string) =>
    apiClient.post(`/products/${productId}/marketplace-profile/publish`).then(unwrap),

  unpublish: (productId: string) =>
    apiClient.post(`/products/${productId}/marketplace-profile/unpublish`).then(unwrap),
};
