// ═══════════════════════════════════════════════════════════════
// MARKETPLACE — Shared TypeScript types
// ═══════════════════════════════════════════════════════════════

export type ShopVerificationLevel = 'UNVERIFIED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface MarketplaceShopProfile {
  shopId: string;
  slug?: string;
  isListedOnMarketplace: boolean;
  listedAt?: string | null;

  publicName: string;
  tagline?: string;
  description?: string;
  industry: string;
  logoUrl?: string;
  coverUrl?: string;
  galleryUrls?: string[];

  city: string;
  area?: string;
  addressLine1?: string;
  addressLine2?: string;
  province?: string;
  lat?: number;
  lng?: number;

  publicPhone?: string;
  publicEmail?: string;
  whatsappNumber?: string;
  websiteUrl?: string;

  offersDelivery: boolean;
  offersPickup: boolean;
  offersDineIn?: boolean;
  deliveryFee: number;
  freeDeliveryAbove?: number | null;
  minOrderAmount: number;
  maxOrderAmount?: number | null;
  estimatedDeliveryMinutes?: number;
  estimatedPickupMinutes?: number;
  deliveryRadiusKm?: number;

  acceptsCod: boolean;
  acceptsCard: boolean;
  acceptsJazzcash: boolean;
  acceptsEasypaisa: boolean;
  acceptsRaast?: boolean;
  acceptsWallet?: boolean;

  bargainEnabled: boolean;
  bargainMinPercent?: number;
  groupBuyEnabled: boolean;
  liveShopEnabled?: boolean;
  auctionEnabled?: boolean;

  workingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
  prayerTimeMode?: boolean;
  ramzanScheduleActive?: boolean;

  ratingAverage?: number;
  ratingCount?: number;
  totalOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  totalRevenue?: number;
  followerCount?: number;
  avgResponseTimeMinutes?: number;
  avgPreparationMinutes?: number;

  verificationLevel: ShopVerificationLevel;
  verifiedAt?: string | null;
  cnicNumber?: string;
  businessRegNumber?: string;
  taxNumber?: string;

  isOpen?: boolean;
  isPaused?: boolean;
  pausedReason?: string;

  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];

  // Frontend-friendly aliases
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  shopName?: string;
}

export interface MarketplaceProductProfile {
  id: string;
  productId: string;
  shopId: string;
  tenantId: string;
  isListedOnMarketplace: boolean;
  listedAt?: string | null;

  publicName: string;
  publicDescription?: string;
  publicPrice: number;
  compareAtPrice?: number | null;
  publicImages: string[];
  publicVideos?: string[];

  marketplaceCategory?: string;
  marketplaceSubCategory?: string;
  tags: string[];

  isAvailable: boolean;
  availableFrom?: string | null;
  availableUntil?: string | null;

  totalSold: number;
  ratingAverage: number;
  ratingCount: number;
  viewCount: number;
  wishlistCount: number;

  bargainEnabled: boolean;
  bargainMinPrice?: number | null;
  groupBuyEnabled: boolean;
  auctionEnabled: boolean;

  metaTitle?: string;
  metaDescription?: string;

  // Populated from product relation
  productName?: string;
  productSku?: string;
  productUnit?: string;
  productPrice?: number;
  productStock?: number;

  // POS integration
  posImages?: string[];
  usingPosImages?: boolean;

  // Variants from POS
  productVariants?: ProductVariantOption[];
}

export interface ProductVariantOption {
  id: string;
  name: string;           // e.g. "Size 5x7 Red"
  sku?: string;
  price?: number;
  stock?: number;
  attributes?: Record<string, string>; // { size: '5x7', color: 'red' }
  imageUrl?: string;
  isAvailable?: boolean;
}

export type MarketplaceOrderStatus =
  | 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PREPARING'
  | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  | 'CANCELLED' | 'REFUNDED' | 'DISPUTED' | 'RETURNED';

export type MarketplacePaymentMethod =
  | 'COD' | 'CARD' | 'JAZZCASH' | 'EASYPAISA' | 'NAYAPAY'
  | 'SADAPAY' | 'RAAST' | 'BANK_TRANSFER' | 'WALLET' | 'SPLIT';

export type MarketplacePaymentStatus =
  | 'PENDING' | 'PAID' | 'PARTIAL' | 'FAILED' | 'REFUNDED';

export type DeliveryType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

export interface MarketplaceOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  shopId: string;
  tenantId: string;

  status: MarketplaceOrderStatus;
  deliveryType: DeliveryType;

  subtotal: number;
  discount: number;
  deliveryFee: number;
  serviceFee: number;
  taxAmount: number;
  tipAmount: number;
  walletUsed: number;
  loyaltyPointsUsed: number;
  loyaltyDiscount: number;
  total: number;
  currency: string;

  paymentMethod: MarketplacePaymentMethod;
  paymentStatus: MarketplacePaymentStatus;
  paidAt?: string | null;

  addressSnapshot?: any;
  deliverySlotStart?: string | null;
  deliverySlotEnd?: string | null;
  estimatedDeliveryAt?: string | null;
  actualDeliveryAt?: string | null;
  riderId?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;

  couponCode?: string;
  couponDiscount: number;

  customerNotes?: string;
  shopNotes?: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: string | null;

  isRated: boolean;
  shopRating?: number | null;
  riderRating?: number | null;

  source: string;
  createdAt: string;
  updatedAt: string;

  customer?: {
    id: string;
    fullName: string;
    phone: string;
    avatarUrl?: string;
  };
  items?: MarketplaceOrderItem[];
  itemCount?: number;
}

export interface MarketplaceOrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  total: number;
  notes?: string;
  modifiers?: any;
  bargainId?: string;
}
