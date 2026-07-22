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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const productVariantsApi = {
  list: (productId: string) =>
    apiClient
      .get<{ data: ProductVariant[] }>(`/products/${productId}/variants`)
      .then(unwrap),
  create: (productId: string, payload: UpsertVariantPayload) =>
    apiClient
      .post<{ data: ProductVariant }>(`/products/${productId}/variants`, payload)
      .then(unwrap),
  bulkCreate: (productId: string, variants: UpsertVariantPayload[]) =>
    apiClient
      .post<{ data: any }>(`/products/${productId}/variants/bulk`, { variants })
      .then(unwrap),
  update: (productId: string, id: string, payload: UpsertVariantPayload) =>
    apiClient
      .patch<{ data: ProductVariant }>(`/products/${productId}/variants/${id}`, payload)
      .then(unwrap),
  remove: (productId: string, id: string) =>
    apiClient
      .delete<{ data: any }>(`/products/${productId}/variants/${id}`)
      .then(unwrap),
};
