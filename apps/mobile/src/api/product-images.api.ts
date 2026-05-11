import { apiClient } from './client';

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  thumbnail?: string | null;
  alt?: string | null;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
}

export const productImagesApi = {
  list: (productId: string) =>
    apiClient.get<ProductImage[]>(`/products/${productId}/images`).then((r) => r.data),
  add: (
    productId: string,
    payload: {
      url: string;
      thumbnail?: string;
      alt?: string;
      isPrimary?: boolean;
      sortOrder?: number;
      uploadId?: string;
    },
  ) =>
    apiClient
      .post<ProductImage>(`/products/${productId}/images`, payload)
      .then((r) => r.data),
  setPrimary: (productId: string, imageId: string) =>
    apiClient
      .patch<ProductImage>(`/products/${productId}/images/${imageId}/primary`)
      .then((r) => r.data),
  reorder: (productId: string, imageIds: string[]) =>
    apiClient
      .patch(`/products/${productId}/images/reorder`, { imageIds })
      .then((r) => r.data),
  remove: (productId: string, imageId: string) =>
    apiClient
      .delete(`/products/${productId}/images/${imageId}`)
      .then((r) => r.data),
};
