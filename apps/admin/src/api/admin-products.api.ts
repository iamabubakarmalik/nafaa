import { apiClient } from './client';

export interface AdminProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockAlert: number;
  isActive: boolean;
  createdAt: string;
  tenant: { id: string; name: string; slug: string };
  category?: { id: string; name: string; color: string } | null;
}

export interface ProductsStats {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
  totalStockUnits: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const adminProductsApi = {
  stats: () => apiClient.get<{ data: ProductsStats }>('/admin/products/stats').then(unwrap),
  list: (params?: { search?: string; tenantId?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{ data: { items: AdminProduct[]; meta: any } }>('/admin/products', { params })
      .then(unwrap),
};
