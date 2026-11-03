/**
 * Florist endpoints (same paths and shapes as apps/web/src/industries/florist/api):
 * delivery orders, wedding contracts, subscriptions, product profiles and the
 * dashboard overview. They need the server; screens show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';
import type { DeliverySlot, OrderStatus, OrderType } from '@nafaa/core/industries/florist';

export type { DeliverySlot, OrderStatus, OrderType };
export type FloristCategoryType = string;
export type FreshnessGrade = 'A_PREMIUM' | 'B_STANDARD' | 'C_ECONOMY' | 'IMPORTED' | 'LOCAL';

export interface FloristOrder {
  id: string; orderNumber: string; orderType: OrderType; customerId?: string; customerName: string; customerPhone: string;
  senderName?: string; recipientName?: string; recipientPhone?: string; deliveryAddress?: string; city?: string; area?: string; landmark?: string;
  messageCard?: string; isAnonymous: boolean;
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; total: number; customization?: string }>;
  subtotal: number; discountAmount: number; deliveryCharge: number; wrappingCharge: number; totalAmount: number; advancePaid: number;
  deliveryTimeSlot?: DeliverySlot; scheduledDeliveryDate?: string; scheduledDeliveryTime?: string; actualDeliveryTime?: string; deliveredBy?: string; deliveredToName?: string;
  eventDate?: string; eventName?: string; eventVenue?: string; status: OrderStatus; notes?: string; specialInstructions?: string; createdAt: string;
}
export interface OrdersPage {
  items: FloristOrder[]; total: number; page: number; pages: number; limit: number; totals: { value: number; received: number; delivery: number };
  counts: Partial<Record<OrderStatus, number>>;
}
interface Bucket { key: string; count: number; value: number }
export interface OrdersAnalytics { orders: number; value: number; delivered: number; deliveryCharges: number; byDay: Bucket[]; bySlot: Bucket[]; byArea: Bucket[]; byType: Bucket[] }

export interface WeddingContract {
  id: string; contractNumber: string; brideName: string; groomName: string; contactPerson: string; contactPhone: string; contactEmail?: string | null;
  weddingDate: string; ceremonyVenue?: string | null; receptionVenue?: string | null; city?: string | null;
  includesBridalBouquet: boolean; includesBridesmaidBouquets: boolean; bridesmaidCount: number; includesBoutonnieres: boolean; boutonniereCount: number;
  includesGarlands: boolean; garlandCount: number; includesCarDecoration: boolean; includesStageDecoration: boolean; includesMehndiSetup: boolean;
  includesTableCentrepieces: boolean; centrepieceCount: number; colorTheme: string[]; primaryFlowers: string[]; styleInspiration?: string | null;
  quotedAmount: number; advanceAmount: number; balanceAmount: number; finalAmount: number; siteVisitDate?: string | null; status: string; notes?: string | null;
}
export interface WeddingInput {
  brideName: string; groomName: string; contactPerson: string; contactPhone: string; contactEmail?: string; weddingDate: string; ceremonyVenue?: string; receptionVenue?: string; city?: string;
  includesBridalBouquet?: boolean; includesBridesmaidBouquets?: boolean; bridesmaidCount?: number; includesBoutonnieres?: boolean; boutonniereCount?: number;
  includesGarlands?: boolean; garlandCount?: number; includesCarDecoration?: boolean; includesStageDecoration?: boolean; includesMehndiSetup?: boolean;
  includesTableCentrepieces?: boolean; centrepieceCount?: number; colorTheme?: string[]; primaryFlowers?: string[]; styleInspiration?: string;
  quotedAmount: number; advanceAmount?: number; advancePaymentMethod?: string; siteVisitDate?: string | null; notes?: string;
}
export interface WeddingPage { items: WeddingContract[]; total: number; page: number; pages: number; limit: number; totals: { quoted: number; received: number; due: number }; counts: Record<string, number> }

export type SubStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type SubFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export interface Subscription {
  id: string; subscriptionNumber: string; customerId?: string | null; customerName: string; customerPhone: string; deliveryAddress: string; planName: string;
  frequency: SubFrequency; bouquetType: string; pricePerDelivery: number; startDate: string; endDate?: string | null; nextDeliveryDate?: string | null;
  completedDeliveries: number; status: SubStatus; notes?: string | null;
}
export interface SubscriptionInput {
  customerId?: string; customerName: string; customerPhone: string; deliveryAddress: string; planName: string; frequency: SubFrequency; bouquetType: string;
  pricePerDelivery: number; startDate: string; endDate?: string; notes?: string;
}
export interface SubscriptionPage { items: Subscription[]; total: number; page: number; pages: number; limit: number; due: number; perRound: number; counts: Partial<Record<SubStatus, number>> }

export interface FloristProfile {
  id: string; productId: string; categoryType?: FloristCategoryType; freshnessGrade: FreshnessGrade; flowerType?: string; color?: string; stemLengthCm?: number; isImported: boolean; origin?: string;
  arrivalDate?: string; freshUntil?: string; daysToWither?: number; isPreArranged: boolean; bouquetSize?: string; stemCount?: number; wrapType?: string; occasions: string[];
  careInstructions?: string; isCustomizable: boolean; minLeadTimeHours?: number; weddingPrice?: number;
}
export interface FreshnessRow extends FloristProfile { product: { id: string; name: string; unit: string; stock: number; costPrice: number; price: number } | null }
export interface FreshnessAlerts { witheringToday: FreshnessRow[]; witheringSoon: FreshnessRow[]; witheringLater: FreshnessRow[] }

export interface FloristOverview {
  totals?: { activeOrders?: number; deliveredToday?: number; activeSubscriptions?: number; upcomingWeddings?: number; witheringSoon?: number };
  monthly?: { orders?: { count?: number; revenue?: number | string }; weddings?: { count?: number; revenue?: number | string; collected?: number | string } };
  todayScheduledDeliveries?: FloristOrder[]; upcomingWeddingList?: WeddingContract[]; dueSubscriptions?: Subscription[]; witheringProducts?: Array<FloristProfile & { product?: { name?: string } }>;
}

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);

export const floristOrdersApi = {
  /** Orders of the given counter bills (comma separated bill numbers), for the sales history. */
  byBills: (bills: string[]) => get<FloristOrder[]>('/florist/orders', { bills: bills.join(',') }),
  fromSale: (data: Record<string, unknown>) => post<FloristOrder>('/florist/orders/from-sale', data),
  paged: (params: { status?: string; orderType?: string; scheduledDate?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) => get<OrdersPage>('/florist/orders/paged', params),
  analytics: (params: { from?: string; to?: string }) => get<OrdersAnalytics>('/florist/orders/analytics', params),
  updateStatus: (id: string, data: { status: OrderStatus; notes?: string }) => patch<FloristOrder>(`/florist/orders/${id}/status`, data),
  confirmDelivery: (id: string, data: { deliveredBy?: string; deliveredToName?: string; deliveryPhotoUrl?: string }) => post<FloristOrder>(`/florist/orders/${id}/confirm-delivery`, data),
  remove: (id: string) => apiClient.delete(`/florist/orders/${id}`).then((r) => r.data),
};

export const weddingContractsApi = {
  paged: (params: { status?: string; search?: string; from?: string; to?: string; upcoming?: boolean; page?: number; limit?: number }) => get<WeddingPage>('/florist/wedding-contracts/paged', params),
  create: (data: WeddingInput) => post<WeddingContract>('/florist/wedding-contracts', data),
  update: (id: string, data: Partial<WeddingInput>) => patch<WeddingContract>(`/florist/wedding-contracts/${id}`, data),
  updateStatus: (id: string, data: { status: string; notes?: string; materials?: Array<{ productId: string; quantity: number }> }) =>
    patch<WeddingContract & { sale?: { id: string; saleNumber: string } }>(`/florist/wedding-contracts/${id}/status`, data),
  recordPayment: (id: string, data: { amount: number; paymentMethod: string; notes?: string }) => post<WeddingContract>(`/florist/wedding-contracts/${id}/payment`, data),
  cancel: (id: string) => apiClient.delete<WeddingContract>(`/florist/wedding-contracts/${id}`).then((r) => r.data),
};

export const floristSubscriptionsApi = {
  paged: (params: { status?: string; search?: string; due?: boolean; page?: number; limit?: number }) => get<SubscriptionPage>('/florist/subscriptions/paged', params),
  create: (data: SubscriptionInput) => post<Subscription>('/florist/subscriptions', data),
  update: (id: string, data: Partial<SubscriptionInput>) => patch<Subscription>(`/florist/subscriptions/${id}`, data),
  markDelivered: (id: string) => post<Subscription & { sale: { id: string; saleNumber: string } | null }>(`/florist/subscriptions/${id}/mark-delivered`),
  pause: (id: string) => post<Subscription>(`/florist/subscriptions/${id}/pause`),
  resume: (id: string) => post<Subscription>(`/florist/subscriptions/${id}/resume`),
  cancel: (id: string) => post<Subscription>(`/florist/subscriptions/${id}/cancel`),
};

export const floristProductsApi = {
  upsert: (data: Record<string, unknown>) => post<FloristProfile>('/florist/products', data),
  list: () => get<FloristProfile[]>('/florist/products'),
  byProduct: (productId: string) => get<FloristProfile | null>(`/florist/products/by-product/${productId}`),
  freshnessAlerts: () => get<FreshnessAlerts>('/florist/products/freshness-alerts'),
};

export const floristDashboardApi = { overview: () => get<FloristOverview>('/florist/dashboard/overview') };
