import { apiClient } from '@core/api/client';
import type {
  MarketplaceShopProfile,
  MarketplaceProductProfile,
  MarketplaceOrder,
  MarketplaceOrderStatus,
} from './types';

const unwrap = <T>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data);

// ═══════════════════════════════════════════════════════════════
// SHOP PROFILE
// ═══════════════════════════════════════════════════════════════
export const shopProfileApi = {
  get: () => apiClient.get('/shops/current/marketplace-profile').then(unwrap<MarketplaceShopProfile>),

  update: (data: Partial<MarketplaceShopProfile>) =>
    apiClient.patch('/shops/current/marketplace-profile', data).then(unwrap<MarketplaceShopProfile>),

  publish: () =>
    apiClient.post('/shops/current/marketplace-profile/publish').then(unwrap<any>),

  unpublish: () =>
    apiClient.post('/shops/current/marketplace-profile/unpublish').then(unwrap<any>),

  pause: (reason?: string) =>
    apiClient.post('/shops/current/marketplace-profile/pause', { reason }).then(unwrap<any>),

  resume: () =>
    apiClient.post('/shops/current/marketplace-profile/resume').then(unwrap<any>),
};

// ═══════════════════════════════════════════════════════════════
// PRODUCT PUBLISHING
// ═══════════════════════════════════════════════════════════════
export interface ListMktProductsParams {
  isListedOnMarketplace?: boolean;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  bargainEnabled?: boolean;
  groupBuyEnabled?: boolean;
  sortBy?: 'name' | 'listed' | 'price_asc' | 'price_desc' | 'sold' | 'rating';
  page?: number;
  limit?: number;
}

export const productPublishingApi = {
  list: (params: ListMktProductsParams = {}) =>
    apiClient
      .get('/marketplace/products/manage', { params })
      .then(unwrap<{
        items: MarketplaceProductProfile[];
        meta: { page: number; limit: number; total: number; totalPages: number };
        counts: { listed: number; unlisted: number; total: number };
      }>),

  getProfile: (productId: string) =>
    apiClient.get(`/products/${productId}/marketplace-profile`).then(unwrap<MarketplaceProductProfile>),

  updateProfile: (productId: string, data: Partial<MarketplaceProductProfile>) =>
    apiClient.patch(`/products/${productId}/marketplace-profile`, data).then(unwrap<MarketplaceProductProfile>),

  publish: (productId: string) =>
    apiClient.post(`/products/${productId}/marketplace-profile/publish`).then(unwrap<any>),

  unpublish: (productId: string) =>
    apiClient.post(`/products/${productId}/marketplace-profile/unpublish`).then(unwrap<any>),

  bulkPublish: (productIds: string[]) =>
    apiClient.post('/marketplace/products/manage/bulk-publish', { productIds }).then(unwrap<{ count: number }>),

  bulkUnpublish: (productIds: string[]) =>
    apiClient.post('/marketplace/products/manage/bulk-unpublish', { productIds }).then(unwrap<{ count: number }>),
};

// ═══════════════════════════════════════════════════════════════
// ORDERS (incoming customer orders)
// ═══════════════════════════════════════════════════════════════
export interface ListMktOrdersParams {
  status?: MarketplaceOrderStatus[];
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export const ordersApi = {
  list: (params: ListMktOrdersParams = {}) =>
    apiClient
      .get('/marketplace/orders/manage', {
        params: { ...params, status: params.status?.join(',') },
      })
      .then(unwrap<{
        items: MarketplaceOrder[];
        meta: { page: number; limit: number; total: number; totalPages: number };
        counts: Record<string, number>;
      }>),

  getOne: (id: string) =>
    apiClient.get(`/marketplace/orders/manage/${id}`).then(unwrap<MarketplaceOrder>),

  updateStatus: (id: string, status: MarketplaceOrderStatus, note?: string) =>
    apiClient.patch(`/marketplace/orders/manage/${id}/status`, { status, note }).then(unwrap<MarketplaceOrder>),

  accept: (id: string) =>
    apiClient.post(`/marketplace/orders/manage/${id}/accept`).then(unwrap<MarketplaceOrder>),

  reject: (id: string, reason: string) =>
    apiClient.post(`/marketplace/orders/manage/${id}/reject`, { reason }).then(unwrap<MarketplaceOrder>),

  markReady: (id: string) =>
    apiClient.post(`/marketplace/orders/manage/${id}/mark-ready`).then(unwrap<MarketplaceOrder>),

  markDelivered: (id: string) =>
    apiClient.post(`/marketplace/orders/manage/${id}/mark-delivered`).then(unwrap<MarketplaceOrder>),
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD (marketplace KPIs)
// ═══════════════════════════════════════════════════════════════
export interface MarketplaceDashboardData {
  shop: {
    isListed: boolean;
    verificationLevel: string;
    ratingAverage: number;
    ratingCount: number;
    followerCount: number;
  };
  products: {
    total: number;
    listed: number;
    unlisted: number;
  };
  orders: {
    todayCount: number;
    todayRevenue: number;
    pendingCount: number;
    preparingCount: number;
    outForDeliveryCount: number;
    monthCount: number;
    monthRevenue: number;
  };
  activity: {
    unrespondedReviews: number;
    unreadMessages: number;
    activeBargains: number;
    activeGroupBuys: number;
    liveAuctions: number;
    upcomingLiveShows: number;
  };
  recent: {
    orders: MarketplaceOrder[];
  };
}

export const dashboardApi = {
  get: () => apiClient.get('/marketplace/dashboard').then(unwrap<MarketplaceDashboardData>),
};

// ═══════════════════════════════════════════════════════════════
// GROUP BUYS
// ═══════════════════════════════════════════════════════════════
export type GroupBuyStatus = 'DRAFT' | 'ACTIVE' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface GroupBuy {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  originalPrice: number;
  groupPrice: number;
  minParticipants: number;
  maxParticipants?: number;
  currentCount: number;
  status: GroupBuyStatus;
  startsAt: string;
  expiresAt: string;
  reachedTargetAt?: string;
  createdAt: string;
  participantsPreview?: Array<{ id: string; fullName: string; avatarUrl?: string; quantity: number }>;
}

export const groupBuysApi = {
  list: (params: { status?: GroupBuyStatus; page?: number; limit?: number } = {}) =>
    apiClient.get('/marketplace/group-buys/manage', { params }).then(unwrap<{
      items: GroupBuy[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      counts: Record<GroupBuyStatus, number>;
    }>),

  get: (id: string) =>
    apiClient.get(`/marketplace/group-buys/manage/${id}`).then(unwrap<GroupBuy>),

  create: (data: {
    productId: string;
    groupPrice: number;
    minParticipants: number;
    maxParticipants?: number;
    startsAt: string;
    expiresAt: string;
  }) =>
    apiClient.post('/marketplace/group-buys/manage', data).then(unwrap<GroupBuy>),

  cancel: (id: string, reason?: string) =>
    apiClient.post(`/marketplace/group-buys/manage/${id}/cancel`, { reason }).then(unwrap<GroupBuy>),
};

// ═══════════════════════════════════════════════════════════════
// AUCTIONS
// ═══════════════════════════════════════════════════════════════
export type AuctionStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';

export interface Auction {
  id: string;
  productId?: string;
  title: string;
  description?: string;
  imageUrls: string[];
  startPrice: number;
  reservePrice?: number;
  currentPrice: number;
  bidIncrement: number;
  bidCount: number;
  status: AuctionStatus;
  startsAt: string;
  endsAt: string;
  autoExtendOnBid: boolean;
  winnerId?: string;
  winningBidId?: string;
  createdAt: string;
  recentBids?: Array<{
    id: string;
    amount: number;
    customerId: string;
    customer?: { fullName: string; avatarUrl?: string };
    createdAt: string;
  }>;
}

export const auctionsApi = {
  list: (params: { status?: AuctionStatus; page?: number; limit?: number } = {}) =>
    apiClient.get('/marketplace/auctions/manage', { params }).then(unwrap<{
      items: Auction[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      counts: Record<AuctionStatus, number>;
    }>),

  get: (id: string) =>
    apiClient.get(`/marketplace/auctions/manage/${id}`).then(unwrap<Auction>),

  create: (data: {
    productId?: string;
    title: string;
    description?: string;
    imageUrls: string[];
    startPrice: number;
    reservePrice?: number;
    bidIncrement: number;
    startsAt: string;
    endsAt: string;
    autoExtendOnBid?: boolean;
  }) =>
    apiClient.post('/marketplace/auctions/manage', data).then(unwrap<Auction>),

  cancel: (id: string, reason?: string) =>
    apiClient.post(`/marketplace/auctions/manage/${id}/cancel`, { reason }).then(unwrap<Auction>),
};

// ═══════════════════════════════════════════════════════════════
// LIVE SHOP
// ═══════════════════════════════════════════════════════════════
export type LiveShopStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';

export interface LiveShop {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  streamUrl?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  status: LiveShopStatus;
  featuredProductIds: string[];
  peakViewerCount: number;
  totalViewers: number;
  totalMessages: number;
  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
}

export const liveShopApi = {
  list: (params: { status?: LiveShopStatus; page?: number; limit?: number } = {}) =>
    apiClient.get('/marketplace/live-shop/manage', { params }).then(unwrap<{
      items: LiveShop[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      counts: Record<LiveShopStatus, number>;
    }>),

  get: (id: string) =>
    apiClient.get(`/marketplace/live-shop/manage/${id}`).then(unwrap<LiveShop>),

  create: (data: {
    title: string;
    description?: string;
    coverImageUrl?: string;
    scheduledAt?: string;
    featuredProductIds: string[];
  }) =>
    apiClient.post('/marketplace/live-shop/manage', data).then(unwrap<LiveShop>),

  goLive: (id: string, streamUrl: string) =>
    apiClient.post(`/marketplace/live-shop/manage/${id}/go-live`, { streamUrl }).then(unwrap<LiveShop>),

  endLive: (id: string) =>
    apiClient.post(`/marketplace/live-shop/manage/${id}/end`).then(unwrap<LiveShop>),

  cancel: (id: string) =>
    apiClient.post(`/marketplace/live-shop/manage/${id}/cancel`).then(unwrap<LiveShop>),
};

// ═══════════════════════════════════════════════════════════════
// PROMOTIONS
// ═══════════════════════════════════════════════════════════════
export type PromoType = 'COUPON' | 'FLASH_SALE' | 'BUNDLE' | 'HAPPY_HOUR' | 'BANNER' | 'BOGO';
export type PromoStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'ARCHIVED';
export type PromoDiscountType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING' | 'BUY_X_GET_Y';

export interface Promotion {
  id: string;
  type: PromoType;
  status: PromoStatus;
  title: string;
  description?: string;
  imageUrl?: string;
  bannerUrl?: string;
  couponCode?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount: number;
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  startsAt: string;
  endsAt: string;
  isFlashSale: boolean;
  targetProductIds: string[];
  createdAt: string;
}

export const promotionsApi = {
  list: (params: { type?: PromoType; status?: PromoStatus; page?: number; limit?: number } = {}) =>
    apiClient.get('/promotions', { params }).then(unwrap<{
      items: Promotion[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      counts: Record<PromoStatus, number>;
    }>),

  get: (id: string) =>
    apiClient.get(`/promotions/${id}`).then(unwrap<Promotion>),

  create: (data: Partial<Promotion>) =>
    apiClient.post('/promotions', data).then(unwrap<Promotion>),

  update: (id: string, data: Partial<Promotion>) =>
    apiClient.patch(`/promotions/${id}`, data).then(unwrap<Promotion>),

  activate: (id: string) =>
    apiClient.post(`/promotions/${id}/activate`).then(unwrap<Promotion>),

  pause: (id: string) =>
    apiClient.post(`/promotions/${id}/pause`).then(unwrap<Promotion>),

  archive: (id: string) =>
    apiClient.post(`/promotions/${id}/archive`).then(unwrap<Promotion>),

  delete: (id: string) =>
    apiClient.delete(`/promotions/${id}`).then(unwrap<any>),
};

// ═══════════════════════════════════════════════════════════════
// DELIVERY
// ═══════════════════════════════════════════════════════════════
export type RiderStatus = 'OFFLINE' | 'AVAILABLE' | 'ON_DELIVERY' | 'BREAK' | 'SUSPENDED';
export type DeliveryAssignmentStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

export interface Rider {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  vehicleType: string;
  vehicleNumber?: string;
  status: RiderStatus;
  isActive: boolean;
  isVerified: boolean;
  currentLat?: number;
  currentLng?: number;
  ratingAverage: number;
  ratingCount: number;
  totalDeliveries: number;
  completedDeliveries: number;
  totalEarnings: number;
  createdAt: string;
}

export interface DeliveryAssignment {
  id: string;
  orderId: string;
  riderId: string;
  status: DeliveryAssignmentStatus;
  assignedAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  distanceKm?: number;
  estimatedMinutes?: number;
  deliveryFee: number;
  rider?: Rider;
  order?: any;
}

export const deliveryApi = {
  listRiders: (params: { status?: RiderStatus; search?: string; page?: number; limit?: number } = {}) =>
    apiClient.get('/delivery/riders', { params }).then(unwrap<{
      items: Rider[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      counts: Record<string, number>;
    }>),

  getRider: (id: string) =>
    apiClient.get(`/delivery/riders/${id}`).then(unwrap<Rider>),

  createRider: (data: {
    fullName: string;
    phone: string;
    email?: string;
    password: string;
    vehicleType: string;
    vehicleNumber?: string;
  }) =>
    apiClient.post('/delivery/riders', data).then(unwrap<Rider>),

  updateRider: (id: string, data: Partial<Rider>) =>
    apiClient.patch(`/delivery/riders/${id}`, data).then(unwrap<Rider>),

  deleteRider: (id: string) =>
    apiClient.delete(`/delivery/riders/${id}`).then(unwrap<any>),

  listActive: () =>
    apiClient.get('/delivery/active').then(unwrap<DeliveryAssignment[]>),

  assignOrder: (orderId: string, riderId?: string) =>
    apiClient.post('/delivery/assign', { orderId, riderId }).then(unwrap<DeliveryAssignment>),

  stats: () =>
    apiClient.get('/delivery/stats').then(unwrap<{
      activeRiders: number;
      availableRiders: number;
      activeDeliveries: number;
      todayDelivered: number;
      weekDeliveryRevenue: number;
      weekRiderCommissions: number;
    }>),
};

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════
export interface MarketplaceAnalytics {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    conversionRate: number;
    totalCustomers: number;
    returningCustomers: number;
    activeProducts: number;
    avgRating: number;
  };
  ordersTrend: Array<{ date: string; count: number; revenue: number }>;
  topProducts: Array<{
    productId: string;
    name: string;
    imageUrl?: string;
    totalSold: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    fullName: string;
    orderCount: number;
    totalSpent: number;
  }>;
  ordersByStatus: Record<string, number>;
  paymentMethodBreakdown: Record<string, { count: number; total: number }>;
  reviewsBreakdown: { rating: number; count: number }[];
}

export const analyticsApi = {
  get: (range: '7d' | '30d' | '90d' | 'year' = '30d') =>
    apiClient.get('/marketplace/analytics', { params: { range } }).then(unwrap<MarketplaceAnalytics>),
};

// ═══════════════════════════════════════════════════════════════
// REVIEWS (shop-side management)
// ═══════════════════════════════════════════════════════════════
export interface ShopReview {
  id: string;
  customerId: string;
  productId?: string;
  orderId?: string;
  rating: number;
  title?: string;
  comment?: string;
  imageUrls: string[];
  videoUrl?: string;
  replyFromShop?: string;
  repliedAt?: string;
  helpfulCount: number;
  reportedCount: number;
  isVerifiedPurchase: boolean;
  isHidden: boolean;
  createdAt: string;
  customer?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  product?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export const reviewsApi = {
  list: (params: { rating?: number; hasReply?: boolean; productId?: string; page?: number; limit?: number } = {}) =>
    apiClient
      .get('/marketplace/reviews/manage', { params })
      .then(unwrap<{
        items: ShopReview[];
        meta: { page: number; limit: number; total: number; totalPages: number };
        counts: { total: number; unresponded: number; avgRating: number; byStar: Record<number, number> };
      }>),

  reply: (reviewId: string, reply: string) =>
    apiClient.post(`/marketplace/reviews/manage/${reviewId}/reply`, { reply }).then(unwrap<ShopReview>),

  hide: (reviewId: string) =>
    apiClient.post(`/marketplace/reviews/manage/${reviewId}/hide`).then(unwrap<any>),

  report: (reviewId: string, reason: string) =>
    apiClient.post(`/marketplace/reviews/manage/${reviewId}/report`, { reason }).then(unwrap<any>),
};

// ═══════════════════════════════════════════════════════════════
// MESSAGES / CONVERSATIONS
// ═══════════════════════════════════════════════════════════════
export interface Conversation {
  id: string;
  customerId?: string;
  customer?: { id: string; fullName: string; phone: string; avatarUrl?: string };
  channel: string;
  status: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  unreadCount: number;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderType: string;
  body: string;
  attachments: string[];
  channel: string;
  isRead: boolean;
  createdAt: string;
}

export const messagesApi = {
  list: (params: { status?: string; page?: number; limit?: number } = {}) =>
    apiClient.get('/marketplace/messages', { params }).then(unwrap<{
      items: Conversation[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      counts: { open: number; closed: number; unread: number };
    }>),

  get: (id: string) =>
    apiClient.get(`/marketplace/messages/${id}`).then(unwrap<{
      conversation: Conversation;
      messages: ConversationMessage[];
    }>),

  send: (id: string, body: string, attachments: string[] = []) =>
    apiClient.post(`/marketplace/messages/${id}/reply`, { body, attachments }).then(unwrap<ConversationMessage>),

  markRead: (id: string) =>
    apiClient.post(`/marketplace/messages/${id}/mark-read`).then(unwrap<any>),

  close: (id: string) =>
    apiClient.post(`/marketplace/messages/${id}/close`).then(unwrap<any>),
};

// ═══════════════════════════════════════════════════════════════
// BARGAINS
// ═══════════════════════════════════════════════════════════════
export type BargainStatus = 'PENDING' | 'COUNTER_OFFERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

export interface Bargain {
  id: string;
  customerId: string;
  productId: string;
  variantId?: string;
  productName: string;
  originalPrice: number;
  customerOffer: number;
  shopCounterOffer?: number;
  finalPrice?: number;
  quantity: number;
  status: BargainStatus;
  offerCount: number;
  maxOffers: number;
  customerMessage?: string;
  shopMessage?: string;
  expiresAt: string;
  createdAt: string;
  customer?: { id: string; fullName: string; phone: string; avatarUrl?: string };
  productImage?: string;
}

export const bargainsApi = {
  list: (params: { status?: BargainStatus[]; page?: number; limit?: number } = {}) =>
    apiClient
      .get('/marketplace/bargains/manage', {
        params: { ...params, status: params.status?.join(',') },
      })
      .then(unwrap<{
        items: Bargain[];
        meta: { page: number; limit: number; total: number; totalPages: number };
        counts: Record<BargainStatus, number>;
      }>),

  get: (id: string) =>
    apiClient.get(`/marketplace/bargains/manage/${id}`).then(unwrap<Bargain>),

  accept: (id: string) =>
    apiClient.post(`/marketplace/bargains/manage/${id}/accept`).then(unwrap<Bargain>),

  reject: (id: string, reason?: string) =>
    apiClient.post(`/marketplace/bargains/manage/${id}/reject`, { reason }).then(unwrap<Bargain>),

  counter: (id: string, counterOffer: number, message?: string) =>
    apiClient.post(`/marketplace/bargains/manage/${id}/counter`, { counterOffer, message }).then(unwrap<Bargain>),
};

// ═══════════════════════════════════════════════════════════════
// COUPONS ADVANCED (bulk generate, targeted campaigns, analytics)
// ═══════════════════════════════════════════════════════════════
export interface CouponBulkGenerateDto {
  count: number;
  prefix?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  perCustomerLimit?: number;
  usageLimit?: number;
  startsAt: string;
  endsAt: string;
  targetProductIds?: string[];
  targetCategoryIds?: string[];
  targetCustomerIds?: string[];
}

export interface CouponAnalytics {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountGiven: number;
  totalRevenue: number;
  roi: number;
  avgOrderValueWithCoupon: number;
  avgOrderValueWithoutCoupon: number;
  topCoupons: Array<{
    id: string;
    code: string;
    title: string;
    redemptions: number;
    revenue: number;
    discountGiven: number;
  }>;
  redemptionsTrend: Array<{ date: string; count: number; revenue: number }>;
}

export const couponsApi = {
  bulkGenerate: (data: CouponBulkGenerateDto) =>
    apiClient.post('/promotions/bulk-generate', data).then(unwrap<{ count: number; codes: string[] }>),

  exportCsv: (promotionId: string) =>
    apiClient.get(`/promotions/${promotionId}/export-csv`, { responseType: 'blob' }),

  analytics: (range: '7d' | '30d' | '90d' | 'year' = '30d') =>
    apiClient.get('/promotions/analytics', { params: { range } }).then(unwrap<CouponAnalytics>),

  sendToCustomers: (promotionId: string, customerIds: string[], channel: 'PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP') =>
    apiClient.post(`/promotions/${promotionId}/send`, { customerIds, channel }).then(unwrap<{ sent: number }>),

  listRedemptions: (promotionId: string, params: { page?: number; limit?: number } = {}) =>
    apiClient.get(`/promotions/${promotionId}/redemptions`, { params }).then(unwrap<{
      items: Array<{
        id: string;
        customerId: string;
        customer?: { fullName: string; phone: string; avatarUrl?: string };
        orderId?: string;
        discountAmount: number;
        redeemedAt: string;
      }>;
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>),
};

// ═══════════════════════════════════════════════════════════════
// SALES FUNNEL ANALYTICS
// ═══════════════════════════════════════════════════════════════
export interface FunnelData {
  overview: {
    productViews: number;
    uniqueVisitors: number;
    cartsCreated: number;
    checkoutsStarted: number;
    ordersPlaced: number;
    ordersDelivered: number;
    ordersCancelled: number;
    totalRevenue: number;
  };
  conversionRates: {
    viewToCart: number;
    cartToCheckout: number;
    checkoutToOrder: number;
    orderToDelivered: number;
    overallConversion: number;
  };
  dropOffPoints: Array<{
    stage: string;
    entered: number;
    exited: number;
    dropOffRate: number;
  }>;
  topDroppedProducts: Array<{
    productId: string;
    name: string;
    imageUrl?: string;
    views: number;
    addedToCart: number;
    ordered: number;
    dropOffRate: number;
  }>;
  hourlyActivity: Array<{ hour: number; views: number; orders: number }>;
  cohortAnalysis: Array<{
    week: string;
    newCustomers: number;
    returnedWeek1: number;
    returnedWeek2: number;
    returnedWeek4: number;
    retentionRate: number;
  }>;
  paymentFailures: Array<{
    method: string;
    attempts: number;
    failures: number;
    failureRate: number;
  }>;
}

export const funnelApi = {
  get: (range: '7d' | '30d' | '90d' | 'year' = '30d') =>
    apiClient.get('/marketplace/funnel', { params: { range } }).then(unwrap<FunnelData>),
};

// ═══════════════════════════════════════════════════════════════
// CUSTOMER SEGMENTATION
// ═══════════════════════════════════════════════════════════════
export type CustomerSegmentType =
  | 'CHAMPIONS'
  | 'LOYAL'
  | 'POTENTIAL_LOYALIST'
  | 'NEW_CUSTOMERS'
  | 'PROMISING'
  | 'NEEDS_ATTENTION'
  | 'ABOUT_TO_SLEEP'
  | 'AT_RISK'
  | 'HIBERNATING'
  | 'LOST';

export interface CustomerSegment {
  segment: CustomerSegmentType;
  displayName: string;
  description: string;
  color: string;
  count: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgOrdersPerCustomer: number;
}

export interface SegmentedCustomer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  segment: CustomerSegmentType;
  recency: number;
  frequency: number;
  monetary: number;
  lastOrderAt?: string;
  totalOrders: number;
  totalSpent: number;
  currentTier: string;
  loyaltyPoints: number;
  createdAt: string;
}

export const segmentationApi = {
  overview: () =>
    apiClient.get('/marketplace/segments').then(unwrap<{
      segments: CustomerSegment[];
      totalCustomers: number;
      lastComputedAt?: string;
    }>),

  recompute: () =>
    apiClient.post('/marketplace/segments/recompute').then(unwrap<{ totalCustomers: number; segments: number }>),

  customers: (segment: CustomerSegmentType, params: { page?: number; limit?: number; search?: string } = {}) =>
    apiClient.get('/marketplace/segments/customers', {
      params: { segment, ...params },
    }).then(unwrap<{
      items: SegmentedCustomer[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>),

  broadcastToSegment: (data: {
    segment: CustomerSegmentType;
    channel: 'PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP';
    title?: string;
    body: string;
    couponCode?: string;
  }) =>
    apiClient.post('/marketplace/segments/broadcast', data).then(unwrap<{ sent: number }>),

  customerRfmDetails: (customerId: string) =>
    apiClient.get(`/marketplace/segments/customer/${customerId}`).then(unwrap<{
      customer: SegmentedCustomer;
      recentOrders: Array<{ id: string; orderNumber: string; total: number; createdAt: string; status: string }>;
      favoriteCategories: Array<{ category: string; count: number }>;
    }>),
};

// ═══════════════════════════════════════════════════════════════
// LOYALTY & REWARDS
// ═══════════════════════════════════════════════════════════════
export type LoyaltyTierLevel = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface LoyaltyTierConfig {
  id: string;
  level: LoyaltyTierLevel;
  displayName: string;
  minLifetimeSpend: number;
  minOrdersCount: number;
  pointsMultiplier: number;
  cashbackPercent: number;
  freeDeliveryAbove?: number;
  prioritySupport: boolean;
  earlyAccessDrops: boolean;
  birthdayBonusPoints: number;
  exclusiveDeals: boolean;
  badgeColor?: string;
  badgeIcon?: string;
}

export interface LoyaltyOverview {
  tiers: Array<LoyaltyTierConfig & { customerCount: number; totalRevenue: number }>;
  stats: {
    totalCustomers: number;
    totalPointsIssued: number;
    totalPointsRedeemed: number;
    totalCashbackPaid: number;
    activeReferrals: number;
    conversionRate: number;
  };
  topEarners: Array<{
    customerId: string;
    fullName: string;
    avatarUrl?: string;
    tier: LoyaltyTierLevel;
    lifetimePoints: number;
    lifetimeSpend: number;
    lifetimeOrders: number;
  }>;
  pointsActivity: Array<{ date: string; issued: number; redeemed: number }>;
}

export interface LoyaltyCustomerState {
  customerId: string;
  fullName: string;
  phone: string;
  avatarUrl?: string;
  currentTier: LoyaltyTierLevel;
  lifetimeSpend: number;
  lifetimeOrders: number;
  lifetimePoints: number;
  pointsThisYear: number;
  tierAchievedAt?: string;
  nextTier?: LoyaltyTierLevel;
  progressToNext: number;
  amountToNextTier?: number;
}

export const loyaltyApi = {
  overview: () =>
    apiClient.get('/marketplace/loyalty').then(unwrap<LoyaltyOverview>),

  updateTier: (level: LoyaltyTierLevel, data: Partial<LoyaltyTierConfig>) =>
    apiClient.patch(`/marketplace/loyalty/tiers/${level}`, data).then(unwrap<LoyaltyTierConfig>),

  listCustomers: (params: { tier?: LoyaltyTierLevel; search?: string; page?: number; limit?: number } = {}) =>
    apiClient.get('/marketplace/loyalty/customers', { params }).then(unwrap<{
      items: LoyaltyCustomerState[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>),

  awardPoints: (customerId: string, points: number, reason: string) =>
    apiClient.post('/marketplace/loyalty/award-points', { customerId, points, reason }).then(unwrap<any>),

  redeemPoints: (customerId: string, points: number, orderId?: string) =>
    apiClient.post('/marketplace/loyalty/redeem-points', { customerId, points, orderId }).then(unwrap<any>),

  customerHistory: (customerId: string) =>
    apiClient.get(`/marketplace/loyalty/customer/${customerId}/history`).then(unwrap<{
      state: LoyaltyCustomerState;
      transactions: Array<{
        id: string;
        type: 'CREDIT' | 'DEBIT';
        points: number;
        reason: string;
        orderId?: string;
        createdAt: string;
      }>;
    }>),
};

// ═══════════════════════════════════════════════════════════════
// RIDER LIVE TRACKING
// ═══════════════════════════════════════════════════════════════
export interface RiderLocation {
  riderId: string;
  fullName: string;
  avatarUrl?: string;
  phone: string;
  vehicleType: string;
  vehicleNumber?: string;
  status: string;
  currentLat?: number;
  currentLng?: number;
  lastLocationAt?: string;
  activeOrderId?: string;
  activeOrderNumber?: string;
  customerLat?: number;
  customerLng?: number;
  customerAddress?: string;
  distanceKm?: number;
  estimatedMinutes?: number;
}

export interface RiderTrail {
  riderId: string;
  points: Array<{ lat: number; lng: number; speed?: number; recordedAt: string }>;
}

export const trackingApi = {
  liveRiders: () =>
    apiClient.get('/marketplace/tracking/live').then(unwrap<{
      riders: RiderLocation[];
      centerLat: number;
      centerLng: number;
    }>),

  riderTrail: (riderId: string, hours: number = 4) =>
    apiClient.get(`/marketplace/tracking/rider/${riderId}/trail`, { params: { hours } }).then(unwrap<RiderTrail>),

  activeDeliveries: () =>
    apiClient.get('/marketplace/tracking/active-deliveries').then(unwrap<Array<{
      id: string;
      orderId: string;
      orderNumber: string;
      status: string;
      rider: RiderLocation;
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      total: number;
      assignedAt: string;
      pickedUpAt?: string;
      estimatedDeliveryAt?: string;
      distanceKm?: number;
    }>>),
};

// ═══════════════════════════════════════════════════════════════
// AI RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════
export interface DemandForecast {
  productId: string;
  productName: string;
  imageUrl?: string;
  currentStock: number;
  avgDailySales: number;
  forecastNext7Days: number;
  forecastNext30Days: number;
  daysUntilStockout?: number;
  recommendedReorderQty: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

export interface PriceOptimization {
  productId: string;
  productName: string;
  imageUrl?: string;
  currentPrice: number;
  suggestedPrice: number;
  reasoning: string;
  expectedRevenueLift: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CustomerRecommendation {
  customerId: string;
  fullName: string;
  avatarUrl?: string;
  suggestions: Array<{
    productId: string;
    productName: string;
    imageUrl?: string;
    price: number;
    score: number;
    reason: string;
  }>;
}

export interface AiInsight {
  id: string;
  type: 'OPPORTUNITY' | 'WARNING' | 'INFO' | 'CELEBRATION';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actionUrl?: string;
  actionLabel?: string;
  metric?: { value: string; change: number };
}

export const aiApi = {
  insights: () =>
    apiClient.get('/marketplace/ai/insights').then(unwrap<AiInsight[]>),

  demandForecast: () =>
    apiClient.get('/marketplace/ai/demand-forecast').then(unwrap<DemandForecast[]>),

  priceOptimization: () =>
    apiClient.get('/marketplace/ai/price-optimization').then(unwrap<PriceOptimization[]>),

  applyPriceSuggestion: (productId: string, newPrice: number) =>
    apiClient.post('/marketplace/ai/apply-price', { productId, newPrice }).then(unwrap<any>),

  customerRecommendations: (limit: number = 20) =>
    apiClient.get('/marketplace/ai/customer-recommendations', { params: { limit } }).then(unwrap<CustomerRecommendation[]>),

  crossSellSuggestions: (productId: string) =>
    apiClient.get(`/marketplace/ai/cross-sell/${productId}`).then(unwrap<Array<{
      productId: string;
      productName: string;
      imageUrl?: string;
      price: number;
      cooccurrenceScore: number;
    }>>),
};

// ═══════════════════════════════════════════════════════════════
// MULTI-SHOP MANAGER
// ═══════════════════════════════════════════════════════════════
export interface ShopSummary {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  city?: string;
  isListedOnMarketplace: boolean;
  isPaused: boolean;
  verificationLevel: string;
  ratingAverage: number;
  ratingCount: number;
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  activeProducts: number;
}

export interface MultiShopOverview {
  totalShops: number;
  activeShops: number;
  pausedShops: number;
  totalRevenue30d: number;
  totalOrders30d: number;
  shops: ShopSummary[];
  bestPerformer?: { shopId: string; shopName: string; revenue: number };
  needsAttention: Array<{ shopId: string; shopName: string; reason: string; severity: 'high' | 'medium' | 'low' }>;
}

export const multiShopApi = {
  overview: () =>
    apiClient.get('/marketplace/multi-shop/overview').then(unwrap<MultiShopOverview>),

  compareShops: (shopIds: string[], range: '7d' | '30d' | '90d' = '30d') =>
    apiClient.post('/marketplace/multi-shop/compare', { shopIds, range }).then(unwrap<{
      shops: Array<{
        shopId: string;
        shopName: string;
        revenue: number;
        orders: number;
        avgOrderValue: number;
        rating: number;
        conversionRate: number;
        topProduct?: string;
      }>;
      dailyTrend: Array<{ date: string; shopData: Record<string, { revenue: number; orders: number }> }>;
    }>),

  transferProducts: (fromShopId: string, toShopId: string, productIds: string[]) =>
    apiClient.post('/marketplace/multi-shop/transfer-products', { fromShopId, toShopId, productIds }).then(unwrap<{ count: number }>),

  cloneShopSetup: (sourceShopId: string, targetShopId: string, sections: string[]) =>
    apiClient.post('/marketplace/multi-shop/clone-setup', { sourceShopId, targetShopId, sections }).then(unwrap<{ cloned: string[] }>),
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION CENTER
// ═══════════════════════════════════════════════════════════════
export type BizNotificationType =
  | 'NEW_ORDER' | 'ORDER_CANCELLED' | 'REVIEW_RECEIVED' | 'BARGAIN_OFFER'
  | 'LOW_STOCK' | 'PAYMENT_RECEIVED' | 'PAYOUT_PROCESSED' | 'DISPUTE_OPENED'
  | 'MESSAGE_RECEIVED' | 'SUBSCRIPTION_EXPIRING' | 'SYSTEM_ALERT' | 'ACHIEVEMENT';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface BizNotification {
  id: string;
  type: BizNotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  data?: any;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export const notificationsApi = {
  list: (params: { unreadOnly?: boolean; priority?: NotificationPriority; type?: BizNotificationType; page?: number; limit?: number } = {}) =>
    apiClient.get('/marketplace/notifications', { params }).then(unwrap<{
      items: BizNotification[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      counts: { total: number; unread: number; urgent: number; high: number };
    }>),

  markRead: (id: string) =>
    apiClient.post(`/marketplace/notifications/${id}/read`).then(unwrap<any>),

  markAllRead: () =>
    apiClient.post('/marketplace/notifications/read-all').then(unwrap<{ marked: number }>),

  delete: (id: string) =>
    apiClient.delete(`/marketplace/notifications/${id}`).then(unwrap<any>),

  preferences: () =>
    apiClient.get('/marketplace/notifications/preferences').then(unwrap<{
      channels: Record<BizNotificationType, { push: boolean; email: boolean; sms: boolean }>;
      quietHoursEnabled: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
      soundEnabled: boolean;
    }>),

  updatePreferences: (data: any) =>
    apiClient.patch('/marketplace/notifications/preferences', data).then(unwrap<any>),
};

// ═══════════════════════════════════════════════════════════════
// MARKETPLACE SETTINGS HUB
// ═══════════════════════════════════════════════════════════════
export interface MarketplaceSettings {
  integrations: {
    jazzcash: { enabled: boolean; merchantId?: string; isConnected: boolean };
    easypaisa: { enabled: boolean; merchantId?: string; isConnected: boolean };
    stripe: { enabled: boolean; accountId?: string; isConnected: boolean };
    postex: { enabled: boolean; apiKey?: string; isConnected: boolean };
    leopards: { enabled: boolean; apiKey?: string; isConnected: boolean };
    whatsapp: { enabled: boolean; phoneNumberId?: string; isConnected: boolean };
    fbr: { enabled: boolean; ntn?: string; isConnected: boolean };
  };
  taxConfig: {
    enableTax: boolean;
    taxRate: number;
    taxLabel: string;
    taxRegistrationNumber?: string;
    priceIncludesTax: boolean;
  };
  fees: {
    serviceFeePercent: number;
    processingFeeFixed: number;
    riderTipPercent: number;
  };
  policies: {
    returnWindow: number;
    cancellationWindow: number;
    autoAcceptTime: number;
    minOrderAmount: number;
    maxCodOrderAmount: number;
    allowGuestCheckout: boolean;
  };
  webhooks: Array<{
    id: string;
    url: string;
    events: string[];
    isActive: boolean;
    lastFiredAt?: string;
    failureCount: number;
  }>;
  blacklist: {
    customerIds: string[];
    phoneNumbers: string[];
    emails: string[];
    ipAddresses: string[];
  };
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export const settingsHubApi = {
  get: () =>
    apiClient.get('/marketplace/settings-hub').then(unwrap<MarketplaceSettings>),

  updateSection: (section: keyof MarketplaceSettings, data: any) =>
    apiClient.patch(`/marketplace/settings-hub/${section}`, data).then(unwrap<MarketplaceSettings>),

  testIntegration: (provider: string) =>
    apiClient.post(`/marketplace/settings-hub/test-integration/${provider}`).then(unwrap<{ success: boolean; message: string }>),

  createWebhook: (data: { url: string; events: string[] }) =>
    apiClient.post('/marketplace/settings-hub/webhooks', data).then(unwrap<any>),

  deleteWebhook: (id: string) =>
    apiClient.delete(`/marketplace/settings-hub/webhooks/${id}`).then(unwrap<any>),

  testWebhook: (id: string) =>
    apiClient.post(`/marketplace/settings-hub/webhooks/${id}/test`).then(unwrap<{ success: boolean; response?: string }>),

  addToBlacklist: (type: 'customer' | 'phone' | 'email' | 'ip', value: string, reason?: string) =>
    apiClient.post('/marketplace/settings-hub/blacklist', { type, value, reason }).then(unwrap<any>),

  removeFromBlacklist: (type: 'customer' | 'phone' | 'email' | 'ip', value: string) =>
    apiClient.delete('/marketplace/settings-hub/blacklist', { params: { type, value } }).then(unwrap<any>),

  auditLog: (params: { entityType?: string; userId?: string; page?: number; limit?: number } = {}) =>
    apiClient.get('/marketplace/settings-hub/audit-log', { params }).then(unwrap<{
      items: AuditLogEntry[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>),

  exportData: (type: 'orders' | 'customers' | 'products' | 'reviews', format: 'csv' | 'json' = 'csv') =>
    apiClient.get('/marketplace/settings-hub/export', { params: { type, format }, responseType: 'blob' }),
};
