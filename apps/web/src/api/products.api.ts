import { apiClient } from './client';

export interface Product {
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
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  items: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateProductPayload {
  name: string;
  categoryId?: string;
  sku?: string;
  barcode?: string;
  unit?: string;
  price: number;
  costPrice?: number;
  stock?: number;
  lowStockAlert?: number;
  isActive?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const productsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: ProductsResponse }>('/products', { params }).then(unwrap),

  lowStock: () =>
    apiClient.get<{ data: Product[] }>('/products/low-stock').then(unwrap),

  create: (payload: CreateProductPayload) =>
    apiClient.post<{ data: Product }>('/products', payload).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: { message: string } }>(`/products/${id}`).then(unwrap),

  findByBarcode: (code: string) =>
    apiClient.get<{ data: Product }>(`/products/barcode/${encodeURIComponent(code)}`).then(unwrap),
};
