/**
 * Nafaa Market admin: overview, shops and approvals, orders monitor,
 * reviews, Market customers, home curation, platform settings, shop
 * settlements and customer support. Server: `/api/admin/market` (area `marketplace`).
 */

import { apiClient } from './client';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const get = <T>(url: string, params?: Record<string, unknown>) => apiClient.get<{ data: T }>(url, { params }).then(unwrap);
const post = <T>(url: string, body?: unknown) => apiClient.post<{ data: T }>(url, body).then(unwrap);
const put = <T>(url: string, body?: unknown) => apiClient.put<{ data: T }>(url, body).then(unwrap);
const patch = <T>(url: string, body?: unknown) => apiClient.patch<{ data: T }>(url, body).then(unwrap);

export type MarketGate = 'FOOD' | 'GROCERY' | 'PHARMACY' | 'SHOPPING' | 'BOOKING' | 'WHOLESALE';
export const MARKET_GATES: MarketGate[] = ['FOOD', 'GROCERY', 'PHARMACY', 'SHOPPING', 'BOOKING', 'WHOLESALE'];
export type Lang3 = { en: string; roman: string; ur: string };
export type ApprovalState = 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_LISTED';
export type VerificationLevel = 'UNVERIFIED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export const VERIFICATION_LEVELS: VerificationLevel[] = ['UNVERIFIED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
export type MarketOrderStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTED' | 'RETURNED';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export const TICKET_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];

export interface ListPage<T> { items: T[]; total: number; page: number; pages: number }
type Q = Record<string, string | number | undefined>;

export interface MarketOverview {
  from: string; to: string;
  totals: { orders: number; delivered: number; cancelled: number; gmv: number; avgOrder: number; cancelRate: number; buyers: number };
  shops: { total: number; listed: number; active: number; paused: number; pending: number; new: number };
  customers: { total: number; new: number; buyers: number };
  byGate: Array<{ gate: MarketGate; label: string; orders: number; gmv: number }>;
  byCity: Array<{ city: string; orders: number; gmv: number }>;
  topShops: Array<{ shopId: string; name: string; city: string | null; gate: MarketGate; orders: number; gmv: number }>;
  stuck: number;
  requireApproval: boolean;
  featuredCount: number;
  daily: Array<{ day: string; orders: number; gmv: number }>;
}

export interface MarketShopRow {
  id: string; shopId: string; tenantId: string; name: string; slug: string; logoUrl: string | null; city: string; area: string | null; industry: string;
  gate: MarketGate; gateSaved: string | null; listed: boolean; listedAt: string | null; isOpen: boolean; isPaused: boolean; pausedReason: string | null;
  verificationLevel: VerificationLevel; verifiedAt: string | null; approval: ApprovalState; featured: boolean;
  rating: number; ratingCount: number; createdAt: string; orders30d: number; gmv30d: number;
  tenant: { id: string; name: string | null; phone: string | null };
}

export interface MarketShopDetail {
  shopId: string; tenantId: string; id: string; name: string; slug: string; tagline: string | null; description: string | null;
  logoUrl: string | null; coverUrl: string | null; galleryUrls: string[]; phone: string | null; whatsapp: string | null; email: string | null;
  address: string; city: string; area: string | null; industry: string; gate: MarketGate; gateSaved: string | null; gateFilter: string | null;
  flow: Record<string, boolean | number | undefined>; subCategories: string[];
  listed: boolean; listedAt: string | null; isOpen: boolean; isPaused: boolean; pausedReason: string | null;
  verificationLevel: VerificationLevel; verifiedAt: string | null; verifiedBy: string | null; approval: ApprovalState;
  review: { status: 'APPROVED' | 'REJECTED'; reason?: string; by: string; at: string } | null; featured: boolean;
  cnicNumber: string | null; businessRegNumber: string | null; taxNumber: string | null; documents: unknown;
  delivery: { offersDelivery: boolean; offersPickup: boolean; radiusKm: number; fee: number; freeAbove: number | null; minOrder: number; etaMinutes: number | null };
  payments: Record<string, boolean>;
  tenant: { id: string; name: string; phone: string | null; businessType: string | null; status: string };
  shop: { id: string; name: string; phone: string | null };
  integration: { id: string; status: string; isActive: boolean } | null;
  stats: { orders: number; delivered: number; cancelled: number; open: number; gmv: number; orders30d: number; gmv30d: number; customers: number };
  reviews: { average: number; count: number; hidden: number; byRating: Array<{ rating: number; count: number }> };
  recentOrders: Array<{ id: string; orderNumber: string; status: MarketOrderStatus; total: number; createdAt: string; customer: string | null }>;
  createdAt: string;
}

export interface MarketOrderRow {
  id: string; orderNumber: string; status: MarketOrderStatus; createdAt: string; subtotal: number; deliveryFee: number; total: number; marketFunded: number;
  paymentMethod: string; paymentStatus: string; deliveryType: string; items: number; sentToShop: boolean; stuck: boolean;
  shop: { shopId: string; name: string; city: string | null }; gate: MarketGate;
  customer: { id: string; name: string; phone: string };
}

export interface MarketOrderDetail {
  id: string; orderNumber: string; status: MarketOrderStatus; createdAt: string; updatedAt: string; deliveryType: string; source: string;
  money: {
    subtotal: number; discount: number; couponCode: string | null; couponDiscount: number; deliveryFee: number; serviceFee: number; tax: number; tip: number;
    walletUsed: number; loyaltyPointsUsed: number; loyaltyDiscount: number; total: number; marketFunded: { loyalty: number; wallet: number } | null;
  };
  payment: { method: string; status: string; ref: string | null; paidAt: string | null };
  address: Record<string, unknown> | null; slot: { start: string; end: string | null } | null;
  estimatedDeliveryAt: string | null; actualDeliveryAt: string | null;
  rider: { name: string; phone: string | null } | null;
  notes: { customer: string | null; shop: string | null };
  cancel: { at: string; by: string | null; reason: string | null } | null;
  attachments: Array<{ kind?: string; url?: string; [k: string]: unknown }>;
  items: Array<{ id: string; productId: string; name: string; variant: string | null; imageUrl: string | null; unitPrice: number; quantity: number; discount: number; total: number; notes: string | null; options: unknown; modifiers: unknown }>;
  history: Array<{ id: string; status: MarketOrderStatus; note: string | null; by: string | null; at: string }>;
  customer: { id: string; fullName: string; phone: string; email: string | null; isBanned: boolean };
  shop: { shopId: string; tenantId: string; name: string; city: string | null; slug: string | null; phone: string | null };
  channel: { id: string; status: string; paymentStatus: string; stage: string | null; receivedAt: string; acceptedAt: string | null; dispatchedAt: string | null; deliveredAt: string | null; cancelledAt: string | null; cancelReason: string | null; courier: string | null; trackingNumber: string | null } | null;
  bill: { id: string; number: string; status: string } | null;
  canCancel: boolean;
}

export interface MarketReviewRow {
  id: string; type: string; rating: number; title: string | null; comment: string | null; imageUrls: string[];
  hidden: boolean; hiddenReason: string | null; moderatedAt: string | null; reply: string | null; verified: boolean; reports: number; orderId: string | null; createdAt: string;
  customer: { id: string; name: string }; shop: { shopId: string; name: string } | null; product: { productId: string; name: string } | null;
}

export interface MarketCustomerRow {
  id: string; name: string; phone: string; email: string | null; city: string | null; blocked: boolean; createdAt: string; lastActiveAt: string | null;
  wallet: number; points: number; orders: number; lastOrderAt: string | null; spent: number;
}

export interface MarketCustomerDetail {
  id: string; name: string; phone: string; phoneVerified: boolean; email: string | null; emailVerified: boolean; language: string; lastKnownCity: string | null;
  wallet: number; loyaltyPoints: number; referralCode: string; isActive: boolean; blocked: boolean; banReason: string | null; bannedAt: string | null;
  authProvider: string; createdAt: string; lastLoginAt: string | null; lastActiveAt: string | null;
  addresses: Array<{ id: string; label: string; addressLine1: string; city: string; phone: string }>;
  stats: { orders: number; delivered: number; cancelled: number; spent: number; reviews: number };
  orders: Array<{ id: string; orderNumber: string; status: MarketOrderStatus; total: number; createdAt: string; shop: string }>;
  tickets: Array<{ id: string; ticketNumber: string; subject: string; status: TicketStatus; createdAt: string }>;
}

export interface HomeBanner { id: string; image: string; title: string; link: string; gate?: MarketGate; city?: string; active: boolean; startsAt?: string; endsAt?: string }
export interface HomeSection { id: string; title: Lang3; type: 'shops' | 'products'; gate?: MarketGate; shopIds?: string[]; productIds?: string[] }
export interface GateInfo { id: MarketGate; label: Lang3; tagline: Lang3; mode: string; businessOnly: boolean }
export interface MarketHome {
  banners: HomeBanner[]; featuredShopIds: string[]; sections: HomeSection[]; updatedAt: string | null;
  shops: Array<{ shopId: string; name: string; city: string; logoUrl: string | null; listed: boolean }>;
  products: Array<{ productId: string; name: string; imageUrl: string | null; shop: string }>;
  gates: GateInfo[];
}
export interface ProductPick { productId: string; name: string; imageUrl: string | null; price: number; shop: string }

export interface MarketPlatformConfig {
  gates: MarketGate[];
  labels: Partial<Record<MarketGate, Partial<Lang3>>>;
  launchCities: string[];
  commissionPercent: number;
  payments: { cod: boolean; jazzcash: boolean; easypaisa: boolean; card: boolean; bankTransfer: boolean };
  requireApproval: boolean;
  walletSpend: boolean;
  loyaltySpend: boolean;
}
export interface MarketSettings {
  config: MarketPlatformConfig; defaults: MarketPlatformConfig; gates: GateInfo[];
  shopCities: Array<{ city: string; shops: number }>; updatedAt: string | null; approvedExisting?: number;
}

export interface SettlementRow {
  shopId: string; name: string; city: string | null; orders: number; subtotal: number; deliveryFees: number; coupons: number; collected: number;
  wallet: number; loyalty: number; commission: number; marketFunded: number; net: number;
}
export interface SettlementsPage extends ListPage<SettlementRow> {
  from: string; to: string; commissionPercent: number;
  totals: { shops: number; orders: number; subtotal: number; deliveryFees: number; collected: number; commission: number; marketFunded: number; net: number };
}

export interface TicketRow {
  id: string; ticketNumber: string; subject: string; category: string; priority: string; status: TicketStatus; orderId: string | null; shopId: string | null;
  createdAt: string; updatedAt: string; messages: number; last: { text: string; from: string; at: string } | null;
  customer: { id: string; name: string; phone: string };
}
export interface TicketDetail {
  id: string; ticketNumber: string; subject: string; category: string; priority: string; status: TicketStatus; assignedTo: string | null; rating: number | null;
  createdAt: string; updatedAt: string; resolvedAt: string | null; closedAt: string | null;
  customer: { id: string; name: string; phone: string; email: string | null };
  order: { id: string; orderNumber: string; status: MarketOrderStatus; total: number } | null;
  shop: { shopId: string; name: string; city: string } | null;
  messages: Array<{ id: string; from: string; text: string; attachments: string[]; internal: boolean; at: string }>;
}

export const adminMarketApi = {
  overview: (from: string, to: string) => get<MarketOverview>('/admin/market/overview', { from, to }),

  shops: (q: Q) => get<ListPage<MarketShopRow>>('/admin/market/shops', q),
  shop: (shopId: string) => get<MarketShopDetail>(`/admin/market/shops/${shopId}`),
  updateShop: (shopId: string, body: { gate?: MarketGate | null; isPaused?: boolean; pausedReason?: string; verificationLevel?: VerificationLevel; featured?: boolean }) =>
    patch<MarketShopDetail>(`/admin/market/shops/${shopId}`, body),
  approveShop: (shopId: string) => post<MarketShopDetail>(`/admin/market/shops/${shopId}/approve`),
  rejectShop: (shopId: string, reason: string) => post<MarketShopDetail>(`/admin/market/shops/${shopId}/reject`, { reason }),

  orders: (q: Q) => get<ListPage<MarketOrderRow>>('/admin/market/orders', q),
  order: (id: string) => get<MarketOrderDetail>(`/admin/market/orders/${id}`),
  cancelOrder: (id: string, reason: string) => post<MarketOrderDetail>(`/admin/market/orders/${id}/cancel`, { reason }),

  reviews: (q: Q) => get<ListPage<MarketReviewRow> & { summary: { hidden: number; low: number; reported: number } }>('/admin/market/reviews', q),
  setReviewHidden: (id: string, hidden: boolean, reason?: string) => patch<{ id: string; hidden: boolean }>(`/admin/market/reviews/${id}`, { hidden, reason }),

  customers: (q: Q) => get<ListPage<MarketCustomerRow> & { summary: { total: number; blocked: number } }>('/admin/market/customers', q),
  customer: (id: string) => get<MarketCustomerDetail>(`/admin/market/customers/${id}`),
  setCustomerBlocked: (id: string, blocked: boolean, reason?: string) => patch<MarketCustomerDetail>(`/admin/market/customers/${id}`, { blocked, reason }),

  home: () => get<MarketHome>('/admin/market/home'),
  saveHome: (body: { banners: HomeBanner[]; featuredShopIds: string[]; sections: HomeSection[] }) => put<MarketHome>('/admin/market/home', body),
  searchProducts: (search: string) => get<ProductPick[]>('/admin/market/home/products', { search }),

  settings: () => get<MarketSettings>('/admin/market/settings'),
  saveSettings: (body: MarketPlatformConfig) => put<MarketSettings>('/admin/market/settings', body),

  settlements: (q: Q) => get<SettlementsPage>('/admin/market/settlements', q),

  tickets: (q: Q) => get<ListPage<TicketRow> & { summary: { open: number; inProgress: number; waiting: number; resolved: number } }>('/admin/market/support', q),
  ticket: (id: string) => get<TicketDetail>(`/admin/market/support/${id}`),
  replyTicket: (id: string, text: string, internal = false) => post<TicketDetail>(`/admin/market/support/${id}/reply`, { text, internal }),
  updateTicket: (id: string, body: { status?: TicketStatus; priority?: string }) => patch<TicketDetail>(`/admin/market/support/${id}`, body),
};
