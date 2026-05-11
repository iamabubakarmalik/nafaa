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
}

export interface SupplierPurchase {
  id: string;
  purchaseNumber: string;
  total: number;
  paidAmount: number;
  paymentMethod: string;
  status: string;
  purchasedAt: string;
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
  };
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

export interface ListResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const suppliersApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<ListResponse<Supplier>>('/suppliers', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<SupplierDetail>(`/suppliers/${id}`).then((r) => r.data),

  create: (payload: UpsertSupplierPayload) =>
    apiClient.post<Supplier>('/suppliers', payload).then((r) => r.data),

  update: (id: string, payload: UpsertSupplierPayload) =>
    apiClient.patch<Supplier>(`/suppliers/${id}`, payload).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete<{ message: string }>(`/suppliers/${id}`).then((r) => r.data),
};
