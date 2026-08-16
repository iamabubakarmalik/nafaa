import { apiClient } from '@core/api/client';

export interface ServiceChargeItem {
  type: string;
  label: string;
  amount: number;
  note?: string;
}

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'JAZZCASH'
  | 'EASYPAISA';

export interface CreateSaleItem {
  productId: string;
  variantId?: string;
  imeiId?: string;
  quantity: number;
  priceOverride?: number;
  lineDiscount?: number;
  useWholesale?: boolean;
  note?: string;
  internalNote?: string;
}

export interface CreateSalePayload {
  shopId: string;
  customerId?: string;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  discount?: number;
  discountCode?: string;
  loyaltyPointsToUse?: number;
  note?: string;
  serviceCharges?: ServiceChargeItem[];
  items: CreateSaleItem[];
}

export interface Sale {
  id: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  creditAmount: number;
  costOfGoods: number;
  serviceCharges?: number;
  serviceChargesBreakdown?: ServiceChargeItem[] | null;
  paymentMethod: PaymentMethod;
  soldAt: string;
  status?: 'COMPLETED' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED' | 'VOIDED';
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    balance?: number;
    address?: string | null;
    email?: string | null;
  } | null;
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  shop?: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    isMain?: boolean;
  } | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    phone?: string | null;
    country: string;
    currency: string;
    settings?: {
      shopName?: string | null;
      legalName?: string | null;
      shopAddress?: string | null;
      shopCity?: string | null;
      shopProvince?: string | null;
      shopPhone?: string | null;
      shopWhatsapp?: string | null;
      shopEmail?: string | null;
      shopWebsite?: string | null;
      logoUrl?: string | null;
      taxNumber?: string | null;
      taxLabel?: string | null;
      enableTax?: boolean;
      receiptSize?: string;
      receiptHeader?: string | null;
      receiptFooter?: string | null;
      receiptShowLogo?: boolean;
      receiptShowTax?: boolean;
      receiptShowCustomer?: boolean;
      receiptShowBarcode?: boolean;
      receiptShowQrCode?: boolean;
      currencySymbol?: string;
      currency?: string;
    } | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    costPrice: number;
    total: number;
    note?: string | null;
    internalNote?: string | null;
    product: {
      id: string;
      name: string;
      unit: string;
      sku?: string | null;
      barcode?: string | null;
    };
    variantLink?: {
      variant: {
        id: string;
        name: string;
        sku?: string | null;
        color?: string | null;
        colorHex?: string | null;
        size?: string | null;
        imageUrl?: string | null;
      };
    } | null;
  }>;
}

export interface SalesSummary {
  todaySales: number;
  todayOrders: number;
  todayProfit: number;
  todayCredit: number;
  todayPaid: number;
  monthSales: number;
  monthProfit: number;
  totalSales: number;
  totalProfit: number;
  totalOrders: number;
  paymentBreakdown: Array<{
    paymentMethod: PaymentMethod;
    _count: { _all: number };
    _sum: { total: number | null };
  }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

/** Network failure = server tak pahuncha hi nahi (business error NAHI) */
const isNetFail = (e: any): boolean => {
  const s = e?.response?.status;
  return !s || s === 0 || s === 408 || s >= 502;
};

/** Pending local sales ko Sale[] shape me lao */
async function getPendingAsSales(): Promise<Sale[]> {
  try {
    const { db } = await import('@core/lib/offline/db');
    const { pendingSaleToSale } = await import('@core/lib/offline/offlineSales');
    const pending = await db.pendingSales
      .where('status')
      .anyOf('pending', 'failed', 'syncing')
      .toArray();
    return pending.map((p) => pendingSaleToSale(p) as Sale);
  } catch {
    return [];
  }
}

export const salesApi = {
  /**
   * create PURE rehta hai — offlineSalesApi isay wrap karta hai.
   * (Yahan offline logic daalne se circular loop banta)
   */
  create: (payload: CreateSalePayload) =>
    apiClient.post<{ data: Sale }>('/sales', payload).then(unwrap),

  /**
   * LIST — GLOBAL OFFLINE: server + pending local sales MERGED.
   * Har industry ka Sales page automatically offline-capable.
   */
  list: async (shopId?: string): Promise<Sale[]> => {
    let serverSales: Sale[] = [];
    let serverOk = false;

    if (navigator.onLine) {
      try {
        serverSales = await apiClient
          .get<{ data: Sale[] }>('/sales', { params: shopId ? { shopId } : {} })
          .then(unwrap);
        serverOk = true;
      } catch (e) {
        if (!isNetFail(e)) throw e; // asli server error → page ko batao
      }
    }

    const localPending = await getPendingAsSales();
    const merged = [...localPending, ...serverSales];
    merged.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());

    if (!serverOk && merged.length === 0 && navigator.onLine) {
      throw new Error('Sales load nahi ho sakin');
    }
    return merged;
  },

  /**
   * SUMMARY — server summary + pending sales ka add-on.
   */
  summary: async (shopId?: string): Promise<SalesSummary> => {
    let server: SalesSummary | null = null;

    if (navigator.onLine) {
      try {
        server = await apiClient
          .get<{ data: SalesSummary }>('/sales/summary', { params: shopId ? { shopId } : {} })
          .then(unwrap);
      } catch (e) {
        if (!isNetFail(e)) throw e;
      }
    }

    let pending: Array<{ total: number; creditAmount: number; paidAmount: number; createdAt: number }> = [];
    try {
      const { db } = await import('@core/lib/offline/db');
      pending = await db.pendingSales
        .where('status')
        .anyOf('pending', 'failed', 'syncing')
        .toArray();
    } catch {}

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayP = pending.filter((p) => p.createdAt >= todayStart.getTime());
    const sumTotal = (arr: typeof pending) => arr.reduce((s, p) => s + p.total, 0);
    const sumCredit = (arr: typeof pending) => arr.reduce((s, p) => s + p.creditAmount, 0);
    const sumPaid = (arr: typeof pending) => arr.reduce((s, p) => s + p.paidAmount, 0);

    if (!server) {
      return {
        todaySales: sumTotal(todayP),
        todayOrders: todayP.length,
        todayProfit: 0,
        todayCredit: sumCredit(todayP),
        todayPaid: sumPaid(todayP),
        monthSales: sumTotal(pending),
        monthProfit: 0,
        totalSales: sumTotal(pending),
        totalProfit: 0,
        totalOrders: pending.length,
        paymentBreakdown: [],
      };
    }

    return {
      ...server,
      todaySales: (server.todaySales ?? 0) + sumTotal(todayP),
      todayOrders: (server.todayOrders ?? 0) + todayP.length,
      todayCredit: (server.todayCredit ?? 0) + sumCredit(todayP),
      todayPaid: (server.todayPaid ?? 0) + sumPaid(todayP),
      totalSales: (server.totalSales ?? 0) + sumTotal(pending),
      totalOrders: (server.totalOrders ?? 0) + pending.length,
    };
  },

  /**
   * GET ONE — offline sale ho ya server ki, dono chalti hain.
   * Receipt page ke liye yahi global fix hai.
   */
  getOne: async (id: string): Promise<Sale> => {
    // Local (offline) sale — seedha Dexie se
    if (id.startsWith('local_sale_')) {
      const { db } = await import('@core/lib/offline/db');
      const { pendingSaleToSale } = await import('@core/lib/offline/offlineSales');
      const local = await db.pendingSales.get(id);
      if (!local) throw new Error('Sale nahi mili');
      return pendingSaleToSale(local) as Sale;
    }

    if (navigator.onLine) {
      try {
        return await apiClient.get<{ data: Sale }>(`/sales/${id}`).then(unwrap);
      } catch (e: any) {
        if (e?.response?.status === 404) throw e;
        if (!isNetFail(e)) throw e;
        // network fail → local mirror try karo
      }
    }

    // Offline: shayad ye hamari hi synced offline sale hai
    const { db } = await import('@core/lib/offline/db');
    const { pendingSaleToSale } = await import('@core/lib/offline/offlineSales');
    const synced = await db.pendingSales.where('serverSaleId').equals(id).first();
    if (synced) return pendingSaleToSale(synced) as Sale;

    throw new Error('Sale nahi mili (offline — cache me nahi hai)');
  },

  /**
   * VOID — sirf online (offline void risky hai, stock double ho sakta hai)
   */
  voidSale: (id: string, reason?: string) => {
    if (!navigator.onLine) {
      return Promise.reject(new Error('Void karne ke liye internet chahiye'));
    }
    return apiClient.post<{ data: any }>(`/sales/${id}/void`, { reason }).then(unwrap);
  },
};
