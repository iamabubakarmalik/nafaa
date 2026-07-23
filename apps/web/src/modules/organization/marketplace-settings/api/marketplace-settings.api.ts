import { apiClient } from '@core/api/client';

const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

export interface MarketplaceProfile {
  shopId: string;
  slug?: string;
  isListedOnMarketplace: boolean;
  listedAt?: string | null;

  // Basic
  publicName: string;
  tagline?: string;
  description?: string;
  industry: string;
  logoUrl?: string;
  coverUrl?: string;

  // Location
  city: string;
  area?: string;
  address?: string;
  lat?: number;
  lng?: number;

  // Contact
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;

  // Delivery
  offersDelivery: boolean;
  offersPickup: boolean;
  deliveryFee: number;
  freeDeliveryAbove?: number | null;
  minOrderAmount: number;
  estimatedDeliveryMinutes?: number;
  deliveryRadiusKm?: number;

  // Payment
  acceptsCod: boolean;
  acceptsCard: boolean;
  acceptsJazzcash: boolean;
  acceptsEasypaisa: boolean;
  acceptsRaast?: boolean;
  acceptsWallet?: boolean;

  // Features
  bargainEnabled: boolean;
  bargainMinPercent?: number;
  groupBuyEnabled: boolean;
  liveShopEnabled?: boolean;
  auctionEnabled?: boolean;

  // Stats (read-only)
  ratingAverage?: number;
  ratingCount?: number;
  totalOrders?: number;
  followerCount?: number;
  verificationLevel?: string;
  isOpen?: boolean;
}

export const marketplaceSettingsApi = {
  getProfile: () =>
    apiClient.get('/shops/current/marketplace-profile').then(unwrap<MarketplaceProfile>),

  updateProfile: (data: Partial<MarketplaceProfile>) =>
    apiClient.patch('/shops/current/marketplace-profile', data).then(unwrap<MarketplaceProfile>),

  publishShop: () =>
    apiClient.post('/shops/current/marketplace-profile/publish').then(unwrap<any>),

  unpublishShop: () =>
    apiClient.post('/shops/current/marketplace-profile/unpublish').then(unwrap<any>),
};
