/**
 * Nafaa Market endpoints used by the shop owner's Market workspace.
 *
 * Shop profile and publishing: shops/current/marketplace-profile
 * Market rules (gates, defaults): marketplace/config
 * Products: marketplace/products/manage + products/:id/marketplace-profile
 * Dashboard, analytics, reviews, messages, seller notifications: marketplace/*
 * Riders and delivery zones: delivery/*
 * Offers: promotions
 */

import { apiClient } from '@core/api/client';

const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

/* ─── Category engine ─── */

export const MARKET_GATES = ['FOOD', 'GROCERY', 'PHARMACY', 'SHOPPING', 'BOOKING', 'WHOLESALE'] as const;
export type MarketGate = (typeof MARKET_GATES)[number];

/** Per-shop flow switches; a missing key takes the gate default. */
export interface FlowSettings {
  modifiers?: boolean;
  substitutes?: boolean;
  deliverySlots?: boolean;
  prescription?: boolean;
  customCake?: boolean;
  booking?: boolean;
  sizeColour?: boolean;
  courier?: boolean;
  pickup?: boolean;
  dineIn?: boolean;
  giftMessage?: boolean;
  minOrderAmount?: number;
}
export type FlowKey = keyof FlowSettings;

export type Localized = { en: string; roman: string; ur: string };

export interface MarketGateConfig {
  id: MarketGate;
  label: Localized;
  tagline: Localized;
  mode: 'INSTANT' | 'SHIPPED' | 'BOOKING';
  businessOnly: boolean;
  filters: Array<{ id: string; label: Localized }>;
  defaults: FlowSettings;
}

export interface MarketConfig {
  gates: MarketGateConfig[];
  payments: string[];
  launchCities: string[];
}

/* ─── Shop profile ─── */

/** Opening hours per day, keys sun…sat. A missing day means closed. */
export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type WorkingHours = Partial<Record<DayKey, { open?: string; close?: string; closed?: boolean }>>;

export interface MarketProfile {
  id?: string;
  shopId: string;
  shopName?: string;
  slug?: string;
  isListedOnMarketplace: boolean;
  listedAt?: string | null;
  isOpen?: boolean;
  isPaused?: boolean;

  publicName: string;
  tagline?: string | null;
  description?: string | null;
  industry?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  galleryUrls?: string[];

  city: string;
  area?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;

  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;

  /** Market section chosen by the owner; empty means it follows the POS business type. */
  gate?: MarketGate | null;
  /** Section the API resolved for this shop (owner's choice or from the business type). */
  resolvedGate?: MarketGate | null;
  /** Sub-filter picked from the POS business type (e.g. bakery inside Food). */
  gateFilter?: string | null;
  subCategories?: string[];
  flowSettings?: FlowSettings | null;
  /** Saved switches merged over the gate defaults, when the API sends them. */
  flow?: FlowSettings | null;
  /** The shop's Nafaa Market sales channel; its orders open in the Online Orders board. */
  integrationId?: string | null;

  workingHours?: WorkingHours | null;
  holidayDates?: string[];

  offersDelivery: boolean;
  offersPickup: boolean;
  offersDineIn?: boolean;
  deliveryFee: number | string;
  freeDeliveryAbove?: number | string | null;
  minOrderAmount: number | string;
  estimatedDeliveryMinutes?: number | null;
  deliveryRadiusKm?: number | null;

  acceptsCod: boolean;
  acceptsCard?: boolean;
  acceptsJazzcash?: boolean;
  acceptsEasypaisa?: boolean;

  ratingAverage?: number;
  ratingCount?: number;
  totalOrders?: number;
  followerCount?: number;
  verificationLevel?: string;
}

/* ─── Products ─── */

export interface MarketProductRow {
  id: string;
  productId: string;
  isListedOnMarketplace: boolean;
  publicName: string;
  publicDescription: string;
  publicPrice: number;
  compareAtPrice: number | null;
  publicImages: string[];
  marketplaceCategory: string | null;
  isAvailable: boolean;
  totalSold: number;
  ratingAverage: number;
  ratingCount: number;
  viewCount: number;
  productName: string;
  productSku?: string | null;
  productUnit?: string | null;
  productPrice: number;
  productStock: number;
}

export interface MarketProductList {
  items: MarketProductRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  counts: { listed: number; unlisted: number; total: number };
}

export interface MarketProductProfile {
  productId: string;
  isListedOnMarketplace: boolean;
  publicName: string;
  publicDescription: string;
  publicPrice: number;
  compareAtPrice: number | null;
  publicImages: string[];
  posImages: string[];
  usingPosImages: boolean;
  marketplaceCategory: string;
  isAvailable: boolean;
  productName: string;
  productPrice: number;
  productStock: number;
  productUnit?: string | null;
}

/* ─── Dashboard and analytics ─── */

export interface MarketRecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  itemCount: number;
  createdAt: string;
  customer?: { fullName?: string | null; phone?: string | null } | null;
  items?: Array<{ productName: string; quantity: number }>;
}

export interface MarketDashboard {
  shop: {
    isListed: boolean; verificationLevel: string; ratingAverage: number; ratingCount: number; followerCount: number;
    viewsToday?: number; views7d?: number; productViewsToday?: number; productViews7d?: number;
  };
  products: { total: number; listed: number; unlisted: number };
  orders: {
    todayCount: number; todayRevenue: number; pendingCount: number; preparingCount: number;
    outForDeliveryCount: number; monthCount: number; monthRevenue: number;
  };
  activity: { unrespondedReviews: number; unreadMessages: number };
  recent: { orders: MarketRecentOrder[] };
}

export type AnalyticsRange = '7d' | '30d' | '90d' | 'year';

export interface MarketAnalytics {
  overview: {
    totalOrders: number; totalRevenue: number; avgOrderValue: number; conversionRate: number;
    totalCustomers: number; returningCustomers: number; activeProducts: number; avgRating: number;
  };
  ordersTrend: Array<{ date: string; count: number; revenue: number }>;
  topProducts: Array<{ productId: string; name: string; imageUrl?: string; totalSold: number; revenue: number }>;
  topCustomers: Array<{ customerId: string; fullName: string; orderCount: number; totalSpent: number }>;
  ordersByStatus: Record<string, number>;
  paymentMethodBreakdown: Record<string, { count: number; total: number }>;
  reviewsBreakdown: Array<{ rating: number; count: number }>;
}

/* ─── Reviews ─── */

export interface MarketReview {
  id: string;
  rating: number;
  title?: string | null;
  comment?: string | null;
  imageUrls: string[];
  isVerifiedPurchase: boolean;
  isHidden: boolean;
  replyFromShop?: string | null;
  createdAt: string;
  customer?: { id: string; fullName?: string | null; avatarUrl?: string | null } | null;
}

export interface MarketReviewList {
  items: MarketReview[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  counts: { total: number; unresponded: number; avgRating: number; byStar?: Record<string, number> };
}

/* ─── Messages ─── */

export interface MarketConversation {
  id: string;
  status: 'OPEN' | 'CLOSED' | string;
  lastMessageAt: string;
  lastMessagePreview?: string | null;
  unreadCount: number;
  customer?: { id: string; fullName?: string | null; phone?: string | null; avatarUrl?: string | null } | null;
}

export interface MarketMessage {
  id: string;
  direction: string;
  senderType: string;
  body: string;
  attachments: string[];
  createdAt: string;
}

/* ─── Delivery ─── */

export type RiderVehicle = 'MOTORBIKE' | 'BICYCLE' | 'CAR' | 'ON_FOOT';
export type RiderStatus = 'OFFLINE' | 'AVAILABLE' | 'ON_DELIVERY' | 'BREAK' | 'SUSPENDED';

export interface MarketRider {
  id: string;
  fullName: string;
  phone: string;
  avatarUrl?: string | null;
  vehicleType: RiderVehicle;
  vehicleNumber?: string | null;
  status: RiderStatus;
  isActive: boolean;
  isVerified: boolean;
  ratingAverage?: number | null;
  totalDeliveries: number;
  completedDeliveries: number;
  lastLocationAt?: string | null;
}

export interface MarketDelivery {
  id: string;
  orderId: string;
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | string;
  assignedAt: string;
  deliveryFee: number | string;
  distanceKm?: number | null;
  rider?: { id: string; fullName: string; phone: string; vehicleType?: string | null } | null;
}

export interface MarketZone {
  id: string;
  name: string;
  description?: string | null;
  baseFee: number | string;
  perKmFee: number | string;
  freeAbove?: number | string | null;
  minOrder: number | string;
  isActive: boolean;
}

export interface DeliveryStats {
  activeRiders: number; availableRiders: number; activeDeliveries: number; todayDelivered: number;
  weekDeliveryRevenue: number; weekRiderCommissions: number;
}

/* ─── Offers ─── */

export type PromoType = 'COUPON' | 'FLASH_SALE' | 'BUNDLE' | 'HAPPY_HOUR' | 'BANNER' | 'BOGO';
export type PromoStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'ARCHIVED';
export type PromoDiscountType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING' | 'BUY_X_GET_Y';

export interface MarketOffer {
  id: string;
  type: PromoType;
  status: PromoStatus;
  scope: string;
  title: string;
  description?: string | null;
  couponCode?: string | null;
  discountType: PromoDiscountType;
  discountValue: number | string;
  maxDiscount?: number | string | null;
  minOrderAmount?: number | string | null;
  usageLimit?: number | null;
  usageCount?: number;
  startsAt: string;
  endsAt: string;
  isFlashSale?: boolean;
}

export interface OfferInput {
  type: PromoType;
  scope: 'SHOP';
  title: string;
  description?: string;
  couponCode?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  startsAt: string;
  endsAt: string;
  isFlashSale?: boolean;
  status?: PromoStatus;
  shopId?: string;
}

/* ─── Market customers ─── */

export interface MarketCustomer {
  customerId: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt?: string | null;
}

/* ─── Seller notifications ─── */

export interface NotificationPrefs {
  channels: Record<string, { push: boolean; email: boolean; sms: boolean }>;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  soundEnabled: boolean;
}

type Paged<T> = { items: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

export const marketApi = {
  config: () => apiClient.get('/marketplace/config').then(unwrap<MarketConfig>),

  profile: {
    get: () => apiClient.get('/shops/current/marketplace-profile').then(unwrap<MarketProfile>),
    update: (data: Partial<MarketProfile>) => apiClient.patch('/shops/current/marketplace-profile', data).then(unwrap<MarketProfile>),
    publish: () => apiClient.post('/shops/current/marketplace-profile/publish').then(unwrap<{ success: boolean }>),
    unpublish: () => apiClient.post('/shops/current/marketplace-profile/unpublish').then(unwrap<{ success: boolean }>),
  },

  products: {
    list: (params: { listed?: 'yes' | 'no'; category?: string; stock?: 'in' | 'out'; photo?: 'none'; search?: string; sortBy?: string; page?: number; limit?: number }) =>
      apiClient.get('/marketplace/products/manage', { params }).then(unwrap<MarketProductList>),
    get: (productId: string) => apiClient.get(`/products/${productId}/marketplace-profile`).then(unwrap<MarketProductProfile>),
    update: (productId: string, data: Partial<MarketProductProfile>) =>
      apiClient.patch(`/products/${productId}/marketplace-profile`, data).then(unwrap<MarketProductProfile>),
    publish: (productId: string) => apiClient.post(`/products/${productId}/marketplace-profile/publish`).then(unwrap<unknown>),
    unpublish: (productId: string) => apiClient.post(`/products/${productId}/marketplace-profile/unpublish`).then(unwrap<unknown>),
    bulkPublish: (productIds: string[]) => apiClient.post('/marketplace/products/manage/bulk-publish', { productIds }).then(unwrap<{ count: number }>),
    bulkUnpublish: (productIds: string[]) => apiClient.post('/marketplace/products/manage/bulk-unpublish', { productIds }).then(unwrap<{ count: number }>),
  },

  dashboard: () => apiClient.get('/marketplace/dashboard').then(unwrap<MarketDashboard>),
  analytics: (range: AnalyticsRange = '30d') => apiClient.get('/marketplace/analytics', { params: { range } }).then(unwrap<MarketAnalytics>),

  reviews: {
    list: (params: { rating?: number; hasReply?: boolean; page?: number; limit?: number }) =>
      apiClient.get('/marketplace/reviews/manage', { params }).then(unwrap<MarketReviewList>),
    reply: (id: string, reply: string) => apiClient.post(`/marketplace/reviews/manage/${id}/reply`, { reply }).then(unwrap<unknown>),
    hide: (id: string) => apiClient.post(`/marketplace/reviews/manage/${id}/hide`).then(unwrap<unknown>),
    report: (id: string, reason: string) => apiClient.post(`/marketplace/reviews/manage/${id}/report`, { reason }).then(unwrap<unknown>),
  },

  messages: {
    list: (params: { status?: string; page?: number; limit?: number }) =>
      apiClient.get('/marketplace/messages', { params }).then(unwrap<Paged<MarketConversation> & { counts: { open: number; closed: number; unread: number } }>),
    get: (id: string) => apiClient.get(`/marketplace/messages/${id}`).then(unwrap<{ conversation: MarketConversation; messages: MarketMessage[] }>),
    reply: (id: string, body: string) => apiClient.post(`/marketplace/messages/${id}/reply`, { body }).then(unwrap<unknown>),
    markRead: (id: string) => apiClient.post(`/marketplace/messages/${id}/mark-read`).then(unwrap<unknown>),
    close: (id: string) => apiClient.post(`/marketplace/messages/${id}/close`).then(unwrap<unknown>),
  },

  delivery: {
    riders: (params: { status?: RiderStatus; search?: string; limit?: number; offset?: number }) =>
      apiClient.get('/delivery/riders', { params }).then(unwrap<{ items: MarketRider[]; total: number; counts: Record<string, number> }>),
    createRider: (data: { fullName: string; phone: string; password: string; vehicleType: RiderVehicle; vehicleNumber?: string; cnic?: string; shopId?: string }) =>
      apiClient.post('/delivery/riders', data).then(unwrap<MarketRider>),
    updateRider: (id: string, data: Partial<{ fullName: string; vehicleType: RiderVehicle; vehicleNumber: string; cnic: string; isActive: boolean; status: RiderStatus }>) =>
      apiClient.patch(`/delivery/riders/${id}`, data).then(unwrap<MarketRider>),
    active: () => apiClient.get('/delivery/active').then(unwrap<MarketDelivery[]>),
    stats: () => apiClient.get('/delivery/stats').then(unwrap<DeliveryStats>),
    zones: () => apiClient.get('/delivery/zones').then(unwrap<MarketZone[]>),
    createZone: (data: { name: string; description?: string; polygonGeoJson: unknown; baseFee: number; perKmFee: number; freeAbove?: number; minOrder?: number; isActive?: boolean; shopId?: string }) =>
      apiClient.post('/delivery/zones', data).then(unwrap<MarketZone>),
    updateZone: (id: string, data: Partial<{ name: string; description: string; polygonGeoJson: unknown; baseFee: number; perKmFee: number; freeAbove: number; minOrder: number; isActive: boolean }>) =>
      apiClient.patch(`/delivery/zones/${id}`, data).then(unwrap<MarketZone>),
    deleteZone: (id: string) => apiClient.delete(`/delivery/zones/${id}`).then(unwrap<unknown>),
  },

  offers: {
    list: (params: { status?: PromoStatus; type?: PromoType; search?: string; limit?: number; offset?: number }) =>
      apiClient.get('/promotions', { params }).then(unwrap<{ items: MarketOffer[]; total: number; counts: Record<string, number> }>),
    create: (data: OfferInput) => apiClient.post('/promotions', data).then(unwrap<MarketOffer>),
    update: (id: string, data: Partial<OfferInput>) => apiClient.patch(`/promotions/${id}`, data).then(unwrap<MarketOffer>),
    remove: (id: string) => apiClient.delete(`/promotions/${id}`).then(unwrap<unknown>),
  },

  customers: (params: { search?: string; page?: number; limit?: number }) =>
    apiClient.get('/marketplace/manage/customers', { params }).then(unwrap<Paged<MarketCustomer> & { phoneMasked?: boolean }>),

  notifications: {
    prefs: () => apiClient.get('/marketplace/manage/notifications/preferences').then(unwrap<NotificationPrefs>),
    savePrefs: (data: Partial<NotificationPrefs>) => apiClient.patch('/marketplace/manage/notifications/preferences', data).then(unwrap<unknown>),
  },
};

/** The server's message for a failed request, else the fallback. */
export function errorText(e: unknown, fallback: string): string {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(m)) return String(m[0] ?? fallback);
  return typeof m === 'string' && m ? m : fallback;
}
