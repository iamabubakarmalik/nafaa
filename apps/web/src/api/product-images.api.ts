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

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const productImagesApi = {
  list: (productId: string) =>
    apiClient
      .get<{ data: ProductImage[] }>(`/products/${productId}/images`)
      .then(unwrap),
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
      .post<{ data: ProductImage }>(`/products/${productId}/images`, payload)
      .then(unwrap),
  setPrimary: (productId: string, imageId: string) =>
    apiClient
      .patch<{ data: ProductImage }>(`/products/${productId}/images/${imageId}/primary`)
      .then(unwrap),
  reorder: (productId: string, imageIds: string[]) =>
    apiClient
      .patch<{ data: any }>(`/products/${productId}/images/reorder`, { imageIds })
      .then(unwrap),
  remove: (productId: string, imageId: string) =>
    apiClient
      .delete<{ data: any }>(`/products/${productId}/images/${imageId}`)
      .then(unwrap),
};
