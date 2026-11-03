/**
 * Sports endpoints (same paths and shapes as apps/web/src/industries/sports/api):
 * team orders, the repair desk, the sports details kept next to a product and
 * the dashboard numbers. Orders and repairs need the server; screens show the
 * last saved data offline.
 */

import { apiClient } from '@/core/api/client';
import type { RosterRow, TeamStatus } from '@nafaa/core/industries/sports';

export type { RosterRow, TeamStatus };

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

/* ───────────── team orders ───────────── */

export type TeamView = 'active' | 'quote' | 'production' | 'ready' | 'late' | 'unpaid' | 'done' | 'all';

export interface TeamOrderItem {
  productId: string; variantId?: string; productName: string; quantity: number; unitPrice: number; printingPrice?: number; total: number;
  size?: string; color?: string; customizationNotes?: string;
}

export interface SportsTeamOrder {
  id: string; orderNumber: string; customerId?: string | null; teamName: string; contactPerson: string; contactPhone: string; organization?: string | null; city?: string | null;
  address?: string | null; status: TeamStatus; items: TeamOrderItem[]; totalQuantity: number; subtotal: number; discountPct: number; discountAmount: number; taxAmount: number;
  shippingCharge: number; totalAmount: number; hasCustomJerseys: boolean; customizationDetails?: string | null; playerNames?: RosterRow[] | null; advancePaid: number; balanceAmount: number;
  expectedDeliveryDate?: string | null; poNumber?: string | null; notes?: string | null; internalNotes?: string | null; createdAt: string;
}
export interface TeamOrderDetail extends SportsTeamOrder { sale: { id: string; saleNumber: string } | null; refunded: number }

export interface TeamOrderInput {
  teamName: string; contactPerson: string; contactPhone: string; organization?: string; city?: string; address?: string; poNumber?: string;
  items: Array<Omit<TeamOrderItem, 'total'>>;
  discountPct?: number; shippingCharge?: number; hasCustomJerseys?: boolean; customizationDetails?: string; playerNames?: RosterRow[];
  advancePaid?: number; paymentMethod?: string; expectedDeliveryDate?: string; notes?: string; internalNotes?: string;
}
export interface TeamPage {
  items: SportsTeamOrder[]; total: number; page: number; pages: number; counts: Record<TeamView, number>; totals: { value: number; advance: number; due: number };
}
export interface TeamQuery { view?: TeamView; search?: string; from?: string; to?: string; page?: number; limit?: number }

export const teamOrdersApi = {
  create: (data: TeamOrderInput) => post<SportsTeamOrder>('/sports/team-orders', data),
  page: (params: TeamQuery) => get<TeamPage>('/sports/team-orders/page', params),
  summary: () => get<{ counts?: { draft: number; quoted: number; confirmed: number; inProduction: number; ready: number; delivered: number }; totalPending?: number }>('/sports/team-orders/summary'),
  getOne: (id: string) => get<TeamOrderDetail>(`/sports/team-orders/${id}`),
  update: (id: string, data: Partial<TeamOrderInput>) => patch<SportsTeamOrder>(`/sports/team-orders/${id}`, data),
  updateStatus: (id: string, data: { status: TeamStatus; notes?: string; paidNow?: number; paymentMethod?: string }) => patch<SportsTeamOrder>(`/sports/team-orders/${id}/status`, data),
  recordPayment: (id: string, data: { amount: number; paymentMethod?: string; notes?: string }) => post<SportsTeamOrder>(`/sports/team-orders/${id}/payment`, data),
  refund: (id: string, managerPin?: string) => post<SportsTeamOrder>(`/sports/team-orders/${id}/refund`, { managerPin }),
  cancel: (id: string) => del<SportsTeamOrder>(`/sports/team-orders/${id}`),
};

/* ───────────── repair desk ───────────── */

export type RepairStatus = 'RECEIVED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED';
export type RepairView = 'active' | 'work' | 'ready' | 'late' | 'advance' | 'done' | 'all';

export interface RepairPart { productId: string; variantId?: string; name?: string; quantity: number; price: number }

export interface SportsRepairService {
  id: string; serviceNumber: string; customerId?: string | null; customerName: string; customerPhone: string; itemType: string; itemBrand?: string | null; itemDescription: string;
  issue: string; status: RepairStatus; receivedAt: string; estimatedReadyAt?: string | null; estimatedCost: number; finalCost: number; advancePaid: number; repairType?: string | null;
  workDone?: string | null; partsUsed?: RepairPart[] | null; photosBeforeUrls: string[]; photosAfterUrls: string[]; notes?: string | null;
}
export interface RepairDetail extends SportsRepairService { sale: { id: string; saleNumber: string } | null; refunded: number }

export interface RepairInput {
  customerName: string; customerPhone: string; itemType: string; itemBrand?: string; itemDescription: string; issue: string; repairType?: string;
  estimatedCost?: number; advancePaid?: number; paymentMethod?: string; estimatedReadyAt?: string; photosBeforeUrls?: string[]; notes?: string;
}
export interface RepairPage {
  items: SportsRepairService[]; total: number; page: number; pages: number; counts: Record<RepairView, number>; totals: { value: number; advance: number; due: number };
}
export interface RepairQuery { view?: RepairView; search?: string; from?: string; to?: string; page?: number; limit?: number }

export const repairServicesApi = {
  create: (data: RepairInput) => post<SportsRepairService>('/sports/repair-services', data),
  page: (params: RepairQuery) => get<RepairPage>('/sports/repair-services/page', params),
  summary: () => get<{ received?: number; inProgress?: number; completed?: number }>('/sports/repair-services/summary'),
  getOne: (id: string) => get<RepairDetail>(`/sports/repair-services/${id}`),
  updateStatus: (id: string, data: { status: RepairStatus; workDone?: string; partsUsed?: RepairPart[]; finalCost?: number; photosAfterUrls?: string[]; notes?: string; paidNow?: number; paymentMethod?: string }) =>
    patch<SportsRepairService>(`/sports/repair-services/${id}/status`, data),
  recordPayment: (id: string, amount: number, paymentMethod?: string) => post<SportsRepairService>(`/sports/repair-services/${id}/payment`, { amount, paymentMethod }),
  refund: (id: string, managerPin?: string) => post<SportsRepairService>(`/sports/repair-services/${id}/refund`, { managerPin }),
  cancel: (id: string) => del<SportsRepairService>(`/sports/repair-services/${id}`),
};

/* ───────────── products and dashboard ───────────── */

export interface SportsProductProfile {
  id: string; productId: string; categoryType?: string | null; sport?: string | null; ageGroup: string; genderTarget: string; batWood?: string | null; batWeightGrams?: number | null;
  batGrade?: string | null; batSize?: string | null; handleType?: string | null; ballType?: string | null; ballWeight?: string | null; size?: string | null; material?: string | null;
  fit?: string | null; hasCustomization: boolean; weight?: string | null; isTeamOrderable: boolean; minTeamOrder?: number | null; bulkDiscountPct?: number | null; teamPrice?: number | null;
  warrantyMonths: number; warrantyType?: string | null; mrp?: number | null; isFeatured: boolean; isBestSeller: boolean; isNewArrival: boolean; isProfessional: boolean; careInstructions?: string | null;
}
export interface SportsMeta {
  productId: string; categoryType: string | null; sport: string | null; ageGroup: string; size: string | null; isTeamOrderable: boolean; minTeamOrder: number | null; teamPrice: number | null;
  bulkDiscountPct: number | null; hasCustomization: boolean; mrp: number | null; isNewArrival: boolean; isBestSeller: boolean; isProfessional: boolean; warrantyMonths: number;
}

export const sportsProductsApi = {
  upsert: (data: Record<string, unknown>) => post<SportsProductProfile>('/sports/products', data),
  byProduct: (productId: string) => get<SportsProductProfile | null>(`/sports/products/by-product/${productId}`),
  meta: () => get<{ items: SportsMeta[] }>('/sports/products/meta'),
  splitVariantStock: (productId: string) => post<unknown>(`/sports/products/${productId}/variant-stock-split`),
  syncBrands: () => post<{ brands: number; products: number }>('/sports/products/brands/sync'),
};

export interface SportsOverview { [k: string]: unknown }
export const sportsDashboardApi = {
  overview: () => get<Record<string, any>>('/sports/dashboard/overview'),
  categoryPerformance: () => get<Array<Record<string, any>>>('/sports/dashboard/category-performance'),
};
