// ═══ Customer ═══
export interface MarketplaceCustomer {
  id: string;
  phone: string;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
  loyaltyPoints: number;
  walletBalance: number;
  referralCode: string;
  language: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAt?: string;
}

export interface CustomerAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  area: string;
  province?: string | null;
  postalCode?: string | null;
  isDefault: boolean;
  addressType: 'HOME' | 'OFFICE' | 'OTHER';
  lat?: number | null;
  lng?: number | null;
  deliveryNotes?: string | null;
}

// ═══ Shop ═══
export interface Shop {
  id: string;
  shopId: string;
  slug: string;
  publicName: string;
  tagline?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  galleryUrls?: string[];
  publicPhone?: string | null;
  publicEmail?: string | null;
  websiteUrl?: string | null;
  whatsappNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city: string;
  area?: string | null;
  province?: string | null;
  lat?: number | null;
  lng?: number | null;
  industry: string;
  subCategories?: string[];
  isListedOnMarketplace: boolean;
  isOpen: boolean;
  isPaused: boolean;
  verificationLevel: 'UNVERIFIED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  verifiedAt?: string | null;
  ratingAverage: number;
  ratingCount: number;
  totalOrders: number;
  followerCount: number;
  avgResponseTimeMinutes?: number | null;
  avgPreparationMinutes?: number | null;
  offersDelivery: boolean;
  offersPickup: boolean;
  offersDineIn: boolean;
  deliveryRadiusKm: number;
  deliveryFee: number;
  freeDeliveryAbove?: number | null;
  minOrderAmount: number;
  maxOrderAmount?: number | null;
  estimatedDeliveryMinutes?: number | null;
  estimatedPickupMinutes?: number | null;
  acceptsCod: boolean;
  acceptsCard: boolean;
  acceptsJazzcash: boolean;
  acceptsEasypaisa: boolean;
  acceptsRaast: boolean;
  acceptsWallet: boolean;
  bargainEnabled: boolean;
  groupBuyEnabled: boolean;
  auctionEnabled: boolean;
  liveShopEnabled: boolean;
  workingHours?: Record<string, { open: string; close: string }>;
  distanceKm?: number | null;
  currentlyOpen?: boolean;
  productCount?: number;
  isFollowing?: boolean;
}

// ═══ Product ═══
export interface Product {
  id: string;
  productId: string;
  shopId: string;
  publicName: string;
  publicDescription?: string | null;
  publicPrice: number;
  compareAtPrice?: number | null;
  publicImages: string[];
  publicVideos?: string[];
  marketplaceCategory?: string | null;
  marketplaceSubCategory?: string | null;
  tags?: string[];
  isAvailable: boolean;
  totalSold: number;
  ratingAverage: number;
  ratingCount: number;
  viewCount: number;
  wishlistCount: number;
  bargainEnabled: boolean;
  bargainMinPrice?: number | null;
  groupBuyEnabled: boolean;
  auctionEnabled: boolean;
  isInWishlist?: boolean;
  shop?: Partial<Shop>;
}

// ═══ Cart ═══
export interface CartLine {
  id: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  currentPrice?: number;
  priceChanged?: boolean;
  stillAvailable?: boolean;
  quantity: number;
  notes?: string | null;
  modifiers?: any;
  bargainId?: string | null;
  groupBuyId?: string | null;
  lineTotal: number;
  compareAtPrice?: number | null;
}

export interface CartShopGroup {
  shopId: string;
  shop?: {
    slug: string;
    publicName: string;
    logoUrl?: string | null;
    estimatedDeliveryMinutes?: number | null;
    isOpen: boolean;
  } | null;
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  minOrderAmount: number;
  meetsMinOrder: boolean;
  shopTotal: number;
  itemCount: number;
}

export interface Cart {
  id: string;
  shopGroups: CartShopGroup[];
  totalItems: number;
  subtotal: number;
  totalDeliveryFee: number;
  grandTotal: number;
}

// ═══ Order ═══
export type OrderStatus =
  | 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PREPARING'
  | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY'
  | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTED' | 'RETURNED';

export type PaymentMethod =
  | 'COD' | 'CARD' | 'JAZZCASH' | 'EASYPAISA'
  | 'NAYAPAY' | 'SADAPAY' | 'RAAST'
  | 'BANK_TRANSFER' | 'WALLET' | 'SPLIT';

export interface Order {
  id: string;
  orderNumber: string;
  shopId: string;
  status: OrderStatus;
  deliveryType: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
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
  paymentMethod: PaymentMethod;
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'FAILED' | 'REFUNDED';
  addressId?: string | null;
  addressSnapshot?: any;
  deliverySlotStart?: string | null;
  deliverySlotEnd?: string | null;
  estimatedDeliveryAt?: string | null;
  actualDeliveryAt?: string | null;
  paidAt?: string | null;
  riderLat?: number | null;
  riderLng?: number | null;
  riderName?: string | null;
  riderPhone?: string | null;
  customerNotes?: string | null;
  isRated: boolean;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  shop?: any;
  isActive?: boolean;
  isCompleted?: boolean;
  canCancel?: boolean;
  canRate?: boolean;
  canReorder?: boolean;
  totalItems?: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
  notes?: string | null;
}

// ═══ Discover feed ═══
export interface DiscoverFeed {
  banners: any[];
  categories: { name: string; productCount: number }[];
  featuredShops: Shop[];
  nearbyShops: Shop[];
  trendingProducts: Product[];
  flashSales: any[];
  activeGroupBuys: any[];
  liveShops: any[];
  recommendedForYou: Product[];
}

// ═══ Notification ═══
export interface Notification {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  actionUrl?: string | null;
  data?: any;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

// ═══ Review ═══
export interface Review {
  id: string;
  reviewType: 'PRODUCT' | 'SHOP' | 'RIDER' | 'ORDER';
  rating: number;
  title?: string | null;
  comment?: string | null;
  imageUrls: string[];
  videoUrl?: string | null;
  qualityRating?: number | null;
  packagingRating?: number | null;
  deliveryRating?: number | null;
  valueRating?: number | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  replyFromShop?: string | null;
  replyAt?: string | null;
  createdAt: string;
  customer: {
    id?: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}
