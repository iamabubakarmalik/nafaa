import { apiClient } from './client';

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  email?: string | null;
  cnic?: string | null;
  ntn?: string | null;
  address?: string | null;
  city?: string | null;
  area?: string | null;
  logoUrl?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  totalPurchased: number;
  outstandingDue: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPurchaseItem {
  id: string;
  quantity: number;
  costPrice: number;
  total: number;
  product: {
    id: string;
    name: string;
    unit: string;
    sku?: string | null;
  };
}

export interface SupplierPurchase {
  id: string;
  purchaseNumber: string;
  total: number;
  paidAmount: number;
  paymentMethod: string;
  status: string;
  purchasedAt: string;
  items?: SupplierPurchaseItem[];
}

export interface SupplierDetail extends Supplier {
  purchases: SupplierPurchase[];
  _count: { purchases: number };
  stats: {
    totalPurchases: number;
    totalAmount: number;
    totalPaid: number;
    outstanding: number;
    averagePurchase: number;
    daysSinceLastPurchase: number | null;
    lastPurchaseDate: string | null;
  };
  trend30Days: Array<{ date: string; total: number; count: number }>;
  paymentBreakdown: Array<{ paymentMethod: string; total: number; count: number }>;
  topProducts: Array<{
    productId: string;
    product?: {
      id: string;
      name: string;
      sku?: string | null;
      unit: string;
      images?: Array<{ url: string }>;
    };
    quantity: number;
    total: number;
    orderCount: number;
  }>;
}

export interface SuppliersResponse {
  items: Supplier[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface SuppliersSummary {
  totalSuppliers: number;
  activeSuppliers: number;
  suppliersWithDebt: number;
  totalPurchased: number;
  totalOutstanding: number;
  monthPurchases: number;
  monthCount: number;
  monthPaid: number;
  lastMonthPurchases: number;
  growthVsLastMonth: number;
  trend7Days: Array<{ date: string; total: number; count: number }>;
  topSuppliers: Array<{
    supplierId: string;
    supplier?: {
      id: string;
      name: string;
      phone?: string | null;
      logoUrl?: string | null;
      city?: string | null;
      totalPurchased: number;
      outstandingDue: number;
      paymentTerms?: string | null;
    };
    totalSpent: number;
    totalPaid: number;
    outstanding: number;
    orderCount: number;
  }>;
  recentPurchases: Array<{
    id: string;
    purchaseNumber: string;
    total: number;
    paidAmount: number;
    paymentMethod: string;
    purchasedAt: string;
    supplier?: { id: string; name: string; logoUrl?: string | null } | null;
  }>;
  paymentBreakdown: Array<{ paymentMethod: string; total: number; count: number }>;
}

export interface UpsertSupplierPayload {
  name: string;
  contactPerson?: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  cnic?: string;
  ntn?: string;
  address?: string;
  city?: string;
  area?: string;
  logoUrl?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  paymentTerms?: string;
  notes?: string;
  isActive?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const suppliersApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: SuppliersResponse }>('/suppliers', { params }).then(unwrap),

  summary: () =>
    apiClient.get<{ data: SuppliersSummary }>('/suppliers/summary').then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: SupplierDetail }>(`/suppliers/${id}`).then(unwrap),

  create: (payload: UpsertSupplierPayload) =>
    apiClient.post<{ data: Supplier }>('/suppliers', payload).then(unwrap),

  update: (id: string, payload: UpsertSupplierPayload) =>
    apiClient.patch<{ data: Supplier }>(`/suppliers/${id}`, payload).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/suppliers/${id}`).then(unwrap),
};
