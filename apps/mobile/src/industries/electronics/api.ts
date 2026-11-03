/**
 * Electronics endpoints (same paths and shapes as apps/web/src/industries/electronics/api):
 * product profiles, the serial register, warranty claims, bundles, the counter
 * catalog, analytics and the dashboard overview. They need the server; screens
 * show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';
import type { CategoryType, ConditionType } from '@nafaa/core/industries/electronics';

export type { CategoryType, ConditionType };
export type ElectronicsCategoryType = CategoryType;
export type ElectronicsConditionType = ConditionType;

/* ───────────── products ───────────── */
/**
 * Ye types ab `../constants` se aati hain — wohi Prisma enum se match
 * karti hain. Pehle yahan apni alag list likhi hui thi (SMARTPHONE,
 * LAPTOP, USED_GOOD waghera) jo database me hain hi nahi, is liye
 * un options ke saath product save hi nahi hota tha.
 */

export interface ElectronicsProductProfile {
  id: string;
  productId: string;
  brandId?: string;
  categoryType?: CategoryType;
  conditionType?: ConditionType;
  modelNumber?: string;
  partNumber?: string;
  colorName?: string;
  colorHex?: string;
  connectivity: string[];
  powerRating?: string;
  batteryCapacity?: string;
  batteryLifeHours?: number;
  chargingTimeMinutes?: number;
  operatingRange?: string;
  waterResistance?: string;
  screenSize?: string;
  resolution?: string;
  refreshRate?: string;
  compatibleWith: string[];
  compatibleOS: string[];
  weightGrams?: number;
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  warrantyMonths?: number;
  warrantyType?: string;
  hasInternationalWarranty: boolean;
  requiresSerial: boolean;
  hasImei: boolean;
  boxContents: string[];
  hasManual: boolean;
  hasWarrantyCard: boolean;
  mrp?: number;
  costPrice?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  onlinePrice?: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  totalSold: number;
  notes?: string;
  product?: any;
  brand?: any;
  availableSerials?: number;
  createdAt: string;
  updatedAt: string;
}


export const electronicsProductsApi = {
  upsert: (data: Partial<ElectronicsProductProfile>) =>
    apiClient.post('/electronics/products', data).then((r) => r.data as ElectronicsProductProfile),

  list: (params?: {
    brandId?: string;
    categoryType?: string;
    conditionType?: string;
    featured?: boolean;
    bestSeller?: boolean;
    newArrival?: boolean;
    trending?: boolean;
    search?: string;
  }) => apiClient.get('/electronics/products', { params }).then((r) => r.data as ElectronicsProductProfile[]),

  byProduct: (productId: string) =>
    apiClient.get('/electronics/products/by-product/' + productId).then((r) => r.data as ElectronicsProductProfile | null),

  byCategory: () =>
    apiClient.get('/electronics/products/by-category-count').then((r) => r.data as Record<string, number>),

  getOne: (id: string) =>
    apiClient.get('/electronics/products/' + id).then((r) => r.data as ElectronicsProductProfile),

  remove: (id: string, force = false) =>
    apiClient.delete(`/electronics/products/${id}${force ? '?force=true' : ''}`).then((r) => r.data),
};

/* ───────────── serial-tracking ───────────── */
/**
 * Ye dono Prisma ke enums se BILKUL match karte hain.
 * Pehle yahan 'RMA' aur 'DAMAGED' likhe the jo database me hain hi nahi
 * (filter lagate hi khali list aati thi), aur IN_TRANSIT / IN_REPAIR / LOST
 * gayab the — is wajah se un units ka badge undefined ho kar page tor deta tha.
 */
export type SerialStatus =
  | 'IN_STOCK' | 'IN_TRANSIT' | 'SOLD' | 'RESERVED'
  | 'RETURNED' | 'IN_REPAIR' | 'DEFECTIVE' | 'LOST';

export type WarrantyStatus =
  | 'ACTIVE' | 'EXPIRED' | 'VOID' | 'CLAIMED' | 'IN_REPAIR' | 'NO_WARRANTY';

export interface ElectronicsSerial {
  id: string;
  productId: string;
  serialNumber: string;
  imei?: string;
  imei2?: string;
  macAddress?: string;
  status: SerialStatus;
  purchasePrice?: number;
  purchaseDate?: string;
  supplierRef?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyStatus: WarrantyStatus;
  batteryHealthPct?: number;
  screenCondition?: string;
  physicalCondition?: string;
  functionalStatus?: string;
  soldPrice?: number;
  soldAt?: string;
  soldToCustomerId?: string;
  saleId?: string;
  invoiceNumber?: string;
  notes?: string;
  imageUrls: string[];
  product?: any;
  createdAt: string;
  updatedAt: string;
}


/** List se aane wala serial — sath me product ka naam bhi */
export interface SerialWithProduct extends ElectronicsSerial {
  product?: {
    id: string; name: string; sku?: string | null;
    unit?: string; price?: number; costPrice?: number;
    images?: { id: string; url: string }[];
  } | null;
}

export type SerialView = 'all' | 'stock' | 'sold' | 'warranty' | 'expiring' | 'problem' | 'tradein';
export type SerialSort = 'new' | 'old' | 'warranty' | 'cost';

export interface SerialClaimRef { id: string; claimNumber: string; status: WarrantyStatus; resolvedAt?: string | null }

export interface SerialPage {
  items: Array<SerialWithProduct & { claims: SerialClaimRef[] }>;
  total: number;
  page: number;
  pages: number;
  counts: Record<SerialView, number>;
  /** Purchase cost of units on the shelf. */
  shelfCost: number;
}

export interface WarrantyCheck {
  found: boolean;
  serial?: SerialWithProduct & { customer?: { id: string; name: string; phone?: string | null } | null };
  claims?: SerialClaimRef[];
  warranty?: {
    status: WarrantyStatus; type: string | null; startDate: string | null; endDate: string | null;
    isExpired: boolean; daysRemaining: number; isValid: boolean;
  };
}

export interface TradeInPayload {
  productId?: string;
  name?: string;
  brandId?: string;
  categoryId?: string;
  serialNumber: string;
  imei?: string;
  condition?: 'OPEN_BOX' | 'REFURBISHED' | 'USED' | 'DAMAGED' | 'FOR_PARTS';
  value: number;
  salePrice?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  physicalCondition?: string;
  notes?: string;
}

/** Serial units on a set of bills, for sales history. */
export interface SalesSerials {
  serials: Array<{ id: string; saleId: string; saleItemId: string | null; productId: string; serialNumber: string; imei: string | null; status: SerialStatus }>;
  trackedProductIds: string[];
}

export const serialTrackingApi = {
  /** Paged register with counts per view (serials page). */
  page: (params: { view?: SerialView; search?: string; productId?: string; sort?: SerialSort; page?: number; limit?: number }) =>
    apiClient.get('/electronics/serial-tracking/page', { params }).then((r) => r.data as SerialPage),

  /** Used unit bought from a customer: stock in, cash out of the drawer. */
  tradeIn: (data: TradeInPayload) =>
    apiClient.post('/electronics/serial-tracking/trade-in', data)
      .then((r) => r.data as { number: string; serial: ElectronicsSerial; productId: string; value: number; customerId: string | null }),

  create: (data: Partial<ElectronicsSerial>) =>
    apiClient.post('/electronics/serial-tracking', data).then((r) => r.data as ElectronicsSerial),

  /**
   * Bulk serials. `entries` bhejo to IMEI/MAC bhi usi call me set ho jate hain —
   * pehle har serial par alag search+update chalti thi (N+1).
   */
  bulkCreate: (data: {
    productId: string;
    shopId?: string;
    serialNumbers?: string[];
    entries?: { serialNumber: string; imei?: string; imei2?: string; macAddress?: string }[];
    purchasePrice?: number;
    supplierRef?: string;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
  }) =>
    apiClient.post('/electronics/serial-tracking/bulk', data)
      .then((r) => r.data as { created: number; skipped: number; duplicatesInRequest: number }),

  list: (params?: { productId?: string; status?: string; imei?: string; search?: string; shopId?: string }) =>
    apiClient.get('/electronics/serial-tracking', { params }).then((r) => r.data as SerialWithProduct[]),

  /** Units on the given bills (up to 100) and the products on them that need a serial. */
  forSales: (saleIds: string[]) =>
    apiClient.get('/electronics/serial-tracking/for-sales', { params: { saleIds: saleIds.join(',') } })
      .then((r) => r.data as SalesSerials),

  lookup: (code: string) =>
    apiClient.get('/electronics/serial-tracking/lookup/' + encodeURIComponent(code)).then((r) => r.data as ElectronicsSerial | null),

  warrantyCheck: (code: string) =>
    apiClient.get('/electronics/serial-tracking/warranty-check/' + encodeURIComponent(code)).then((r) => r.data as WarrantyCheck),

  getOne: (id: string) =>
    apiClient.get('/electronics/serial-tracking/' + id).then((r) => r.data as ElectronicsSerial),

  update: (id: string, data: Partial<ElectronicsSerial>) =>
    apiClient.patch('/electronics/serial-tracking/' + id, data).then((r) => r.data as ElectronicsSerial),

  sell: (id: string, data: { soldPrice: number; soldToCustomerId?: string; saleId?: string; invoiceNumber?: string }) =>
    apiClient.post('/electronics/serial-tracking/' + id + '/sell', data).then((r) => r.data as ElectronicsSerial),

  returnSerial: (id: string, reason: string) =>
    apiClient.post('/electronics/serial-tracking/' + id + '/return', { reason }).then((r) => r.data as ElectronicsSerial),

  markDefective: (id: string, reason: string) =>
    apiClient.post('/electronics/serial-tracking/' + id + '/defective', { reason }).then((r) => r.data as ElectronicsSerial),

  remove: (id: string) =>
    apiClient.delete('/electronics/serial-tracking/' + id).then((r) => r.data),
};

/* ───────────── warranty-claims ───────────── */
export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  serialTrackingId?: string;
  productId?: string;
  productName: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  purchaseDate: string;
  invoiceNumber?: string;
  serialNumber?: string;
  imei?: string;
  claimDate: string;
  issueDescription: string;
  issueCategory?: string;
  imageUrls: string[];
  documentUrls: string[];
  status: WarrantyStatus;
  receivedAt?: string;
  diagnosedAt?: string;
  resolvedAt?: string;
  diagnosis?: string;
  resolution?: string;
  resolutionType?: string;
  replacementSerialNumber?: string;
  refundAmount: number;
  repairCost: number;
  paidByCustomer: number;
  paidByBrand: number;
  isChargeable: boolean;
  sentToBrand: boolean;
  brandRef?: string;
  brandContactedAt?: string;
  brandResponse?: string;
  internalNotes?: string;
  handledById?: string;
  createdAt: string;
  updatedAt: string;
}

/** Backend ka summary — pehle frontend ghalat naam parh raha tha
 *  (pendingCount/resolvedCount) is liye saare cards 0 dikhate the. */
/** Bill posted for a claim's charge (bill number = claim number). */
export interface ClaimBill { id: string; saleNumber: string; total: number; creditAmount: number; status: string }

export type ClaimRow = WarrantyClaim & { bill: ClaimBill | null };

export type ClaimView = 'open' | 'repair' | 'brand' | 'stale' | 'done' | 'closed' | 'all';

export interface ClaimPage {
  items: ClaimRow[];
  total: number;
  page: number;
  pages: number;
  counts: Record<ClaimView, number>;
}

export type ResolutionType = 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'REJECTED';

export interface ResolvePayload {
  resolutionType: ResolutionType;
  replacementSerialId?: string;
  /** Charge to the customer, billed as a sale. */
  paidByCustomer?: number;
  /** Of the charge, paid now; the rest goes on khata. */
  paidNow?: number;
  paymentMethod?: string;
  /** What the repair cost the shop. */
  repairCost?: number;
  paidByBrand?: number;
  /** The shop's repair cost was paid in cash from the drawer. */
  costFromDrawer?: boolean;
  resolution?: string;
}

export interface WarrantyClaimsSummary {
  total: number;
  active: number;
  claimed: number;
  inRepair: number;
  resolved: number;
  expired: number;
  sentToBrand: number;
  thisMonth: number;
  /** Open for more than a week. */
  stale: number;
  /** active + claimed + inRepair — jin par abhi kaam karna hai */
  pending: number;
  cost: {
    repairCost: number;
    refundAmount: number;
    paidByCustomer: number;
    paidByBrand: number;
    /** Dukan ki apni jeb se kitna gaya */
    shopBore: number;
  };
}


export const warrantyClaimsApi = {
  create: (data: Partial<WarrantyClaim>) =>
    apiClient.post('/electronics/warranty-claims', data).then((r) => r.data as WarrantyClaim),

  page: (params: { view?: ClaimView; search?: string; from?: string; to?: string; sort?: 'new' | 'old'; page?: number; limit?: number }) =>
    apiClient.get('/electronics/warranty-claims/page', { params }).then((r) => r.data as ClaimPage),

  list: (params?: { status?: string; customerId?: string; sentToBrand?: boolean; from?: string; to?: string; search?: string }) =>
    apiClient.get('/electronics/warranty-claims', { params }).then((r) => r.data as WarrantyClaim[]),

  summary: () =>
    apiClient.get('/electronics/warranty-claims/summary').then((r) => r.data as WarrantyClaimsSummary),

  getOne: (id: string) =>
    apiClient.get('/electronics/warranty-claims/' + id).then((r) => r.data as ClaimRow & {
      serial: { id: string; serialNumber: string; status: string; warrantyEndDate?: string | null } | null;
      originalSale: { id: string; saleNumber: string; status: string; soldAt: string; total: number } | null;
    }),

  updateStatus: (id: string, data: { status: WarrantyStatus; diagnosis?: string; resolution?: string; notes?: string }) =>
    apiClient.patch('/electronics/warranty-claims/' + id + '/status', data).then((r) => r.data as WarrantyClaim),

  contactBrand: (id: string, data: { brandRef: string; brandResponse?: string }) =>
    apiClient.post('/electronics/warranty-claims/' + id + '/contact-brand', data).then((r) => r.data as WarrantyClaim),

  resolve: (id: string, data: ResolvePayload) =>
    apiClient.post('/electronics/warranty-claims/' + id + '/resolve', data).then((r) => r.data as WarrantyClaim),

  remove: (id: string) =>
    apiClient.delete('/electronics/warranty-claims/' + id).then((r) => r.data),
};

/* ───────────── bundles ───────────── */
export interface BundleItem {
  productId: string;
  quantity: number;
  /** Normal price of one piece. */
  unitPrice: number;
  /** Stock of the product in the branch in view. */
  stock?: number;
  /** Serial/IMEI product: sold from a bundle without a serial on the bill. */
  serial?: boolean;
  warrantyMonths?: number;
  product?: {
    id: string; name: string; sku?: string | null; unit?: string;
    price?: number; costPrice?: number; stock?: number; isActive?: boolean; imageUrl?: string | null;
  } | null;
}

export interface ElectronicsBundle {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  items: BundleItem[];
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  savingsPct: number;
  isFeatured: boolean;
  isActive: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  /** Live figures from the server. */
  cost?: number;
  profit?: number;
  canMake?: number;
  soldBills?: number;
  expired?: boolean;
  upcoming?: boolean;
  broken?: boolean;
  sellable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BundlePayload {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
  bundlePrice: number;
  isFeatured?: boolean;
  isActive?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
}


export const electronicsBundlesApi = {
  create: (data: BundlePayload) =>
    apiClient.post('/electronics/bundles', data).then((r) => r.data as ElectronicsBundle),

  list: (params?: { active?: boolean; featured?: boolean; search?: string }) =>
    apiClient.get('/electronics/bundles', { params }).then((r) => r.data as ElectronicsBundle[]),

  getOne: (id: string) =>
    apiClient.get('/electronics/bundles/' + id).then((r) => r.data as ElectronicsBundle),

  update: (id: string, data: Partial<BundlePayload>) =>
    apiClient.patch('/electronics/bundles/' + id, data).then((r) => r.data as ElectronicsBundle),

  /** A sold bundle is switched off instead of removed (`archived`). */
  remove: (id: string) =>
    apiClient.delete('/electronics/bundles/' + id).then((r) => r.data as { id: string; archived: boolean }),
};

/* ───────────── electronics-pos ───────────── */
/**
 * Electronics POS catalog — ek hi call me poora counter data.
 * Backend: apps/api/src/industries/electronics/pos/electronics-pos.service.ts
 */

/** POS par dikhne wala ek serial/IMEI-tracked unit */
export interface PosSerial {
  id: string;
  productId: string;
  serialNumber: string;
  imei?: string | null;
  macAddress?: string | null;
  status: string;
  purchasePrice?: number | null;
  warrantyEndDate?: string | null;
  warrantyStatus?: string | null;
  batteryHealthPct?: number | null;
  physicalCondition?: string | null;
}

export interface PosElectronicsProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  /** Shop ka apna rate ho to wohi, warna product ka */
  price: number;
  costPrice: number;
  wholesalePrice?: number | null;
  mrp?: number | null;
  /** Is shop ka stock (global nahi) */
  stock: number;
  lowStockAlert: number;
  hasVariants: boolean;
  /** true = is shop ke liye stock row hi nahi bani — checkout fail hoga */
  notInShop: boolean;
  imageUrl: string | null;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;

  // Electronics ki apni cheezein
  categoryType: CategoryType | null;
  conditionType: ConditionType | null;
  modelNumber: string | null;
  colorName: string | null;
  colorHex: string | null;
  warrantyMonths: number;
  warrantyType: string | null;
  requiresSerial: boolean;
  hasImei: boolean;
  screenSize: string | null;
  connectivity: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;

  // Catalog service se judi hui cheezein
  serials: PosSerial[];
  serialCount: number;
  /** Serial wale product ki asli ginti serials se aati hai */
  availableStock: number;
}

export interface PosBundleItem {
  productId: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
  [k: string]: any;
}

export interface PosBundle {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  items: PosBundleItem[];
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  savingsPct: number;
  isFeatured: boolean;
  totalSold: number;
  validUntil?: string | null;
}

export interface ElectronicsPosCatalog {
  items: PosElectronicsProduct[];
  bundles: PosBundle[];
  counts: { products: number; serialTracked: number; bundles: number };
}


export const electronicsPosApi = {
  catalog: (params: { shopId?: string; search?: string; categoryType?: string }) =>
    apiClient
      .get('/electronics/pos/catalog', { params })
      .then((r) => r.data) as Promise<ElectronicsPosCatalog>,
};

/* ───────────── analytics ───────────── */
/**
 * Electronics analytics — profit (category/condition/brand),
 * low stock, aur stock report (umar + warranty).
 * Backend: apps/api/src/industries/electronics/analytics/
 */

export interface ProfitBucket {
  revenue: number;
  cost: number;
  profit: number;
  units: number;
  margin: number;
}

export interface ElectronicsProfit {
  range: { from: string; to: string };
  totals: ProfitBucket & { salesCount: number };
  byCategory: (ProfitBucket & { categoryType: CategoryType })[];
  byCondition: (ProfitBucket & { conditionType: ConditionType })[];
  topBrands: (ProfitBucket & { id: string; name: string })[];
  topProducts: (ProfitBucket & { id: string; name: string; category: CategoryType | null })[];
  /** Serial-tracked (mehngi) cheezon ka alag hisab */
  serialTracked: { units: number; revenue: number };
  daily: { date: string; revenue: number; profit: number }[];
}

export interface LowStockRow {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  brand: string | null;
  category: string | null;
  categoryType: CategoryType | null;
  conditionType: ConditionType | null;
  requiresSerial: boolean;
  warrantyMonths: number;
  stock: number;
  lowStockAlert: number;
  price: number;
  costPrice: number;
  stockValue: number;
  isOut: boolean;
  notInShop: boolean;
}

export interface ElectronicsLowStock {
  items: LowStockRow[];
  summary: {
    totalLow: number;
    totalOut: number;
    serialTrackedLow: number;
    valueAtRisk: number;
  };
}

export interface StockSerialRow {
  id: string;
  productId: string;
  name: string;
  brand: string | null;
  categoryType: CategoryType | null;
  conditionType: ConditionType | null;
  serialNumber: string;
  imei?: string | null;
  cost: number;
  price: number;
  ageDays: number;
  bucket: string;
  warrantyEndDate?: string | null;
  warrantyStatus?: string | null;
  /** Kitne din baad warranty khatam (minus = khatam ho chuki) */
  warrantyDaysLeft: number | null;
  physicalCondition?: string | null;
}

export interface StockProductRow {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  brand: string | null;
  categoryType: CategoryType | null;
  conditionType: ConditionType | null;
  stock: number;
  unitCost: number;
  price: number;
  value: number;
  retailValue: number;
}

export interface ElectronicsStockReport {
  buckets: { key: string; label: string; min: number; max: number; units: number; value: number }[];
  serials: StockSerialRow[];
  products: StockProductRow[];
  deadStock: { count: number; value: number; items: StockSerialRow[] };
  expiringWarranty: { count: number; items: StockSerialRow[] };
  totals: {
    serialUnits: number;
    serialValue: number;
    productLines: number;
    productUnits: number;
    productValue: number;
    totalValue: number;
    totalRetailValue: number;
    potentialProfit: number;
  };
}


export const electronicsAnalyticsApi = {
  profit: (params: { from?: string; to?: string; shopId?: string } = {}) =>
    apiClient.get('/electronics/analytics/profit', { params }).then((r) => r.data) as Promise<ElectronicsProfit>,

  lowStock: (shopId?: string) =>
    apiClient.get('/electronics/analytics/low-stock', { params: { shopId } }).then((r) => r.data) as Promise<ElectronicsLowStock>,

  stock: (shopId?: string) =>
    apiClient.get('/electronics/analytics/stock', { params: { shopId } }).then((r) => r.data) as Promise<ElectronicsStockReport>,
};

/* ───────────── dashboard ───────────── */
export const electronicsDashboardApi = {
  overview: () =>
    apiClient.get('/electronics/dashboard/overview').then((r) => r.data as any),

  salesReport: (from: string, to: string) =>
    apiClient.get('/electronics/dashboard/sales-report', { params: { from, to } }).then((r) => r.data as any),
};
