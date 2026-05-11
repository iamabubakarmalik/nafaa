import { apiClient } from './client';

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  color?: string | null;
  colorHex?: string | null;
  size?: string | null;
  weight?: number | null;
  unit?: string | null;
  price: number;
  costPrice: number;
  wholesalePrice?: number | null;
  stock: number;
  lowStockAlert: number;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface UpsertVariantPayload {
  name: string;
  sku?: string;
  barcode?: string;
  color?: string;
  colorHex?: string;
  size?: string;
  weight?: number;
  unit?: string;
  price: number;
  costPrice?: number;
  wholesalePrice?: number;
  stock?: number;
  lowStockAlert?: number;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export const productVariantsApi = {
  list: (productId: string) =>
    apiClient
      .get<ProductVariant[]>(`/products/${productId}/variants`)
      .then((r) => r.data),
  create: (productId: string, payload: UpsertVariantPayload) =>
    apiClient
      .post<ProductVariant>(`/products/${productId}/variants`, payload)
      .then((r) => r.data),
  bulkCreate: (productId: string, variants: UpsertVariantPayload[]) =>
    apiClient
      .post(`/products/${productId}/variants/bulk`, { variants })
      .then((r) => r.data),
  update: (productId: string, id: string, payload: UpsertVariantPayload) =>
    apiClient
      .patch<ProductVariant>(`/products/${productId}/variants/${id}`, payload)
      .then((r) => r.data),
  remove: (productId: string, id: string) =>
    apiClient.delete(`/products/${productId}/variants/${id}`).then((r) => r.data),
};
