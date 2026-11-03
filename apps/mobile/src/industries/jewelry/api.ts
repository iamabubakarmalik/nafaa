/**
 * Jewelry endpoints (same paths and shapes as apps/web/src/industries/jewelry/api):
 * daily metal rates, raw metal stock, catalog pieces, counter bills, karigars,
 * custom orders, repairs and old gold. They need the server; screens show
 * the last saved data offline.
 */

import { apiClient } from '@/core/api/client';
import type { MetalType, Purity } from '@nafaa/core/industries/jewelry';

export type { MetalType, Purity };

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);

/* ───────────── rates and metal stock ───────────── */

export interface MetalRate {
  id: string; metalType: MetalType; purity: Purity; ratePerGram: number; ratePerTola?: number; buyRate?: number; sellRate?: number;
  effectiveDate: string; source?: string; isActive: boolean; createdAt: string; updatedAt: string;
}

export const metalRatesApi = {
  bulk: (rates: Array<{ metalType: string; purity: string; ratePerGram: number; buyRate?: number; source?: string }>) => post<MetalRate[]>('/jewelry/metal-rates/bulk', { rates }),
  current: () => get<MetalRate[]>('/jewelry/metal-rates/current'),
  history: (params?: object) => get<MetalRate[]>('/jewelry/metal-rates/history', params),
};

export interface MetalStockEntry {
  id: string; entryNumber: string; entryDate: string; entryType: string; metalType: string; purity: string; grams: number; balanceGrams: number;
  ratePerGram?: number; totalValue?: number; source?: string; reference?: string; karigarId?: string; notes?: string;
}
export interface MetalBalance { metalType: string; purity: string; balanceGrams: number; lastEntryDate: string | null }
export interface MetalStockPage { page: number; limit: number; total: number; pages: number; items: MetalStockEntry[]; totals: { in: number; out: number } }

export const metalStockApi = {
  addEntry: (data: object) => post<MetalStockEntry>('/jewelry/metal-stock', data),
  page: (params: { metalType?: string; purity?: string; entryType?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    get<MetalStockPage>('/jewelry/metal-stock/page', params),
  balance: () => get<MetalBalance[]>('/jewelry/metal-stock/balance'),
};

/* ───────────── pieces ───────────── */

export type JewelryCategory = 'RING' | 'NECKLACE' | 'EARRINGS' | 'BANGLE' | 'BRACELET' | 'ANKLET' | 'PENDANT' | 'CHAIN' | 'NOSE_PIN' | 'NOSE_RING' | 'MAANG_TIKKA'
  | 'JHUMKA' | 'CHOKER' | 'MANGALSUTRA' | 'HAAR' | 'KUNDAN_SET' | 'BRIDAL_SET' | 'KADA' | 'PAYAL' | 'TOE_RING' | 'BROOCH' | 'CUFFLINK' | 'TIE_PIN' | 'WATCH'
  | 'COIN' | 'BAR' | 'BULLION' | 'BUTTON' | 'RAKHI' | 'OTHER';
export type JewelryStyle = 'TRADITIONAL' | 'MODERN' | 'ANTIQUE' | 'BRIDAL' | 'DAILY_WEAR' | 'PARTY_WEAR' | 'KUNDAN' | 'POLKI' | 'MEENAKARI' | 'JADAU' | 'TEMPLE'
  | 'FILIGREE' | 'HANDMADE' | 'MACHINE_MADE' | 'ITALIAN' | 'TURKISH' | 'DUBAI' | 'INDIAN' | 'PAKISTANI' | 'CUSTOM' | 'OTHER';
export type GemstoneType = 'DIAMOND' | 'RUBY' | 'EMERALD' | 'SAPPHIRE' | 'PEARL' | 'OPAL' | 'TOPAZ' | 'AMETHYST' | 'AQUAMARINE' | 'GARNET' | 'TURQUOISE' | 'CORAL'
  | 'ONYX' | 'JADE' | 'MOONSTONE' | 'CITRINE' | 'TANZANITE' | 'ZIRCON' | 'CZ' | 'KUNDAN_STONE' | 'OTHER' | 'NONE';

export interface Gemstone { id?: string; type: GemstoneType; count: number; caret: number; totalValue?: number }

export interface JewelryProductProfile {
  id: string; productId: string; itemCode?: string; designNumber?: string; category: JewelryCategory; style: JewelryStyle; metalType: MetalType; purity: Purity;
  grossWeight: number; netWeight: number; stoneWeight: number; size?: string;
  makingChargePerGram: number; makingChargeFixed: number; makingChargePct: number; wastagePct: number; wastageGrams: number;
  designerCharge: number; polishCharge: number; hallmarkCharge: number; otherCharges: number;
  hasStones: boolean; hasDiamond: boolean; hasGemstone: boolean; hasPearl: boolean; stoneCount: number;
  hallmarkNumber?: string; karigarName?: string; isCertified: boolean; certificateNumber?: string;
  isBuyBackEligible: boolean; buyBackPct: number; isReturnable: boolean; returnDays: number; isBridalCollection: boolean; isFeatured: boolean;
  gemstones?: Gemstone[];
}

/** Slim profile used by the counter and lists. */
export type JewelryFacts = Pick<JewelryProductProfile, 'id' | 'productId' | 'itemCode' | 'designNumber' | 'category' | 'style' | 'metalType' | 'purity' | 'grossWeight'
  | 'netWeight' | 'stoneWeight' | 'size' | 'makingChargePerGram' | 'makingChargeFixed' | 'makingChargePct' | 'wastagePct' | 'wastageGrams' | 'designerCharge'
  | 'polishCharge' | 'hallmarkCharge' | 'otherCharges' | 'hasStones' | 'hasDiamond' | 'hallmarkNumber' | 'isCertified' | 'isBridalCollection' | 'isFeatured'
  | 'isBuyBackEligible' | 'buyBackPct' | 'karigarName'> & { gemstones: Array<{ totalValue?: number | null }> };

export const jewelryProductsApi = {
  upsert: (data: Record<string, unknown>) => post<JewelryProductProfile>('/jewelry/products', data),
  facts: () => get<JewelryFacts[]>('/jewelry/products/facts'),
  byProduct: (productId: string) => get<JewelryProductProfile | null>(`/jewelry/products/by-product/${productId}`),
};

/* ───────────── counter bills ───────────── */

export interface JewelrySale {
  saleId?: string | null; id: string; invoiceNumber: string; saleNumber?: string; total: number; netWeight: number; exchangeMetalGrams: number; exchangeValue: number;
}
/** A counter bill's jewelry details, by bill number (for sales chips and the receipt). */
export interface JewelryBill extends JewelrySale {
  grossWeight: number; makingCharges: number; wastageValue: number; stoneValue: number; polishCharges: number; hallmarkCharges: number; gstAmount: number;
  items: Array<{
    productId?: string | null; productName: string; metalType: string; purity: string; ratePerGram: number; grossWeight: number; netWeight: number; stoneWeight?: number;
    makingTotal: number; wastagePct: number; wastageValue: number; quantity: number; itemTotal: number; hallmarkNumber?: string | null;
  }>;
}

export const jewelrySalesApi = {
  create: (data: object) => post<JewelrySale>('/jewelry/sales', data),
  byNumbers: (numbers: string[]) => get<JewelryBill[]>('/jewelry/sales', { numbers: numbers.join(',') }),
};

/* ───────────── karigars ───────────── */

export interface Karigar {
  id: string; karigarNumber: string; fullName: string; cnic?: string; phone: string; address?: string; skillLevel?: string; yearsExperience?: number;
  perGramRate?: number; fixedRatePerPiece?: number; metalIssuedGrams: number; metalReturnedGrams: number; wastageGrams: number; outstandingGrams: number;
  totalEarnings: number; paidLabour: number; isActive: boolean; isInHouse: boolean; notes?: string;
}
export interface KarigarLedger {
  karigar: Karigar;
  metal: MetalStockEntry[];
  orders: Array<{ id: string; orderNumber: string; customerName: string; status: string; promisedDate?: string | null; metalIssuedGrams?: number | null; metalReceivedGrams?: number | null }>;
  repairs: Array<{ id: string; repairNumber: string; customerName?: string | null; itemDescription: string; promisedDate?: string | null; charge: number }>;
  labour: { earned: number; paid: number; due: number };
  payments: Array<{ id: string; expenseNumber: string; description?: string | null; title: string; amount: number; expenseDate: string }>;
}
export interface KarigarSummary { total: number; inHouse: number; external: number; totalOutstanding?: { outstandingGrams?: number } }

export const karigarsApi = {
  create: (data: object) => post<Karigar>('/jewelry/karigars', data),
  list: (params?: object) => get<Karigar[]>('/jewelry/karigars', params),
  summary: () => get<KarigarSummary>('/jewelry/karigars/summary'),
  update: (id: string, data: object) => patch<Karigar>(`/jewelry/karigars/${id}`, data),
  ledger: (id: string) => get<KarigarLedger>(`/jewelry/karigars/${id}/ledger`),
  recordLabour: (id: string, earnings: number) => post<Karigar>(`/jewelry/karigars/${id}/record-order`, { earnings }),
  payLabour: (id: string, data: { amount: number; paymentMethod: string; note?: string }) =>
    post<{ karigar: Karigar; expense: { id: string; expenseNumber: string; amount: number } }>(`/jewelry/karigars/${id}/pay-labour`, data),
  issueMetal: (id: string, data: { grams: number; purity: string; reference?: string; notes?: string }) => post<Karigar>(`/jewelry/karigars/${id}/issue-metal`, data),
  receiveMetal: (id: string, data: { receivedGrams: number; wastageGrams: number; returnedGrams: number; purity: string; reference?: string; notes?: string }) =>
    post<Karigar>(`/jewelry/karigars/${id}/receive-metal`, data),
};

/* ───────────── custom orders ───────────── */

export type OrderView = 'active' | 'today' | 'late' | 'work' | 'ready' | 'unpaid' | 'done' | 'all';

export interface CustomOrderRow {
  id: string; orderNumber: string; customerId?: string; customerName: string; customerPhone: string; orderDate: string; promisedDate?: string; status: string;
  category: string; metalType: string; purity: string; expectedGrossWeight: number; expectedMakingCharges?: number; advancePayment: number; estimatedPrice: number;
  finalPrice?: number; designDescription: string; referenceImageUrls: string[]; engravingText?: string; assignedKarigarId?: string; assignedKarigarName?: string;
  metalIssuedGrams?: number; metalReceivedGrams?: number; paidAmount: number; internalNotes?: string;
  goldAdvance: { grams: number; value: number; count: number }; due: number;
}
export interface CustomOrderPage {
  view: OrderView; page: number; limit: number; total: number; pages: number; counts: Record<OrderView, number>; totals: { value: number; paid: number }; items: CustomOrderRow[];
}
export interface CustomOrderSummary { active: number; today: number; late: number; ready: number; work: number; value: number; advance: number; grams: number }
export interface CustomOrderQuery { view?: OrderView; search?: string; karigarId?: string; from?: string; to?: string; page?: number; limit?: number; sort?: 'due' | 'recent' | 'amount' }

export const customOrdersApi = {
  page: (params: CustomOrderQuery) => get<CustomOrderPage>('/jewelry/custom-orders/page', params),
  summary: () => get<CustomOrderSummary>('/jewelry/custom-orders/summary'),
  goldAdvance: (id: string, data: { grams: number; purity: string; deductionPct?: number; value?: number }) => post<unknown>(`/jewelry/custom-orders/${id}/gold-advance`, data),
  create: (data: object) => post<CustomOrderRow>('/jewelry/custom-orders', data),
  update: (id: string, data: object) => patch<CustomOrderRow>(`/jewelry/custom-orders/${id}`, data),
  updateStatus: (id: string, status: string, reason?: string, managerPin?: string) => post<CustomOrderRow>(`/jewelry/custom-orders/${id}/status`, { status, reason, ...(managerPin && { managerPin }) }),
  issueMetal: (id: string, data: { grams: number; purity?: string; karigarId?: string }) => post<CustomOrderRow>(`/jewelry/custom-orders/${id}/issue-metal`, data),
  receiveMetal: (id: string, data: { receivedGrams: number; wastageGrams?: number; returnedGrams?: number }) => post<CustomOrderRow>(`/jewelry/custom-orders/${id}/receive-metal`, data),
  addPayment: (id: string, amount: number, paymentMethod?: string) => post<CustomOrderRow>(`/jewelry/custom-orders/${id}/payment`, { amount, paymentMethod }),
};

/* ───────────── repairs ───────────── */

export type RepairStatus = 'RECEIVED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type RepairView = 'open' | 'ready' | 'late' | 'done' | 'cancelled' | 'all';

export interface Repair {
  id: string; repairNumber: string; customerId?: string | null; customerName?: string | null; customerPhone?: string | null; itemDescription: string;
  weightGrams?: number | null; karat?: number | null; status: RepairStatus; promisedDate?: string | null; charge: number; advance: number;
  karigarId?: string | null; karigarName?: string | null; saleId?: string | null; notes?: string | null; createdAt: string; due: number;
}
export interface RepairPage {
  view: RepairView; page: number; limit: number; total: number; pages: number; counts: Record<RepairView, number>;
  totals: { charge: number; advance: number; grams: number }; items: Repair[];
}
export interface RepairInput {
  customerId?: string; customerName?: string; customerPhone?: string; itemDescription: string; weightGrams?: number | null; karat?: number | null;
  promisedDate?: string | null; charge?: number; advance?: number; paymentMethod?: string; karigarId?: string | null; notes?: string;
}

export const repairsApi = {
  page: (params: { view?: RepairView; search?: string; karigarId?: string; page?: number; limit?: number }) => get<RepairPage>('/jewelry/repairs/page', params),
  create: (data: RepairInput) => post<Repair>('/jewelry/repairs', data),
  update: (id: string, data: Partial<RepairInput>) => patch<Repair>(`/jewelry/repairs/${id}`, data),
  status: (id: string, status: RepairStatus, reason?: string) => patch<Repair>(`/jewelry/repairs/${id}/status`, { status, reason }),
  payment: (id: string, amount: number, paymentMethod: string) => post<Repair>(`/jewelry/repairs/${id}/payment`, { amount, paymentMethod }),
  deliver: (id: string, data: { charge: number; paidAmount: number; paymentMethod: string }) => post<Repair>(`/jewelry/repairs/${id}/deliver`, data),
};

/* ───────────── old gold ───────────── */

export interface Exchange {
  id: string; exchangeNumber: string; exchangeType: string; customerName: string; customerPhone: string; customerCnic?: string; exchangeDate: string; itemDescription: string;
  metalType: string; claimedPurity: string; grossWeight: number; testedPurity?: string; netWeight?: number; stoneWeight: number; ratePerGram: number;
  grossValue: number; deductions: number; netValue: number; purpose?: string; saleId?: string; usedAgainstOrderId?: string; notes?: string;
}
export type ExchangeKind = 'buy' | 'bill-open' | 'repair' | 'repair-open' | 'all';
export interface ExchangePage { kind: ExchangeKind; page: number; limit: number; total: number; pages: number; items: Exchange[]; totals: { grams: number; fine: number; value: number; deductions: number } }

export const exchangesApi = {
  create: (data: object) => post<Exchange & { paidFromDrawer?: boolean }>('/jewelry/exchanges', data),
  page: (params: { kind?: ExchangeKind; search?: string; from?: string; to?: string; page?: number; limit?: number }) => get<ExchangePage>('/jewelry/exchanges/page', params),
  giveBack: (id: string) => post<Exchange>(`/jewelry/exchanges/${id}/give-back`),
  deliverRepair: (id: string, data: { charge: number; paidAmount: number; paymentMethod: string }) => post<Exchange>(`/jewelry/exchanges/${id}/deliver`, data),
};

/* ───────────── dashboard ───────────── */

export interface JewelryOverview {
  today?: { sales: number; revenue: number; weightSold: number; customOrders: number; exchanges: number };
  monthly?: { sales: number; revenue: number; collected: number; outstanding: number; goldSold: number; silverSold: number; exchangesCount: number; exchangesValue: number; exchangesGold: number };
  pendingCustomOrders?: number;
  totals?: { totalProducts: number; activeKarigars: number };
  upcomingOrders?: Array<{ id: string; orderNumber: string; customerName: string; category?: string; status: string; promisedDate?: string | null; estimatedPrice?: number; advancePayment?: number; paidAmount?: number }>;
  topKarigars?: Array<{ id: string; fullName: string; skillLevel?: string | null; completedOrders: number; totalEarnings: number; outstandingGrams: number }>;
}
export const jewelryDashboardApi = { overview: () => get<JewelryOverview>('/jewelry/dashboard/overview') };
