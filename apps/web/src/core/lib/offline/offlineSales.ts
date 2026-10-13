import { apiClient } from '@core/api/client';
import { db, type PendingSale, type PendingSaleItemSnapshot, localId } from './db';
import { salesApi, type CreateSalePayload, type Sale, type TenderMethod } from '@modules/sales/sales/api/sales.api';
import { offlineProductsApi } from './offlineProducts';
import { useAuthStore } from '@core/stores/auth.store';
import { getCachedSettings } from './offlineSettings';
import { nextOfflineSaleNumber } from './offlineDevice';
import { fiscalizeSale } from '@integrations/tax-authority/taxAuthority.api';
import { askManagerPin } from '@core/security/ManagerPin';

type SaleItemInput = CreateSalePayload['items'][number] & {
  usedPhoneId?: string;
};

/**
 * Build a full item snapshot from cache so receipt printable offline.
 * 3 item kinds: normal product / new-phone IMEI / used phone.
 */
async function buildItemSnapshots(
  items: CreateSalePayload['items'],
): Promise<PendingSaleItemSnapshot[]> {
  const snapshots: PendingSaleItemSnapshot[] = [];

  for (const raw of items) {
    const it = raw as SaleItemInput;

    // ── USED PHONE item ─────────────────────────────────────
    if (it.usedPhoneId) {
      const up = await db.usedPhones.get(it.usedPhoneId);
      const unitPrice =
        it.priceOverride ?? Number(up?.resalePrice ?? 0);
      const qty = Number(it.quantity) || 1;
      const lineTotal = Math.max(unitPrice * qty - (it.lineDiscount || 0), 0);

      snapshots.push({
        productId: null,
        productName: up
          ? `${up.brand} ${up.model} (${up.usedPhoneCode})`
          : 'Used Phone',
        sku: up?.usedPhoneCode ?? null,
        barcode: null,
        unit: 'pcs',
        imeiNumber: up?.imei1 ?? undefined,
        usedPhoneId: it.usedPhoneId,
        usedPhoneBrand: up?.brand ?? null,
        usedPhoneModel: up?.model ?? null,
        usedPhoneCode: up?.usedPhoneCode ?? null,
        usedPhoneImei: up?.imei1 ?? null,
        itemKind: 'USED_PHONE',
        quantity: qty,
        unitPrice,
        lineTotal,
        lineDiscount: it.lineDiscount,
        note: it.note,
        internalNote: it.internalNote,
      });
      continue;
    }

    // ── PRODUCT / IMEI item ─────────────────────────────────
    const productId = it.productId as string | undefined;
    const p = productId ? await db.products.get(productId) : undefined;

    // IMEI number lookup (best-effort, from v3 cache)
    let imeiNumber: string | undefined;
    if (it.imeiId) {
      const m = await db.imeis.get(it.imeiId);
      imeiNumber = m?.imei1 ?? undefined;
    }

    let variantName: string | undefined;
    let variant: any;
    if (it.variantId && p?.variants) {
      variant = (p.variants as any[]).find((x: any) => x.id === it.variantId);
      if (variant) variantName = variant.name;
    }

    // Same order as the server: typed price, else wholesale, else variant or product price.
    const listPrice = Number(variant?.price ?? p?.price ?? 0);
    const unitPrice = Number(
      it.priceOverride ??
      (it.useWholesale ? (variant?.wholesalePrice ?? p?.wholesalePrice ?? listPrice) : listPrice),
    ) || 0;
    const qty = Number(it.quantity) || 0;
    const lineTotal = unitPrice * qty - (it.lineDiscount || 0);

    snapshots.push({
      productId: productId ?? null,
      productName: p?.name || 'Item',
      sku: p?.sku ?? null,
      barcode: p?.barcode ?? null,
      unit: p?.unit || 'pcs',
      variantId: it.variantId,
      variantName,
      imeiId: it.imeiId,
      imeiNumber,
      usedPhoneId: null,
      itemKind: it.imeiId ? 'NEW_PHONE_IMEI' : 'PRODUCT',
      quantity: qty,
      unitPrice,
      lineTotal: Math.max(lineTotal, 0),
      lineDiscount: it.lineDiscount,
      note: it.note,
      internalNote: it.internalNote,
    });
  }
  return snapshots;
}

/**
 * Sends the sale; when the server answers that the owner's PIN is needed
 * (discount or lowered price over the limit, credit limit), asks for it once
 * and sends again. Pages that already sent a PIN get the error as before.
 */
async function createWithPin(payload: CreateSalePayload): Promise<Sale> {
  try {
    return await salesApi.create(payload);
  } catch (e) {
    const res = (e as { response?: { status?: number; data?: { message?: string | string[] } } })?.response;
    const message = Array.isArray(res?.data?.message) ? res?.data?.message.join(', ') : (res?.data?.message ?? '');
    if (res?.status !== 403 || !/PIN chahiye/.test(message) || payload.managerPin) throw e;
    const pin = await askManagerPin(message.replace(/ ke liye malik ya manager ka PIN chahiye$/, ''), /udhaar|credit/i.test(message) ? 'credit' : 'discount');
    if (!pin) throw e;
    return salesApi.create({ ...payload, managerPin: pin });
  }
}

export const offlineSalesApi = {
  /** `counter` carries the code and points amounts worked out at the counter, for the offline total. */
  create: async (payload: CreateSalePayload, counter: { codeDiscount?: number; loyaltyDiscount?: number } = {}): Promise<Sale | PendingSale> => {
    // ─── ONLINE ATTEMPT ───
    if (navigator.onLine) {
      try {
        const sale = await createWithPin(payload);
        // Update local stock cache (skip used phones — own lifecycle)
        for (const raw of payload.items) {
          const it = raw as SaleItemInput;
          if (it.usedPhoneId || !it.productId) continue;
          await offlineProductsApi.decrementStock(it.productId, it.quantity);
        }
        void warnLowStockAfterSale(payload.items);
        // PRA / SRB / KPRA on ho to bill chhapne se pehle fiscal number (warna chup — cron bhejega)
        await fiscalizeSale(sale);
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

    // Totals the way the server works them out: each line at its own price
    // (catalog price when none was typed), less discounts, plus the charges
    // the shop keeps (a rider's own pass-through charge is left out).
    const subtotal = itemsSnapshot.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const lineDiscount = payload.items.reduce((s, it) => s + (Number(it.lineDiscount) || 0), 0);
    const charges: Array<{ amount?: number; passThrough?: boolean }> = Array.isArray(payload.serviceCharges) ? (payload.serviceCharges as any[]) : [];
    const svcTotal = charges.filter((c) => !c?.passThrough).reduce((s, c) => s + Number(c?.amount || 0), 0);
    const total = Math.max(subtotal - lineDiscount - (payload.discount || 0) - (counter.codeDiscount || 0) - (counter.loyaltyDiscount || 0) + svcTotal, 0);

    const customer = payload.customerId ? await db.customers.get(payload.customerId) : null;
    const settings = await getCachedSettings();
    const authState = useAuthStore.getState();
    const shopLookup = await db.lookups.get(payload.shopId);

    const paidAmount = Number(payload.paidAmount) || 0;
    const changeAmount = Math.max(paidAmount - total, 0);
    const creditAmount = Math.max(total - paidAmount, 0);
    // Cost approximation: used-phone cost from cache, products unknown offline → 0
    const costOfGoods = itemsSnapshot.reduce((s, snap) => {
      return s + 0 * snap.quantity;
    }, 0);

    const pending: PendingSale = {
      id,
      saleNumber,
      shopId: payload.shopId,
      customerId: payload.customerId,
      paymentMethod: payload.paymentMethod as any,
      paidAmount,
      payments: payload.payments,
      discount: payload.discount || 0,
      discountCode: payload.discountCode,
      loyaltyPointsToUse: payload.loyaltyPointsToUse,
      codeDiscount: counter.codeDiscount,
      loyaltyDiscount: counter.loyaltyDiscount,
      serviceCharges: svcTotal || undefined,
      serviceChargesBreakdown: charges.length > 0 ? (charges as any[]) : null,
      receivedByName: payload.receivedByName,
      receivedByPhone: payload.receivedByPhone,
      receivedByCnic: payload.receivedByCnic,
      items: payload.items.map((raw) => {
        const it = raw as SaleItemInput;
        return {
          productId: it.productId ?? undefined,
          usedPhoneId: it.usedPhoneId ?? undefined,
          variantId: it.variantId,
          imeiId: it.imeiId,
          quantity: it.quantity,
          priceOverride: it.priceOverride,
          lineDiscount: it.lineDiscount,
          useWholesale: it.useWholesale,
          note: it.note,
          internalNote: it.internalNote,
        };
      }),
      itemsSnapshot,
      customerSnapshot: customer
        ? {
            id: customer.id,
            name: customer.name,
            phone: customer.phone ?? null,
            email: customer.email ?? null,
            address: customer.address ?? null,
            /* Bill ke BAAD ka khata. Server udhaar wali bikri par
               customer ka balance khud barha deta hai, magar offline
               me sirf snapshot banta hai. Agar yahan bill se pehle
               wala balance rakh dein to receipt par "kul udhaar" kam
               dikhta — aur online/offline ke receipt alag alag hote. */
            balance: Number(customer.balance ?? 0) + creditAmount,
          }
        : null,
      shopSnapshot: {
        id: payload.shopId,
        name: shopLookup?.name || (authState as any).user?.assignedShop?.name,
        address: (shopLookup?.extra as any)?.address ?? null,
        phone: (shopLookup?.extra as any)?.phone ?? null,
      },
      tenantSnapshot: {
        id: (authState as any).tenant?.id,
        name: (authState as any).tenant?.name,
        currencySymbol: (settings as any)?.settings?.currencySymbol || 'Rs',
        settings: (settings as any)?.settings || null,
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
    // Points used offline leave the saved balance now, so they cannot be used twice before sync.
    if (payload.customerId && payload.loyaltyPointsToUse) {
      const c = await db.customers.get(payload.customerId);
      if (c) await db.customers.put({ ...c, loyaltyPoints: Math.max(0, (c.loyaltyPoints ?? 0) - payload.loyaltyPointsToUse) });
    }

    // Local stock decrement (skip used phones)
    for (const raw of payload.items) {
      const it = raw as SaleItemInput;
      if (it.usedPhoneId || !it.productId) continue;
      await offlineProductsApi.decrementStock(it.productId, it.quantity);
    }
    void warnLowStockAfterSale(payload.items);

    // Try background sync if actually online
    if (navigator.onLine) {
      setTimeout(() => {
        import('./syncEngine')
          .then(({ uploadPendingChanges }) => uploadPendingChanges().catch(() => {}))
          .catch(() => {});
      }, 300);
    }
    return pending;
  },

  /** Get sale — ONLINE first, then Dexie (local & already-synced offline sales). */
  getOne: async (id: string): Promise<Sale | null> => {
    if (id.startsWith('local_sale_')) {
      const local = await db.pendingSales.get(id);
      return local ? (pendingSaleToSale(local) as Sale) : null;
    }
    if (navigator.onLine) {
      try {
        const res = await apiClient.get(`/sales/${id}`);
        return (res.data?.data ?? res.data) as Sale;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404) return null;
      }
    }
    const synced = await db.pendingSales.where('serverSaleId').equals(id).first();
    if (synced) return pendingSaleToSale(synced) as Sale;
    return null;
  },

  listMerged: async (): Promise<Sale[]> => salesApi.list(),
  summaryMerged: async (): Promise<any> => salesApi.summary(),

  getPending: async (): Promise<PendingSale[]> =>
    db.pendingSales.where('status').anyOf('pending', 'failed', 'syncing').reverse().sortBy('createdAt'),
  getPendingCount: async (): Promise<number> =>
    db.pendingSales.where('status').anyOf('pending', 'failed').count(),
};

/**
 * PendingSale → Sale-shape for receipt page rendering.
 * Used-phone items render with brand/model/code like online receipts.
 */
/** Queued parts as the server stores them: change comes off the cash, last cash part first. */
function offlineParts(parts: PendingSale['payments'], change: number): Sale['payments'] {
  if (!parts?.length) return undefined;
  let back = Math.max(change, 0);
  const out = parts.map((p) => ({ ...p, method: p.method as TenderMethod }));
  for (let i = out.length - 1; i >= 0 && back > 0; i--) {
    if (out[i].method !== 'CASH') continue;
    const cut = Math.min(out[i].amount, back);
    out[i] = { ...out[i], amount: out[i].amount - cut };
    back -= cut;
  }
  return out.filter((p) => p.amount > 0);
}

export function pendingSaleToSale(p: PendingSale): Partial<Sale> {
  const items = p.itemsSnapshot.map((it, idx) => ({
    id: `${p.id}_item_${idx}`,
    quantity: it.quantity,
    price: it.unitPrice,
    costPrice: 0,
    total: it.lineTotal,
    note: it.note || null,
    internalNote: it.internalNote || null,
    productId: it.productId ?? null,
    usedPhoneId: it.usedPhoneId ?? null,
    product: it.productId
      ? ({
          id: it.productId,
          name: it.productName,
          unit: it.unit,
          sku: it.sku ?? null,
          barcode: it.barcode ?? null,
        } as any)
      : it.usedPhoneId
        ? ({
            id: it.usedPhoneId,
            name: it.productName,
            unit: 'pcs',
            sku: it.usedPhoneCode ?? null,
            barcode: null,
          } as any)
        : null,
    usedPhone: it.usedPhoneId
      ? ({
          id: it.usedPhoneId,
          brand: it.usedPhoneBrand,
          model: it.usedPhoneModel,
          usedPhoneCode: it.usedPhoneCode,
          imei1: it.usedPhoneImei,
        } as any)
      : null,
    variantLink: it.variantName
      ? {
          variant: {
            id: it.variantId!,
            name: it.variantName,
            sku: null,
            color: null,
            colorHex: null,
            size: null,
            imageUrl: null,
          },
        }
      : null,
    imeis: it.imeiNumber ? [{ id: it.imeiId, imei1: it.imeiNumber }] : [],
  }));

  return {
    id: p.id,
    saleNumber: p.serverSaleNumber || p.saleNumber,
    subtotal: p.subtotal,
    discount: p.discount,
    total: p.total,
    paidAmount: p.paidAmount,
    changeAmount: p.changeAmount,
    payments: offlineParts(p.payments, p.changeAmount),
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
    tenant: p.tenantSnapshot
      ? ({
          id: p.tenantSnapshot.id || '',
          name: p.tenantSnapshot.name || '',
          slug: '',
          country: 'PK',
          currency: 'PKR',
          settings: p.tenantSnapshot.settings || null,
        } as any)
      : undefined,
    items: items as any,
  };
}

async function warnLowStockAfterSale(items: CreateSalePayload['items']): Promise<void> {
  try {
    const { toast } = await import('sonner');
    for (const raw of items) {
      const it = raw as SaleItemInput;
      if (it.usedPhoneId || !it.productId) continue;
      const p = await db.products.get(it.productId);
      if (p && p.lowStockAlert > 0 && p.stock <= p.lowStockAlert) {
        toast.warning(`⚠️ Low stock: ${p.name} — sirf ${p.stock} ${p.unit} bache`, { duration: 4000 });
      }
    }
  } catch {}
}
