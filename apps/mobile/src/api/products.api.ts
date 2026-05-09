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
  category?: { id: string; name: string; color: string } | null;
}

export interface CreateProductPayload {
  name: string;
  sku?: string;
  barcode?: string;
  unit?: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockAlert?: number;
  categoryId?: string;
}

export interface ListResponse<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const productsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get<ListResponse<Product>>('/products', { params }).then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<Product>(`/products/${id}`).then((r) => r.data),

  byBarcode: (barcode: string) =>
    apiClient.get<Product>(`/products/barcode/${barcode}`).then((r) => r.data),

  create: (payload: CreateProductPayload) =>
    apiClient.post<Product>('/products', payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreateProductPayload>) =>
    apiClient.patch<Product>(`/products/${id}`, payload).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/products/${id}`).then((r) => r.data),

  lowStock: () =>
    apiClient.get<Product[]>('/products/low-stock').then((r) => r.data),
};

export const categoriesApi = {
  list: () => apiClient.get<any[]>('/categories').then((r) => r.data),
  create: (payload: { name: string; color?: string }) =>
    apiClient.post('/categories', payload).then((r) => r.data),
};
