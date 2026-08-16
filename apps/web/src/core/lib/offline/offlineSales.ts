import { apiClient } from '@core/api/client';
import { db, type PendingSale, type PendingSaleItemSnapshot, localId } from './db';
import { salesApi, type CreateSalePayload, type Sale } from '@modules/sales/sales/api/sales.api';
import { offlineProductsApi } from './offlineProducts';
import { useAuthStore } from '@core/stores/auth.store';
import { getCachedSettings } from './offlineSettings';
import { nextOfflineSaleNumber } from './offlineDevice';

/**
 * Build a full item snapshot from cache so receipt printable offline.
 */
async function buildItemSnapshots(
  items: CreateSalePayload['items'],
): Promise<PendingSaleItemSnapshot[]> {
  const snapshots: PendingSaleItemSnapshot[] = [];
  for (const it of items) {
    const p = await db.products.get(it.productId);
    const unitPrice =
      it.priceOverride ??
      (it.useWholesale ? (p?.wholesalePrice ?? p?.price ?? 0) : (p?.price ?? 0));
    const qty = Number(it.quantity) || 0;
    const lineTotal = unitPrice * qty - (it.lineDiscount || 0);

    // Variant lookup
    let variantName: string | undefined;
    if (it.variantId && p?.variants) {
      const v = p.variants.find((x: any) => x.id === it.variantId);
      if (v) variantName = v.name;
    }

    snapshots.push({
      productId: it.productId,
      productName: p?.name || 'Item',
      sku: p?.sku ?? null,
      barcode: p?.barcode ?? null,
      unit: p?.unit || 'pcs',
      variantId: it.variantId,
      variantName,
      imeiId: it.imeiId,
      quantity: qty,
      unitPrice,
      lineTotal: Math.max(lineTotal, 0),
      lineDiscount: it.lineDiscount,
      note: it.note,
      internalNote: (it as any).internalNote,
    });
  }
  return snapshots;
}

export const offlineSalesApi = {
  create: async (payload: CreateSalePayload): Promise<Sale | PendingSale> => {
    // Compute totals
    const subtotal = payload.items.reduce(
      (sum, it) => sum + (it.priceOverride || 0) * it.quantity,
      0,
    );
    const lineDiscount = payload.items.reduce((s, it) => s + (it.lineDiscount || 0), 0);
    const svcTotal = (payload.serviceCharges || []).reduce((s, c) => s + Number(c.amount || 0), 0);
    const total = Math.max(subtotal - lineDiscount - (payload.discount || 0) + svcTotal, 0);

    // ─── ONLINE ATTEMPT ───
    if (navigator.onLine) {
      try {
        const sale = await salesApi.create(payload);
        // Update local stock cache
        for (const it of payload.items) {
          await offlineProductsApi.decrementStock(it.productId, it.quantity);
        }
        void warnLowStockAfterSale(payload.items);
        return sale;
      } catch (error: any) {
        const status = error?.response?.status;
        const isNetworkError = !status || status === 0 || status >= 502;
        if (!isNetworkError) {
          console.error('[offlineSales] Server rejected:', error?.response?.data);
          throw error;
        }
        console.warn('[offlineSales] Network issue, queuing offline:', error?.message);
        // fall through
      }
    }

    // ─── OFFLINE MODE — save with full snapshot ───
    const id = localId('local_sale');
    const saleNumber = nextOfflineSaleNumber();
    const itemsSnapshot = await buildItemSnapshots(payload.items);

    // Snapshots for printable receipt
    const customer = payload.customerId ? await db.customers.get(payload.customerId) : null;
    const settings = await getCachedSettings();
    const authState = useAuthStore.getState();
    const shopLookup = await db.lookups.get(payload.shopId);

    const paidAmount = Number(payload.paidAmount) || 0;
    const changeAmount = Math.max(paidAmount - total, 0);
    const creditAmount = Math.max(total - paidAmount, 0);
    const costOfGoods = itemsSnapshot.reduce((s, it) => {
      // costPrice approximation from cached product
      return s + (it.quantity * 0); // We don't track cost in snapshot; safe to 0 offline
    }, 0);

    const pending: PendingSale = {
      id,
      saleNumber,
      shopId: payload.shopId,
      customerId: payload.customerId,
      paymentMethod: payload.paymentMethod as any,
      paidAmount,
      discount: payload.discount || 0,
      serviceCharges: svcTotal || undefined,
      serviceChargesBreakdown: payload.serviceCharges && payload.serviceCharges.length > 0
        ? payload.serviceCharges as any[]
        : null,
      items: payload.items,
      itemsSnapshot,
      customerSnapshot: customer
        ? {
            id: customer.id,
            name: customer.name,
            phone: customer.phone ?? null,
            email: customer.email ?? null,
            address: customer.address ?? null,
            balance: customer.balance,
          }
        : null,
      shopSnapshot: {
        id: payload.shopId,
        name: shopLookup?.name || authState.user?.assignedShop?.name,
        address: (shopLookup?.extra as any)?.address ?? null,
        phone: (shopLookup?.extra as any)?.phone ?? null,
      },
      tenantSnapshot: {
        id: authState.tenant?.id,
        name: authState.tenant?.name,
        currencySymbol: (settings?.settings?.currencySymbol) || 'Rs',
        settings: settings?.settings || null,
      },
      subtotal,
      total,
      changeAmount,
      creditAmount,
      costOfGoods,
      soldAt: new Date().toISOString(),
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    await db.pendingSales.add(pending);

    // Decrement local stock so UI is correct
    for (const it of payload.items) {
      await offlineProductsApi.decrementStock(it.productId, it.quantity);
    }
    void warnLowStockAfterSale(payload.items);

    // Trigger sync attempt if online
    if (navigator.onLine) {
      setTimeout(() => {
        import('./syncEngine').then(({ uploadPendingChanges }) => uploadPendingChanges().catch(() => {}));
      }, 300);
    }

    return pending;
  },

  /**
   * Get sale — ONLINE first, then Dexie (for local & already-synced offline sales).
   * Returns a Sale-shaped object so ReceiptPage kaam kare bina koi change ke.
   */
  getOne: async (id: string): Promise<Sale | null> => {
    // Local pending sale
    if (id.startsWith('local_sale_')) {
      const local = await db.pendingSales.get(id);
      return local ? (pendingSaleToSale(local) as any) : null;
    }

    // Server-side sale — RAW call (salesApi.getOne ab offline-aware hai, loop avoid)
    if (navigator.onLine) {
      try {
        const res = await apiClient.get(`/sales/${id}`);
        return (res.data?.data ?? res.data) as Sale;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) return null;
        // Network fail — try local mirror
      }
    }

    // Check if it was a local sale synced to server (by serverSaleId)
    const synced = await db.pendingSales.where('serverSaleId').equals(id).first();
    if (synced) return pendingSaleToSale(synced) as any;

    return null;
  },

  /**
   * Sales list — server + pending local sales MERGED.
   * Offline ho ya online, Sales page pe sab dikhe.
   */
  listMerged: async (): Promise<Sale[]> => {
    // salesApi.list ab khud pending merge karta hai
    return salesApi.list();
  },

  summaryMerged: async (): Promise<any> => {
    return salesApi.summary();
  },

  getPending: async (): Promise<PendingSale[]> => {
    return db.pendingSales.where('status').anyOf('pending', 'failed', 'syncing').reverse().sortBy('createdAt');
  },

  getPendingCount: async (): Promise<number> => {
    return db.pendingSales.where('status').anyOf('pending', 'failed').count();
  },
};

/**
 * Convert PendingSale → Sale-shape for receipt page rendering.
 */
export function pendingSaleToSale(p: PendingSale): Partial<Sale> {
  const items = p.itemsSnapshot.map((it, idx) => ({
    id: `${p.id}_item_${idx}`,
    quantity: it.quantity,
    price: it.unitPrice,
    costPrice: 0,
    total: it.lineTotal,
    note: it.note || null,
    internalNote: it.internalNote || null,
    product: {
      id: it.productId,
      name: it.productName,
      unit: it.unit,
      sku: it.sku ?? null,
      barcode: it.barcode ?? null,
    },
    variantLink: it.variantName
      ? { variant: { id: it.variantId!, name: it.variantName, sku: null, color: null, colorHex: null, size: null, imageUrl: null } }
      : null,
  }));

  return {
    id: p.id,
    saleNumber: p.serverSaleNumber || p.saleNumber,
    subtotal: p.subtotal,
    discount: p.discount,
    total: p.total,
    paidAmount: p.paidAmount,
    changeAmount: p.changeAmount,
    creditAmount: p.creditAmount,
    costOfGoods: p.costOfGoods,
    serviceCharges: p.serviceCharges,
    serviceChargesBreakdown: p.serviceChargesBreakdown as any,
    paymentMethod: p.paymentMethod as any,
    soldAt: p.soldAt,
    status: 'COMPLETED',
    customer: p.customerSnapshot
      ? {
          id: p.customerSnapshot.id,
          name: p.customerSnapshot.name,
          phone: p.customerSnapshot.phone,
          balance: p.customerSnapshot.balance,
          address: p.customerSnapshot.address,
          email: p.customerSnapshot.email,
        }
      : null,
    shop: p.shopSnapshot
      ? {
          id: p.shopSnapshot.id,
          name: p.shopSnapshot.name || 'My Shop',
          address: p.shopSnapshot.address,
          phone: p.shopSnapshot.phone,
        }
      : null,
    tenant: p.tenantSnapshot ? {
      id: p.tenantSnapshot.id || '',
      name: p.tenantSnapshot.name || '',
      slug: '',
      country: 'PK',
      currency: 'PKR',
      settings: p.tenantSnapshot.settings || null,
    } as any : undefined,
    items: items as any,
  };
}


async function warnLowStockAfterSale(items: CreateSalePayload['items']): Promise<void> {
  try {
    const { toast } = await import('sonner');
    for (const it of items) {
      const p = await db.products.get(it.productId);
      if (p && p.lowStockAlert > 0 && p.stock <= p.lowStockAlert) {
        toast.warning(`⚠️ Low stock: ${p.name} — sirf ${p.stock} ${p.unit} bache`, { duration: 4000 });
      }
    }
  } catch {}
}
