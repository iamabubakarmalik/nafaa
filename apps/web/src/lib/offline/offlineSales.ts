import { db, type PendingSale } from './db';
import { salesApi, type CreateSalePayload, type Sale } from '@/api/sales.api';
import { queuePendingSale } from './syncEngine';
import { offlineProductsApi } from './offlineProducts';

/**
 * Offline-first sales creation.
 *
 * Strategy:
 * - If online: send to server, get real saleNumber
 * - If offline: save locally with temp ID, queue for sync, decrement stock in cache
 */
export const offlineSalesApi = {
  /**
   * Create sale (online or offline)
   */
  create: async (payload: CreateSalePayload): Promise<Sale | PendingSale> => {
    // Calculate snapshot for offline display
    const subtotal = payload.items.reduce(
      (sum, item) => sum + (item.priceOverride || 0) * item.quantity,
      0,
    );
    const lineDiscount = payload.items.reduce(
      (sum, item) => sum + (item.lineDiscount || 0),
      0,
    );
    const total = Math.max(subtotal - lineDiscount - (payload.discount || 0), 0);

    if (navigator.onLine) {
      try {
        const sale = await salesApi.create(payload);

        // Decrement local stock cache to keep UI in sync
        for (const item of payload.items) {
          await offlineProductsApi.decrementStock(item.productId, item.quantity);
        }

        return sale;
      } catch (error) {
        console.warn('[offlineSales] Online create failed, queuing offline:', error);
        // Fall through to offline mode
      }
    }

    // ─── OFFLINE MODE ─────────────────────────────────────
    const localId = `local_sale_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const pendingSale: PendingSale = {
      id: localId,
      shopId: payload.shopId,
      customerId: payload.customerId,
      paymentMethod: payload.paymentMethod as any,
      paidAmount: payload.paidAmount,
      discount: payload.discount || 0,
      items: payload.items,
      total,
      subtotal,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    await queuePendingSale(pendingSale);

    // Decrement local stock so UI is correct
    for (const item of payload.items) {
      await offlineProductsApi.decrementStock(item.productId, item.quantity);
    }

    return pendingSale;
  },

  /**
   * Get sale by ID (checks local first, then server)
   */
  getOne: async (id: string): Promise<Sale | PendingSale | null> => {
    // Check if it's a local pending sale
    if (id.startsWith('local_sale_')) {
      const local = await db.pendingSales.get(id);
      return local || null;
    }

    if (navigator.onLine) {
      try {
        return await salesApi.getOne(id);
      } catch {
        return null;
      }
    }

    return null;
  },

  /**
   * Get pending sales (for showing "X sales waiting to sync")
   */
  getPending: async (): Promise<PendingSale[]> => {
    return db.pendingSales
      .where('status')
      .anyOf('pending', 'failed', 'syncing')
      .reverse()
      .sortBy('createdAt');
  },

  /**
   * Get pending count
   */
  getPendingCount: async (): Promise<number> => {
    return db.pendingSales.where('status').anyOf('pending', 'failed').count();
  },
};

/**
 * Helper: convert PendingSale to Sale-like shape for receipt display
 */
export function pendingSaleToDisplay(pending: PendingSale): Partial<Sale> {
  return {
    id: pending.id,
    saleNumber: pending.serverSaleNumber || `OFFLINE-${pending.id.slice(-8).toUpperCase()}`,
    subtotal: pending.subtotal,
    discount: pending.discount,
    total: pending.total,
    paidAmount: pending.paidAmount,
    changeAmount: Math.max(pending.paidAmount - pending.total, 0),
    creditAmount: Math.max(pending.total - pending.paidAmount, 0),
    paymentMethod: pending.paymentMethod as any,
    soldAt: new Date(pending.createdAt).toISOString(),
    status: 'COMPLETED',
    items: [],
  };
}
