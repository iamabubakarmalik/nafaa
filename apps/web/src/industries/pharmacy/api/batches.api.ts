/**
 * Medicine batches. Batches are a shared inventory feature, so this client
 * wraps the shared `/products/:productId/batches` endpoints and keeps the
 * pharmacy-facing shape (productId inside the payload).
 */
import { productBatchesApi, type ProductBatch as SharedBatch } from '@modules/inventory/products/api/product-batches.api';

export type ProductBatch = SharedBatch;

export interface CreateBatchPayload {
  productId: string;
  variantId?: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity: number;
  costPrice?: number;
  notes?: string;
}

const toBody = ({ productId: _productId, ...rest }: CreateBatchPayload) => ({
  ...rest,
  quantity: Math.max(0, Math.round(Number(rest.quantity) || 0)),
});

export const batchesApi = {
  expiringSoon: (days = 30) => productBatchesApi.expiringSoon(days),

  expired: () => productBatchesApi.expired(),

  listByProduct: (productId: string) => productBatchesApi.list(productId),

  /** Batches with stock left and not yet expired, soonest expiry first. */
  available: async (productId: string, variantId?: string) => {
    const now = Date.now();
    const rows = await productBatchesApi.list(productId);
    return rows
      .filter((b) => b.isActive && b.quantity > 0)
      .filter((b) => !variantId || b.variantId === variantId)
      .filter((b) => !b.expiryDate || new Date(b.expiryDate).getTime() >= now)
      .sort((a, b) => (a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity) - (b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity));
  },

  create: (payload: CreateBatchPayload) => productBatchesApi.create(payload.productId, toBody(payload)),

  update: (id: string, payload: CreateBatchPayload) => productBatchesApi.update(payload.productId, id, toBody(payload)),

  remove: (productId: string, id: string) => productBatchesApi.remove(productId, id),
};
