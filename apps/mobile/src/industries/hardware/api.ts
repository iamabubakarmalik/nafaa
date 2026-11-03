/**
 * Hardware store endpoints (same paths and shapes as
 * apps/web/src/industries/hardware/api): quotations, delivery challans,
 * contractor sites, contractor credit, reorder rules, quantity rates and the
 * item facts. They need the server; screens show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';
import type { Tier } from '@nafaa/core/industries/hardware';

export type { Tier };

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string, params?: object) => apiClient.delete<T>(path, { params }).then((r) => r.data);

/* ── Quotations ── */

export type QuotationStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED' | 'REVISED';
export interface QuotationItem {
  id?: string; productId?: string; itemName: string; itemDescription?: string; brand?: string; specifications?: string; quantity: number; unit: string; unitPrice: number; discount: number; total: number;
}
export interface Quotation {
  id: string; quotationNumber: string; projectId?: string; customerId?: string; customerName: string; customerPhone?: string; customerAddress?: string; status: QuotationStatus;
  quotationDate: string; validUntil: string; convertedSaleId?: string; subtotal: number; discount: number; taxAmount: number; taxPct: number; deliveryCharges: number; laborCharges: number; otherCharges: number;
  total: number; paymentTerms?: string; deliveryTerms?: string; validityDays: number; internalNotes?: string; customerNotes?: string; revisionNumber: number; items: QuotationItem[];
  project?: { id: string; name: string; projectNumber: string } | null; sale?: { id: string; saleNumber: string; status: string } | null; _count?: { items: number }; createdAt: string;
}
export type QuotationTab = 'all' | 'open' | 'accepted' | 'converted' | 'expired' | 'rejected';
export interface QuotationQuery { tab?: QuotationTab; search?: string; from?: string; to?: string; projectId?: string; customerId?: string }
export interface QuotationPage { items: Quotation[]; total: number; page: number; limit: number; counts: Record<QuotationTab, number>; values: { open: number; accepted: number; converted: number } }
export interface QuotationInput {
  projectId?: string; customerId?: string; customerName: string; customerPhone?: string; customerAddress?: string; validityDays?: number; discount?: number; taxPct?: number; deliveryCharges?: number;
  laborCharges?: number; otherCharges?: number; paymentTerms?: string; deliveryTerms?: string; customerNotes?: string; internalNotes?: string;
  items: Array<{ productId?: string; itemName: string; brand?: string; specifications?: string; quantity: number; unit?: string; unitPrice: number; discount?: number }>;
}

export const quotationsApi = {
  create: (data: QuotationInput) => post<Quotation>('/hardware/quotations', data),
  page: (params: QuotationQuery & { page: number; limit: number }) => get<QuotationPage>('/hardware/quotations/page', params),
  summary: () => get<{ totalQuotations: number; acceptedCount: number; acceptedValue: number; pendingCount: number; expiredCount: number }>('/hardware/quotations/summary'),
  getOne: (id: string) => get<Quotation>(`/hardware/quotations/${id}`),
  updateStatus: (id: string, status: QuotationStatus, notes?: string, convertedSaleId?: string) => patch<Quotation>(`/hardware/quotations/${id}/status`, { status, notes, convertedSaleId }),
  revise: (id: string, data: QuotationInput) => post<Quotation>(`/hardware/quotations/${id}/revise`, data),
  close: (id: string) => del<Quotation>(`/hardware/quotations/${id}`),
};

/* ── Delivery challans ── */

export type DeliveryStatus = 'PENDING' | 'SCHEDULED' | 'LOADED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'PARTIALLY_DELIVERED' | 'FAILED' | 'CANCELLED' | 'RETURNED';
export type VehicleType = 'PICKUP' | 'MINI_TRUCK' | 'TRUCK' | 'TRAILER' | 'DUMPER' | 'CRANE' | 'RICKSHAW' | 'MOTORCYCLE' | 'CUSTOMER_PICKUP' | 'OTHER';
export interface DeliveryItem { id?: string; productId?: string; itemName: string; brand?: string; orderedQty: number; loadedQty: number; deliveredQty: number; returnedQty: number; damagedQty: number; unit: string; unitPrice: number; total: number }
export interface Delivery {
  id: string; deliveryNumber: string; saleId?: string; projectId?: string; customerId?: string; customerName: string; customerPhone?: string; deliveryAddress: string; city?: string; area?: string;
  siteContactName?: string; siteContactPhone?: string; status: DeliveryStatus; vehicleType: VehicleType; vehicleNumber?: string; driverName?: string; driverPhone?: string; scheduledDate?: string; scheduledTime?: string;
  deliveredAt?: string; cancellationReason?: string; deliveryCharge: number; loadingCharge: number; unloadingCharge: number; laborCharge: number; tollCharge: number; totalCharges: number;
  receivedByName?: string; driverInstructions?: string; issueReported?: string; items: DeliveryItem[]; project?: { id: string; name: string; projectNumber: string } | null; saleNumber?: string | null; createdAt: string;
}
export type DeliveryTab = 'all' | 'open' | 'today' | 'partial' | 'delivered' | 'cancelled';
export interface DeliveryQuery { tab?: DeliveryTab; search?: string; from?: string; to?: string; saleId?: string; projectId?: string; customerId?: string }
export interface DeliveryPage { items: Delivery[]; total: number; page: number; limit: number; counts: Record<DeliveryTab, number>; charges: number }
export interface BillLine { productId: string; name: string; unit: string; price: number; sold: number; sent: number; remaining: number }
export interface BillForChallan {
  sale: { id: string; saleNumber: string; status: string; shopId?: string | null; soldAt: string; total: number; customerId?: string | null; customer?: { id: string; name: string; phone?: string | null; address?: string | null; city?: string | null; area?: string | null } | null };
  lines: BillLine[]; challanCount: number;
}

export const deliveriesApi = {
  create: (data: Record<string, unknown>) => post<Delivery>('/hardware/deliveries', data),
  page: (params: DeliveryQuery & { page: number; limit: number }) => get<DeliveryPage>('/hardware/deliveries/page', params),
  summary: () => get<{ pending: number; inTransit: number; deliveredCount: number; deliveredRevenue: number; todayScheduled: number }>('/hardware/deliveries/summary'),
  billLines: (saleId: string) => get<BillForChallan>(`/hardware/deliveries/sale/${saleId}`),
  getOne: (id: string) => get<Delivery>(`/hardware/deliveries/${id}`),
  updateStatus: (id: string, status: DeliveryStatus, opts?: { cancellationReason?: string; issueReported?: string }) => patch<Delivery>(`/hardware/deliveries/${id}/status`, { status, ...opts }),
  assignVehicle: (id: string, data: Partial<Pick<Delivery, 'vehicleType' | 'vehicleNumber' | 'driverName' | 'driverPhone' | 'scheduledDate' | 'scheduledTime'>>) => post<Delivery>(`/hardware/deliveries/${id}/assign-vehicle`, data),
  confirmDelivery: (id: string, data: { receivedByName?: string; issueReported?: string; deliveredItems?: Array<{ itemId: string; deliveredQty: number; damagedQty?: number }> }) => post<Delivery>(`/hardware/deliveries/${id}/confirm`, data),
  cancel: (id: string, reason: string) => del<Delivery>(`/hardware/deliveries/${id}`, { reason }),
};

/* ── Sites (projects) ── */

export type ProjectStatus = 'PLANNING' | 'QUOTED' | 'APPROVED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export interface HardwareProject {
  id: string; projectNumber: string; name: string; customerId?: string; customerName: string; customerPhone?: string; contractorName?: string; contractorPhone?: string; siteAddress: string; city?: string; area?: string;
  siteContactPhone?: string; projectType?: string; floors?: number; startDate?: string; expectedEndDate?: string; status: ProjectStatus; estimatedBudget?: number; totalQuoted: number; totalOrdered: number;
  totalDelivered: number; totalPaid: number; totalPending: number; notes?: string; isActive: boolean; quotations?: Quotation[]; deliveries?: Delivery[];
}

export const projectsApi = {
  create: (data: Partial<HardwareProject>) => post<HardwareProject>('/hardware/projects', data),
  list: (params?: { active?: boolean; status?: string; search?: string }) => get<HardwareProject[]>('/hardware/projects', params),
  getOne: (id: string) => get<HardwareProject>(`/hardware/projects/${id}`),
  update: (id: string, data: Partial<HardwareProject>) => patch<HardwareProject>(`/hardware/projects/${id}`, data),
  updateStatus: (id: string, status: string, notes?: string) => patch<HardwareProject>(`/hardware/projects/${id}/status`, { status, notes }),
};

/* ── Contractor credit ── */

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'DEFAULTED' | 'OVERDUE';
export interface CreditAccount {
  id: string; accountNumber: string; customerId?: string; customerName: string; customerPhone?: string; customerCnic?: string; businessName?: string; businessAddress?: string; status: AccountStatus;
  creditLimit: number; creditDays: number; currentBalance: number; totalPurchases: number; totalPayments: number; age0To30Days: number; age31To60Days: number; age61To90Days: number; ageOver90Days: number;
  guarantorName?: string; guarantorPhone?: string; guarantorCnic?: string; chequeSecurity?: string; lastPaymentDate?: string; notes?: string; khataLinked?: boolean;
}

export const creditAccountsApi = {
  create: (data: Partial<CreditAccount>) => post<CreditAccount>('/hardware/credit-accounts', data),
  list: (params?: { search?: string }) => get<CreditAccount[]>('/hardware/credit-accounts', params),
  update: (id: string, data: Partial<CreditAccount>) => patch<CreditAccount>(`/hardware/credit-accounts/${id}`, data),
  suspend: (id: string, reason?: string) => post<CreditAccount>(`/hardware/credit-accounts/${id}/suspend`, { reason }),
  reactivate: (id: string) => post<CreditAccount>(`/hardware/credit-accounts/${id}/reactivate`),
  close: (id: string, reason?: string) => post<CreditAccount>(`/hardware/credit-accounts/${id}/close`, { reason }),
};

/* ── Reorder ── */

export interface ReorderRule {
  id: string; productId: string; minStock: number; reorderPoint: number; reorderQty: number; preferredSupplier?: string; isActive: boolean;
  product?: { id: string; name: string; unit: string; stock: number } | null; currentStock?: number; needsReorder?: boolean; severity?: 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
}

export const reorderRulesApi = {
  upsert: (data: Partial<ReorderRule>) => post<ReorderRule>('/hardware/reorder-rules', data),
  list: (params?: { active?: boolean; needsReorder?: boolean }) => get<ReorderRule[]>('/hardware/reorder-rules', params),
  byProduct: (productId: string) => get<ReorderRule | null>(`/hardware/reorder-rules/by-product/${productId}`),
  remove: (id: string) => del<unknown>(`/hardware/reorder-rules/${id}`),
};

/* ── Quantity rates ── */

export interface BulkPricing { id: string; productId: string; minQuantity: number; maxQuantity?: number; price: number; label?: string; isActive: boolean }
export const bulkPricingApi = {
  all: () => get<Tier[]>('/hardware/bulk-pricing'),
  create: (data: Partial<BulkPricing>) => post<BulkPricing>('/hardware/bulk-pricing', data),
  update: (id: string, data: Partial<BulkPricing>) => patch<BulkPricing>(`/hardware/bulk-pricing/${id}`, data),
  remove: (id: string) => del<unknown>(`/hardware/bulk-pricing/${id}`),
};

/* ── Item profile ── */

export interface HardwareProduct {
  id: string; productId: string; categoryType?: string; unit: string; diameter?: string; grade?: string; gradeStrength?: string; bagWeight?: number; tileSize?: string; finishType?: string; piecesPerBox?: number;
  sqftPerBox?: number; colorCode?: string; colorName?: string; finishSheen?: string; coverage?: number; litersPerCan?: number; wholesalePrice?: number; retailPrice?: number; requiresTruck: boolean; isFastMoving: boolean;
  manufacturingLocation?: string; bulkPricing?: Array<{ id: string; minQuantity: number; maxQuantity?: number | null; price: number; label?: string | null }>;
}
/** The light facts every list and the counter show (size, shade, pack). */
export type HardwareFacts = Pick<HardwareProduct, 'productId' | 'categoryType' | 'unit' | 'grade' | 'diameter' | 'gradeStrength' | 'bagWeight' | 'tileSize' | 'finishType' | 'piecesPerBox' | 'sqftPerBox' | 'colorCode' | 'colorName' | 'finishSheen' | 'coverage' | 'litersPerCan' | 'requiresTruck' | 'isFastMoving' | 'manufacturingLocation'>;

export const hardwareProductsApi = {
  upsert: (data: Partial<HardwareProduct> & { productId: string }) => post<HardwareProduct>('/hardware/products', data),
  facts: () => get<HardwareFacts[]>('/hardware/products/facts'),
  byProduct: (productId: string) => get<HardwareProduct | null>(`/hardware/products/by-product/${productId}`),
};

/* ── Dashboard ── */

export interface HardwareOverview {
  pending?: { quotations: number; deliveries: number; todayDeliveries: number; overdueAccounts: number; lowStockCount: number };
  creditSummary?: { totalOutstanding: number; totalPurchases: number; totalOverdue90Plus: number };
  totals?: { totalBrands: number; totalProducts: number; activeProjects: number; totalCreditAccounts: number };
  activeProjects?: HardwareProject[];
  upcomingDeliveries?: Delivery[];
  topDebtors?: CreditAccount[];
}
export const hardwareDashboardApi = { overview: () => get<HardwareOverview>('/hardware/dashboard/overview') };
