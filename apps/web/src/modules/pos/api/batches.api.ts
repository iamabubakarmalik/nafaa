/** Batches the counter can sell from (branch stock, earliest expiry first). */
import { apiClient } from '@core/api/client';

export interface PosBatch {
  id: string;
  productId: string;
  variantId: string | null;
  batchNumber: string;
  expiryDate: string | null;
  quantity: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const posBatchesApi = {
  /** Products that have batches with stock in the branch. */
  products: (shopId: string) =>
    apiClient.get<{ data: string[] }>('/sales/batches/products', { params: { shopId } }).then(unwrap),
  /** Batches with stock of these products, in the order a sale takes them. */
  list: (shopId: string, productIds: string[]) =>
    apiClient
      .get<{ data: PosBatch[] }>('/sales/batches', { params: { shopId, productIds: productIds.join(',') } })
      .then(unwrap),
};
