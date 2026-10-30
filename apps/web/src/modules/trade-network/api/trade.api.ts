/**
 * Trade network API client: links between businesses, supplier catalogs and
 * carts, network orders, receiving, payments and the shared statement.
 * Shapes follow apps/api/src/modules/trade-network/API.md.
 */

import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export const TRADE_KEY = 'trade-network';

export function tradeError(e: unknown, fallback = 'Kaam nahi hua, dobara koshish karein') {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || err?.message || fallback;
}

export type ID = string;
export type Side = 'BUYER' | 'SELLER';
export type LinkStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'REJECTED' | 'UNLINKED' | 'CANCELLED';
export type TradeStatus = 'BOOKED' | 'APPROVED' | 'INVOICED' | 'LOADED' | 'DELIVERED' | 'PARTIAL' | 'RETURNED' | 'CANCELLED';
export type ReceiveState = 'NONE' | 'PREPARING' | 'NEEDS_MAP' | 'DRAFT' | 'RECEIVING' | 'RECEIVED' | 'NOTHING';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 'CANCELLED';
export type MoneyMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

export interface BusinessCard {
  tenantId: ID; name: string; phone: string | null; city: string | null; area: string | null; address?: string | null; logoUrl: string | null; businessType?: string | null;
}

export interface Overview {
  buyer: { suppliers: number; openOrders: number; toReceive: number; paymentsToConfirm: number };
  seller: { canSell: boolean; access: { enabled: boolean; planAllows: boolean; planName: string | null }; customers: number; requests: number; paymentsToConfirm: number; newOrders: number };
  perms: { buy: boolean; receive: boolean; sell: boolean; links: boolean; payments: boolean };
}

export interface Profile {
  id: ID; tenantId: ID; inviteCode: string; acceptRequests: boolean; listed: boolean; displayName: string | null; phone: string | null;
  city: string | null; area: string | null; categories: string[]; brands: string[]; about: string | null; minOrderValue: number | null; catalogScope: 'ALL' | 'LISTED';
}

export interface SupplierRow {
  id: ID; status: LinkStatus; requestedAt: string; activatedAt: string | null; rejectReason: string | null; autoReceive: boolean;
  seller: BusinessCard | null; supplier: { id: ID; name: string; outstandingDue: number } | null;
  openOrders: number; toReceive: number; paymentsToConfirm: number;
}

export interface CustomerRow {
  id: ID; status: LinkStatus; activatedAt: string | null; closedBy: Side | null; buyer: BusinessCard | null;
  customer: { id: ID; name: string; balance: number; creditLimit: number; creditDays: number | null; priceListId: ID | null; routeId: ID | null; priceListName: string | null; routeName: string | null } | null;
  orders30d: number; value30d: number; paymentsToConfirm: number;
}

export interface IncomingRequest {
  id: ID; status: LinkStatus; requestedVia: string; requestNote: string | null; requestedAt: string; buyer: BusinessCard | null;
  suggestedCustomer: { id: ID; name: string; phone: string | null; balance: number } | null;
}

export interface LinkView {
  id: ID; side: Side; status: LinkStatus; requestedAt: string; decidedAt: string | null; rejectReason: string | null; activatedAt: string | null; closedBy: Side | null;
  other: BusinessCard | null;
  customer?: CustomerRow['customer'] & { isActive: boolean };
  bookedById?: ID | null;
  supplier?: { id: ID; name: string; outstandingDue: number } | null;
  autoReceive?: boolean; receiveShopId?: ID | null;
}

export interface FoundSeller { seller: BusinessCard | null; link: { id: ID; status: LinkStatus } | null }
export interface DirectoryRow { profileId: ID; seller: BusinessCard | null; categories: string[]; brands: string[]; about: string | null; minOrderValue: number | null; link: { id: ID; status: LinkStatus } | null }

export interface Pack { unitId: ID | null; unitName: string; conversionRate: number; price: number; retail: number }
export interface CatalogItem {
  productId: ID; name: string; sku: string | null; barcode: string | null; baseUnit: string; imageUrl: string | null; brandName: string | null; categoryId: ID | null;
  inStock: boolean; packs: Pack[]; schemes: { id: ID; name: string; label: string; minOrderValue: number | null }[];
  mine: { productId: ID; name: string; stock: number; lowStockAlert: number; low: boolean } | null;
}
export interface Catalog {
  link: { id: ID; status: LinkStatus }; seller: BusinessCard | null; minOrderValue: number | null; priceListName: string | null;
  total: number; page: number; limit: number; categories: { id: ID; name: string }[]; items: CatalogItem[];
}
export interface CartLine { productId: ID; variantId?: ID | null; unitId?: ID | null; qty: number }
export interface CartPreview {
  lines: { index: number; productId: ID; unitId: ID | null; unitName: string | null; conversionRate: number; name: string | null; qty: number; baseQty: number; price: number; gross: number; schemeDiscount: number; total: number; schemeNote: string | null; freeBaseQty: number; freeProductName: string | null }[];
  subtotal: number; schemeDiscount: number; total: number; warnings: string[];
}
export interface Suggestion {
  mine: { productId: ID; name: string; stock: number; lowStockAlert: number; unit: string };
  seller: { productId: ID; name: string; baseUnit: string };
  suggest: { unitId: ID | null; unitName: string; conversionRate: number; qty: number; price: number };
}

export interface TradeOrderRow {
  id: ID; linkId: ID; orderNumber: string | null; status: TradeStatus; total: number; invoiceNumber: string | null; invoiceTotal: number | null;
  returnsValue: number; deliveredValue: number | null; cashAtDelivery: number; receiveState: ReceiveState; purchaseId: ID | null; note: string | null;
  itemCount: number; createdAt: string; approvedAt: string | null; invoicedAt: string | null; loadedAt: string | null; deliveredAt: string | null;
  receivedAt: string | null; cancelledAt: string | null; seller?: BusinessCard | null;
}
export interface TradeOrderDetail extends TradeOrderRow {
  sellerStatus: string | null;
  lines: { id: ID; productId: ID; name: string | null; baseUnit: string; unitName: string | null; conversionRate: number; qty: number; baseQty: number; price: number; schemeDiscount: number; total: number; schemeNote: string | null; freeBaseQty: number; freeProductName: string | null; deliveredBaseQty: number | null; deliveredFreeQty: number | null }[];
  totals: { subtotal: number; schemeDiscount: number; discount: number; total: number } | null;
  purchase: { id: ID; purchaseNumber: string; status: string; total: number } | null;
  payments: { id: ID; amount: number; method: string; status: PaymentStatus; source: Side; paidAt: string }[];
}

export interface ReceiveLine {
  sellerProductId: ID; sellerVariantId: ID | null; name: string | null; sku: string | null; barcode: string | null; baseUnit: string;
  baseQty: number; unitCost: number; value: number; free: boolean;
  mine: { productId: ID; name: string; stock: number; matchedBy: string } | null;
}
export interface Receiving {
  waiting: (TradeOrderRow & { purchase: { id: ID; purchaseNumber: string; total: number; status: string } | null; lines: ReceiveLine[] })[];
  recent: TradeOrderRow[];
}
export interface MapChoice { sellerProductId: ID; sellerVariantId?: ID | null; buyerProductId?: ID | null; create?: boolean }

export interface Payment {
  id: ID; linkId: ID; source: Side; status: PaymentStatus; amount: number; method: MoneyMethod; reference: string | null; note: string | null; paidAt: string;
  tradeOrderId: ID | null; disputeReason: string | null; decidedAt: string | null; createdAt: string;
  mine: boolean; postedHere: boolean; postedThere: boolean; canConfirm: boolean; canDispute: boolean; canCancel: boolean;
}

export interface Statement {
  link: { id: ID; side: Side; status: LinkStatus; activatedAt: string | null };
  seller: BusinessCard | null; buyer: BusinessCard | null;
  totals: { delivered: number; returns: number; paid: number; agreedBalance: number; onTheWay: number; pendingFromSeller: number; pendingFromBuyer: number; disputed: number; toReceive: number };
  ownBalance: number | null;
  entries: { at: string; kind: 'INVOICE' | 'RETURN' | 'PAYMENT'; ref: string | null; text: string; debit: number; credit: number; state: string; counts: boolean; balance: number | null; orderId?: ID; paymentId?: ID }[];
}

export interface SellerOptions { priceLists: { id: ID; name: string; isDefault: boolean }[]; routes: { id: ID; name: string; area: string | null }[]; staff: { id: ID; fullName: string; role: string }[] }
export interface Terms { customerId?: ID; priceListId?: ID | null; routeId?: ID | null; creditLimit?: number; creditDays?: number | null; bookedById?: ID }

const g = <T,>(url: string, params?: object) => apiClient.get(url, { params }).then(unwrap<T>);
const p = <T,>(url: string, body?: object) => apiClient.post(url, body ?? {}).then(unwrap<T>);
const put = <T,>(url: string, body?: object) => apiClient.put(url, body ?? {}).then(unwrap<T>);
const patch = <T,>(url: string, body?: object) => apiClient.patch(url, body ?? {}).then(unwrap<T>);

export const tradeApi = {
  overview: () => g<Overview>('/trade-network/overview'),
  // seller profile
  profile: () => g<{ profile: Profile; card: BusinessCard | null; canSell: boolean; access: Overview['seller']['access'] }>('/trade-network/profile'),
  saveProfile: (body: Partial<Profile>) => put<{ profile: Profile; card: BusinessCard | null; canSell: boolean }>('/trade-network/profile', body),
  newCode: () => p<{ profile: Profile }>('/trade-network/profile/new-code'),
  sellerOptions: () => g<SellerOptions>('/trade-network/profile/options'),
  // finding and linking
  find: (q: { code?: string; phone?: string }) => g<FoundSeller[]>('/trade-network/find', q),
  directory: (q: { search?: string; city?: string; category?: string }) => g<{ cities: string[]; sellers: DirectoryRow[] }>('/trade-network/directory', q),
  request: (body: { code?: string; phone?: string; profileId?: string; note?: string }) => p<LinkView>('/trade-network/requests', body),
  incoming: () => g<IncomingRequest[]>('/trade-network/requests/incoming'),
  link: (id: ID) => g<LinkView>(`/trade-network/links/${id}`),
  approve: (id: ID, terms: Terms) => p<LinkView>(`/trade-network/links/${id}/approve`, terms),
  reject: (id: ID, reason?: string) => p<LinkView>(`/trade-network/links/${id}/reject`, { reason }),
  cancelRequest: (id: ID) => p<LinkView>(`/trade-network/links/${id}/cancel`),
  pause: (id: ID) => p<LinkView>(`/trade-network/links/${id}/pause`),
  resume: (id: ID) => p<LinkView>(`/trade-network/links/${id}/resume`),
  unlink: (id: ID) => p<LinkView>(`/trade-network/links/${id}/unlink`),
  terms: (id: ID, terms: Terms) => patch<LinkView>(`/trade-network/links/${id}/terms`, terms),
  buyerSettings: (id: ID, body: { autoReceive?: boolean; receiveShopId?: ID | null }) => patch<LinkView>(`/trade-network/links/${id}/buyer-settings`, body),
  statement: (id: ID) => g<Statement>(`/trade-network/links/${id}/statement`),
  linkOrders: (id: ID) => g<{ id: ID; salesOrderId: ID | null; orderNumber: string | null; status: TradeStatus; total: number; invoiceNumber: string | null; invoiceTotal: number | null; returnsValue: number; receiveState: ReceiveState; createdAt: string; receivedAt: string | null }[]>(`/trade-network/links/${id}/orders`),
  // lists
  customers: (status?: string) => g<CustomerRow[]>('/trade-network/customers', status ? { status } : undefined),
  suppliers: () => g<SupplierRow[]>('/trade-network/suppliers'),
  // buying
  catalog: (linkId: ID, q: { search?: string; categoryId?: string; page?: number; limit?: number }) => g<Catalog>(`/trade-network/suppliers/${linkId}/catalog`, q),
  preview: (linkId: ID, items: CartLine[]) => p<CartPreview>(`/trade-network/suppliers/${linkId}/preview`, { items }),
  suggestions: (linkId: ID) => g<{ items: Suggestion[] }>(`/trade-network/suppliers/${linkId}/suggestions`),
  place: (body: { linkId: ID; items: CartLine[]; note?: string; clientRef?: string }) => p<{ order: TradeOrderDetail; duplicate: boolean; warnings: string[] }>('/trade-network/orders', body),
  orders: (q: { status?: string; linkId?: string; page?: number; limit?: number }) => g<{ total: number; page: number; limit: number; counts: Record<string, number>; orders: TradeOrderRow[] }>('/trade-network/orders', q),
  order: (id: ID) => g<TradeOrderDetail>(`/trade-network/orders/${id}`),
  cancelOrder: (id: ID) => p<TradeOrderDetail>(`/trade-network/orders/${id}/cancel`),
  myProducts: (search: string) => g<{ id: ID; name: string; sku: string | null; barcode: string | null; unit: string; stock: number }[]>('/trade-network/orders/my-products', { search }),
  receiving: () => g<Receiving>('/trade-network/receiving'),
  receive: (id: ID, maps?: MapChoice[]) => p<{ state: ReceiveState; order: TradeOrderDetail }>(`/trade-network/orders/${id}/receive`, { maps }),
  // payments
  payments: (q: { status?: string; linkId?: string }) => g<Payment[]>('/trade-network/payments', q),
  recordPayment: (linkId: ID, body: { amount: number; method?: MoneyMethod; reference?: string; note?: string; tradeOrderId?: ID }) => p<Payment>(`/trade-network/links/${linkId}/payments`, body),
  confirmPayment: (id: ID) => p<Payment>(`/trade-network/payments/${id}/confirm`),
  disputePayment: (id: ID, reason: string) => p<Payment>(`/trade-network/payments/${id}/dispute`, { reason }),
  cancelPayment: (id: ID) => p<Payment>(`/trade-network/payments/${id}/cancel`),
};
