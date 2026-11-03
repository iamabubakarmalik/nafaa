/**
 * Mobile shop endpoints (same paths and shapes as apps/web/src/industries/mobile/api):
 * IMEI stock, used phones, installment plans, repair tickets, mobile reports and
 * the counter catalog. Screens that need the server say so offline.
 */

import { apiClient } from '@/core/api/client';
import type { PaymentMethod } from '@nafaa/core/pos';

export type { PaymentMethod };

/* ───────────── imei ───────────── */
export type ImeiStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'RESERVED' | 'LOST';

export type PtaStatus = 'APPROVED' | 'NON_PTA' | 'PATCH' | 'PENDING' | 'EXEMPT';



export interface ProductImei {
  id: string;
  productId: string;
  variantId?: string | null;
  shopId?: string | null;
  imei1: string;
  imei2?: string | null;
  serialNumber?: string | null;
  ptaStatus: PtaStatus;
  ptaTaxPaid: number;
  ptaTaxDueAt?: string | null;
  ptaVerifiedAt?: string | null;
  status: ImeiStatus;
  costPrice: number;
  saleItemId?: string | null;
  soldAt?: string | null;
  soldPrice?: number | null;
  warrantyMonths?: number | null;
  color?: string | null;
  notes?: string | null;
  purchasedAt?: string | null;
  createdAt: string;
  product?: { id: string; name: string; price?: number };
  variant?: { id: string; name: string; color?: string | null; price?: number | null };
}

export interface ImeiWarranty { months: number; start: string | null; end: string | null; active: boolean; daysLeft: number | null }

/** One phone in the IMEI list, with its bill, shelf age and warranty. */
export interface ImeiRow extends Omit<ProductImei, 'product' | 'variant'> {
  product: { id: string; name: string; sku: string | null; price: number; brand: { name: string } | null };
  variant: { id: string; name: string; color: string | null; colorHex: string | null; price: number | null } | null;
  shop: { id: string; name: string } | null;
  salePrice: number;
  sale: { id: string; saleNumber: string; status: string; customer: { id: string; name: string; phone: string | null } | null } | null;
  daysInStock: number | null;
  warranty: ImeiWarranty;
}

export type ImeiSort = 'new' | 'old' | 'costHigh' | 'costLow' | 'sold';

export interface ImeiListParams {
  search?: string;
  status?: ImeiStatus;
  ptaStatus?: PtaStatus;
  productId?: string;
  variantId?: string;
  shopId?: string;
  agedDays?: number;
  from?: string;
  to?: string;
  sort?: ImeiSort;
  page?: number;
  limit?: number;
}

export interface ImeiListPage {
  items: ImeiRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Partial<Record<ImeiStatus, number>>;
  totals: { cost: number; sold: number };
}

export interface CreateImeiPayload {
  productId: string;
  variantId?: string;
  shopId?: string;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  ptaStatus?: PtaStatus;
  ptaTaxPaid?: number;
  costPrice?: number;
  warrantyMonths?: number;
  color?: string;
  notes?: string;
  status?: ImeiStatus;
}

export interface BulkImeiItem {
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  color?: string;
  ptaStatus?: PtaStatus;
  ptaTaxPaid?: number;
  notes?: string;
}

export interface BulkCreateImeiPayload {
  productId: string;
  variantId?: string;
  shopId?: string;
  costPrice?: number;
  warrantyMonths?: number;
  imeis: BulkImeiItem[];
}

export interface ImeiStats {
  total: number;
  inStock: number;
  sold: number;
  returned: number;
  damaged?: number;
  reserved?: number;
  lost?: number;
  stockValue?: number;
  retailValue?: number;
  aged60?: number;
  soldToday?: number;
  soldThisMonth?: number;
  soldThisMonthValue?: number;
  soldThisMonthCost?: number;
  byPta?: Array<{ ptaStatus: PtaStatus; count: number; taxPaid: number }>;
}

/** Everything known about one IMEI: new stock, buy-backs and repairs. */
export interface ImeiLookup {
  code: string;
  luhnOk: boolean | null;
  newPhones: Array<{
    id: string; imei1: string; imei2: string | null; serialNumber: string | null; color: string | null; status: ImeiStatus;
    ptaStatus: PtaStatus; costPrice: number; soldPrice: number | null; purchasedAt: string | null; soldAt: string | null; notes: string | null;
    product: { id: string; name: string; price: number; brand: { name: string } | null }; variant: { id: string; name: string } | null;
    shop: { id: string; name: string } | null;
    sale: { id: string; saleNumber: string; status: string; createdAt: string; price: number; customer: { id: string; name: string; phone: string | null } | null } | null;
    warranty: ImeiWarranty;
  }>;
  usedPhones: Array<{
    id: string; usedPhoneCode: string; brand: string; model: string; storage: string | null; status: string; condition: string; source: string;
    buybackPrice: number; resalePrice: number; finalSoldPrice: number | null; receivedAt: string; soldAt: string | null;
    fromCustomerName: string | null; fromCustomerPhone: string | null; fromCustomerCnic: string | null; ptaStatus: PtaStatus;
    sale: { id: string; saleNumber: string; customer: { name: string; phone: string | null } | null } | null;
  }>;
  repairs: Array<{
    id: string; ticketNumber: string; status: string; deviceBrand: string; deviceModel: string; reportedIssue: string; diagnosedIssue: string | null;
    receivedAt: string; deliveredAt: string | null; warrantyEnds: string | null; warrantyActive: boolean; totalCost: number; customerName: string; customerPhone: string;
    warrantyOf: { id: string; ticketNumber: string } | null;
  }>;
}

/** Phones on the shelf per product next to the branch stock. */
export interface ImeiShelfCount { productId: string; name: string; total: number; inStock: number; stock: number }

/** What left with each bill: IMEIs, used phones, trade-ins and EMI plans. */
export interface ImeiForSales {
  imeis: Array<{ saleId: string; saleItemId: string; imei1: string; imei2: string | null; ptaStatus: PtaStatus; warrantyMonths: number | null; status: ImeiStatus }>;
  used: Array<{ saleId: string; saleItemId: string; usedPhoneCode: string; imei1: string; condition: string; ptaStatus: PtaStatus }>;
  tradeIns: Array<{ saleId: string; amount: number; reference: string | null; note: string | null }>;
  plans: Array<{ id: string; saleId: string | null; planNumber: string; status: string; remainingAmount: number }>;
}


export const imeiApi = {
  stats: (shopId?: string) =>
    apiClient.get('/industries/mobile/imei/stats', { params: { shopId } }).then((r) => r.data) as Promise<ImeiStats>,

  listByProduct: (productId: string, status?: ImeiStatus) =>
    apiClient.get(`/industries/mobile/imei/product/${productId}`, { params: { status } }).then((r) => r.data) as Promise<ProductImei[]>,

  listByVariant: (variantId: string, status?: ImeiStatus) =>
    apiClient.get(`/industries/mobile/imei/variant/${variantId}`, { params: { status } }).then((r) => r.data) as Promise<ProductImei[]>,

  available: (productId: string, variantId?: string) =>
    apiClient
      .get(`/industries/mobile/imei/product/${productId}/available`, { params: { variantId } })
      .then((r) => r.data) as Promise<ProductImei[]>,

  bulkCreate: (payload: BulkCreateImeiPayload) =>
    apiClient.post('/industries/mobile/imei/bulk', payload).then((r) => r.data) as Promise<{ count: number; message: string; badChecksum: string[] }>,

  update: (id: string, payload: Partial<CreateImeiPayload>) =>
    apiClient.patch(`/industries/mobile/imei/${id}`, payload).then((r) => r.data) as Promise<ProductImei>,

  remove: (id: string) =>
    apiClient.delete(`/industries/mobile/imei/${id}`).then((r) => r.data),

  listAll: (params?: ImeiListParams) =>
    apiClient.get('/industries/mobile/imei', { params }).then((r) => r.data) as Promise<ImeiListPage>,

  lookup: (code: string) =>
    apiClient.get('/industries/mobile/imei/lookup', { params: { code } }).then((r) => r.data) as Promise<ImeiLookup>,

  shelfCounts: (shopId?: string) =>
    apiClient.get('/industries/mobile/imei/shelf-counts', { params: { shopId } }).then((r) => r.data) as Promise<ImeiShelfCount[]>,

  forSales: (saleIds: string[]) =>
    apiClient.get('/industries/mobile/imei/for-sales', { params: { ids: saleIds.join(',') } }).then((r) => r.data) as Promise<ImeiForSales>,

  recalcStocks: () =>
    apiClient.post('/industries/mobile/imei/recalc-stocks').then((r) => r.data) as Promise<{ message: string; productsUpdated: number; variantsUpdated: number }>,
};

/* ───────────── used-phones ───────────── */
export type UsedPhoneCondition = 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'POOR';
export type UsedPhoneStatus = 'PENDING_INSPECTION' | 'IN_STOCK' | 'IN_TRANSIT' | 'REPAIRING' | 'SOLD' | 'RETURNED' | 'DISCARDED';
export type UsedPhoneSort = 'new' | 'old' | 'priceHigh' | 'margin' | 'sold';
export type TradeInSource = 'CASH_BUYBACK' | 'EXCHANGE' | 'CONSIGNMENT';


export interface UsedPhone {
  id: string;
  tenantId: string;
  shopId?: string | null;
  usedPhoneCode: string;
  imei1: string;
  imei2?: string | null;
  serialNumber?: string | null;
  brand: string;
  model: string;
  storage?: string | null;
  ram?: string | null;
  color?: string | null;
  modelYear?: number | null;
  ptaStatus: PtaStatus;
  ptaTaxPaid: number;
  condition: UsedPhoneCondition;
  conditionNotes?: string | null;
  hasOriginalBox: boolean;
  hasOriginalCharger: boolean;
  hasOriginalCable: boolean;
  hasOriginalEarphones: boolean;
  hasOriginalReceipt: boolean;
  hasWarrantyLeft: boolean;
  warrantyExpiryDate?: string | null;
  source: TradeInSource;
  buybackPrice: number;
  estimatedValue: number;
  refurbishCost: number;
  totalCost: number;
  resalePrice: number;
  finalSoldPrice?: number | null;
  fromCustomerId?: string | null;
  fromCustomerName?: string | null;
  fromCustomerPhone?: string | null;
  fromCustomerCnic?: string | null;
  cnicPhotoUrl?: string | null;
  imeiPhotoUrl?: string | null;
  devicePhotos: string[];
  status: UsedPhoneStatus;
  receivedAt: string;
  inspectedAt?: string | null;
  soldAt?: string | null;
  notes?: string | null;
  shop?: { id: string; name: string } | null;
  fromCustomer?: { id: string; name: string; phone?: string | null } | null;
  inspections?: UsedPhoneInspection[];
  _count?: { inspections: number };
  /** List only: whole days since it came in. */
  daysInStock?: number;
}

/** One phone with where its money went: drawer payment, trade-in bill, resale bill. */
export interface UsedPhoneDetail extends UsedPhone {
  inspections: UsedPhoneInspection[];
  paidFromDrawer: boolean;
  tradeInBill: { id: string; saleNumber: string } | null;
  sale: { id: string; saleNumber: string; status: string; createdAt: string; total: number; customer: { id: string; name: string; phone: string | null } | null } | null;
  /** Other records of the same IMEI: the phone bought, sold and bought back. */
  history: Array<{
    id: string; usedPhoneCode: string; status: UsedPhoneStatus; source: TradeInSource; receivedAt: string; soldAt: string | null;
    buybackPrice: number; finalSoldPrice: number | null; fromCustomerName: string | null; soldSaleId: string | null;
  }>;
}

export interface UsedPhoneListParams {
  search?: string;
  status?: UsedPhoneStatus;
  condition?: UsedPhoneCondition;
  source?: TradeInSource;
  ptaStatus?: PtaStatus;
  brand?: string;
  shopId?: string;
  from?: string;
  to?: string;
  agedDays?: number;
  sort?: UsedPhoneSort;
  page?: number;
  limit?: number;
}

export interface UsedPhoneListPage {
  items: UsedPhone[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Partial<Record<UsedPhoneStatus, number>>;
  totals: { cost: number; resale: number; sold: number };
}

export interface UsedPhoneInspection {
  id: string;
  usedPhoneId: string;
  screenCondition?: string | null;
  bodyCondition?: string | null;
  cameraWorks?: boolean | null;
  speakerWorks?: boolean | null;
  microphoneWorks?: boolean | null;
  chargingPortWorks?: boolean | null;
  buttonsWork?: boolean | null;
  faceIdFingerprintWorks?: boolean | null;
  batteryHealth?: number | null;
  imeiUnlocked?: boolean | null;
  icloudUnlocked?: boolean | null;
  softwareIssues?: string | null;
  needsRepair: boolean;
  estimatedRepairCost: number;
  recommendedActions?: string | null;
  inspectedAt: string;
}

export interface CreateUsedPhonePayload {
  shopId?: string;
  imei1: string;
  imei2?: string;
  serialNumber?: string;
  brand: string;
  model: string;
  storage?: string;
  ram?: string;
  color?: string;
  modelYear?: number;
  ptaStatus?: PtaStatus;
  ptaTaxPaid?: number;
  condition?: UsedPhoneCondition;
  conditionNotes?: string;
  hasOriginalBox?: boolean;
  hasOriginalCharger?: boolean;
  hasOriginalCable?: boolean;
  hasOriginalEarphones?: boolean;
  hasOriginalReceipt?: boolean;
  hasWarrantyLeft?: boolean;
  warrantyExpiryDate?: string;
  source?: TradeInSource;
  buybackPrice: number;
  estimatedValue?: number;
  refurbishCost?: number;
  resalePrice?: number;
  fromCustomerId?: string;
  fromCustomerName?: string;
  fromCustomerPhone?: string;
  fromCustomerCnic?: string;
  cnicPhotoUrl?: string;
  imeiPhotoUrl?: string;
  devicePhotos?: string[];
  status?: UsedPhoneStatus;
  notes?: string;
}

export interface UsedPhoneStats {
  byStatus: { status: UsedPhoneStatus; count: number }[];
  byCondition: { condition: UsedPhoneCondition; count: number }[];
  inStockCost: number;
  inStockResaleValue: number;
  potentialProfit: number;
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface ValuationResponse {
  suggestedBuyback: number;
  multiplier: number;
  reasoning: string[];
}

export interface ValuationPayload {
  referencePrice: number;
  condition: UsedPhoneCondition;
  modelYear?: number;
  hasOriginalBox?: boolean;
  hasOriginalCharger?: boolean;
  hasOriginalReceipt?: boolean;
  hasWarrantyLeft?: boolean;
  batteryHealth?: number;
}

export interface CreateInspectionPayload {
  screenCondition?: string;
  bodyCondition?: string;
  cameraWorks?: boolean;
  speakerWorks?: boolean;
  microphoneWorks?: boolean;
  chargingPortWorks?: boolean;
  buttonsWork?: boolean;
  faceIdFingerprintWorks?: boolean;
  batteryHealth?: number;
  imeiUnlocked?: boolean;
  icloudUnlocked?: boolean;
  softwareIssues?: string;
  needsRepair?: boolean;
  estimatedRepairCost?: number;
  recommendedActions?: string;
}


export const usedPhonesApi = {
  list: (params?: UsedPhoneListParams) =>
    apiClient.get('/used-phones', { params }).then((r) => r.data) as Promise<UsedPhoneListPage>,

  stats: () =>
    apiClient.get('/used-phones/stats').then((r) => r.data) as Promise<UsedPhoneStats>,

  /** Exchange phones not yet used as a trade-in on a bill. */
  openTradeIns: () =>
    apiClient.get('/used-phones/trade-ins/open').then((r) => r.data) as Promise<Array<{
      id: string; usedPhoneCode: string; brand: string; model: string; storage: string | null; color: string | null;
      buybackPrice: number; fromCustomerName: string | null; fromCustomerId: string | null; receivedAt: string;
    }>>,

  estimate: (payload: ValuationPayload) =>
    apiClient.post('/used-phones/estimate', payload).then((r) => r.data) as Promise<ValuationResponse>,

  getOne: (id: string) =>
    apiClient.get(`/used-phones/${id}`).then((r) => r.data) as Promise<UsedPhone>,

  detail: (id: string) =>
    apiClient.get(`/used-phones/${id}/detail`).then((r) => r.data) as Promise<UsedPhoneDetail>,

  create: (payload: CreateUsedPhonePayload) =>
    apiClient.post('/used-phones', payload).then((r) => r.data) as Promise<UsedPhone & { paidFromDrawer?: boolean }>,

  update: (id: string, payload: Partial<CreateUsedPhonePayload>) =>
    apiClient.patch(`/used-phones/${id}`, payload).then((r) => r.data) as Promise<UsedPhone>,

  addInspection: (id: string, payload: CreateInspectionPayload) =>
    apiClient.post(`/used-phones/${id}/inspection`, payload).then((r) => r.data) as Promise<UsedPhoneInspection>,

  markInStock: (id: string) =>
    apiClient.patch(`/used-phones/${id}/mark-in-stock`).then((r) => r.data) as Promise<UsedPhone>,

  discard: (id: string, reason?: string) =>
    apiClient.patch(`/used-phones/${id}/discard`, { reason }).then((r) => r.data) as Promise<UsedPhone>,
};

/* ───────────── emi ───────────── */
export type EmiPlanStatus = 'ACTIVE' | 'COMPLETED' | 'DEFAULTED' | 'CANCELLED';
export type EmiInstallmentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';
export type EmiView = 'active' | 'overdue' | 'upcoming' | 'done' | 'all';
export type EmiSort = 'new' | 'old' | 'due' | 'remaining';

export interface EmiInstallment {
  id: string;
  planId?: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  paidAmount: number;
  status: EmiInstallmentStatus;
  notes?: string | null;
}

export interface EmiPlan {
  id: string;
  saleId?: string | null;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  planNumber: string;
  totalAmount: number;
  downPayment: number;
  financedAmount: number;
  installmentCount: number;
  installmentAmount: number;
  startDate: string;
  paidAmount: number;
  remainingAmount: number;
  status: EmiPlanStatus;
  notes?: string | null;
  createdAt: string;
  installments: EmiInstallment[];
  overdueCount: number;
  overdueAmount: number;
  nextDueDate?: string | null;
  nextDueAmount: number;
  paidInstallmentCount: number;
}

/** One plan with its customer, bill and the khata entries made against it. */
export interface EmiPlanDetail extends EmiPlan {
  customer: { id: string; name: string; phone?: string | null; cnic?: string | null; address?: string | null; balance: number } | null;
  sale: {
    id: string; saleNumber: string; status: string; soldAt: string; total: number; paidAmount: number; creditAmount: number;
    items: Array<{ id: string; quantity: number; price: number; total: number; note: string | null; product: { id: string; name: string } | null }>;
  } | null;
  payments: Array<{ id: string; type: string; amount: number; note: string | null; paymentMethod: PaymentMethod | null; createdAt: string }>;
}

export interface EmiListPage {
  items: EmiPlan[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<Exclude<EmiView, 'all'>, number> & { all: number };
  totals: { financed: number; collected: number; remaining: number };
}

export interface EmiStats {
  byStatus: { status: EmiPlanStatus; count: number }[];
  activeFinanced: number;
  activePaid: number;
  activeRemaining: number;
  overdueCount: number;
  overdueAmount: number;
  upcomingCount: number;
  upcomingAmount: number;
  collectedThisMonth: number;
  collectedCountThisMonth: number;
}

export interface CreateEmiPlanPayload {
  saleId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  downPayment?: number;
  installmentCount: number;
  startDate: string;
  notes?: string;
}

export interface EmiListParams {
  search?: string;
  status?: EmiPlanStatus;
  customerId?: string;
  filter?: 'ONLY_OVERDUE' | 'ONLY_UPCOMING';
  view?: EmiView;
  sort?: EmiSort;
  page?: number;
  limit?: number;
}


export const emiApi = {
  list: (params?: EmiListParams) =>
    apiClient.get('/emi-plans', { params }).then((r) => r.data) as Promise<EmiListPage>,

  stats: () => apiClient.get('/emi-plans/stats').then((r) => r.data) as Promise<EmiStats>,

  getOne: (id: string) => apiClient.get(`/emi-plans/${id}`).then((r) => r.data) as Promise<EmiPlanDetail>,

  create: (payload: CreateEmiPlanPayload) => apiClient.post('/emi-plans', payload).then((r) => r.data) as Promise<EmiPlan>,

  update: (id: string, payload: { customerName?: string; customerPhone?: string; notes?: string; startDate?: string }) =>
    apiClient.patch(`/emi-plans/${id}`, payload).then((r) => r.data) as Promise<EmiPlan>,

  /** Any amount; the oldest open installments are settled first. */
  collect: (id: string, payload: { amount: number; paymentMethod?: PaymentMethod; notes?: string }) =>
    apiClient.post(`/emi-plans/${id}/collect`, payload).then((r) => r.data) as Promise<{ plan: EmiPlan; installments: number[] }>,

  waive: (planId: string, installmentId: string, reason: string) =>
    apiClient.patch(`/emi-plans/${planId}/installments/${installmentId}/waive`, { reason }).then((r) => r.data),

  markDefaulted: (id: string, reason?: string) => apiClient.patch(`/emi-plans/${id}/default`, { reason }).then((r) => r.data),

  cancel: (id: string, reason?: string) => apiClient.patch(`/emi-plans/${id}/cancel`, { reason }).then((r) => r.data),
};

/* ───────────── repairs ───────────── */
export type RepairStatus =
  | 'RECEIVED'
  | 'DIAGNOSED'
  | 'AWAITING_APPROVAL'
  | 'AWAITING_PARTS'
  | 'IN_PROGRESS'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'UNREPAIRABLE';

export type RepairPriority = 'NORMAL' | 'URGENT' | 'EMERGENCY';
export type RepairPaymentStatus = 'PENDING' | 'ADVANCE_PAID' | 'FULLY_PAID';
export type RepairView = 'open' | 'working' | 'ready' | 'handover' | 'late' | 'unpaid' | 'closed' | 'warranty' | 'all';
export type RepairSort = 'new' | 'old' | 'due' | 'amount';
export type PartSource = 'OWN_STOCK' | 'PURCHASED_FOR_REPAIR' | 'CUSTOMER_PROVIDED';

/** Allowed next statuses; DELIVERED always goes through the deliver step. */
export const REPAIR_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  RECEIVED: ['DIAGNOSED', 'CANCELLED', 'UNREPAIRABLE'],
  DIAGNOSED: ['AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'CANCELLED', 'UNREPAIRABLE'],
  AWAITING_APPROVAL: ['AWAITING_PARTS', 'IN_PROGRESS', 'CANCELLED', 'UNREPAIRABLE'],
  AWAITING_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'AWAITING_PARTS', 'UNREPAIRABLE', 'CANCELLED'],
  READY: ['DELIVERED', 'IN_PROGRESS'],
  DELIVERED: [],
  CANCELLED: [],
  UNREPAIRABLE: ['DELIVERED', 'CANCELLED'],
};

export interface RepairPart {
  id: string;
  ticketId: string;
  productId?: string | null;
  partName: string;
  partNumber?: string | null;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalPrice: number;
  source?: string | null;
  notes?: string | null;
  createdAt: string;
  product?: { id: string; name: string; unit: string } | null;
}

export interface RepairStatusLog {
  id: string;
  fromStatus?: RepairStatus | null;
  toStatus: RepairStatus;
  note?: string | null;
  changedAt: string;
}

export interface RepairPaymentRecord {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
}

export interface RepairTicket {
  id: string;
  shopId?: string | null;
  ticketNumber: string;
  imei1?: string | null;
  imei2?: string | null;
  serialNumber?: string | null;
  deviceBrand: string;
  deviceModel: string;
  deviceColor?: string | null;
  passcode?: string | null;
  hasSimCard: boolean;
  hasMemoryCard: boolean;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerCnic?: string | null;
  customerAddress?: string | null;
  reportedIssue: string;
  diagnosedIssue?: string | null;
  diagnosisNotes?: string | null;
  recommendedActions?: string | null;
  status: RepairStatus;
  priority: RepairPriority;
  paymentStatus: RepairPaymentStatus;
  estimatedCost: number;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  advancePaid: number;
  paidAmount: number;
  balanceDue: number;
  discount: number;
  receivedAt: string;
  diagnosedAt?: string | null;
  startedAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  estimatedReadyAt?: string | null;
  technicianId?: string | null;
  technicianName?: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
  notes?: string | null;
  warrantyDays: number;
  warrantyEnds?: string | null;
  saleId?: string | null;
  customer?: { id: string; name: string; phone?: string | null; cnic?: string | null; address?: string | null; balance?: number } | null;
  shop?: { id: string; name: string } | null;
  sale?: { id: string; saleNumber: string; total?: number; paidAmount?: number; creditAmount?: number; status?: string } | null;
  parts?: RepairPart[];
  statusLog?: RepairStatusLog[];
  payments?: RepairPaymentRecord[];
  /** Detail only: the earlier job this one is a warranty claim of. */
  warrantyOf?: { id: string; ticketNumber: string; status: RepairStatus; deliveredAt: string | null; warrantyEnds: string | null; reportedIssue: string; diagnosedIssue: string | null } | null;
  /** Detail only: warranty claims made on this job. */
  warrantyRepairs?: Array<{ id: string; ticketNumber: string; status: RepairStatus; receivedAt: string; reportedIssue: string }>;
  _count?: { parts: number; payments: number };
  /** List only. */
  isLate?: boolean;
  daysInShop?: number;
  warrantyActive?: boolean;
}

export interface RepairListPage {
  items: RepairTicket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Partial<Record<RepairStatus, number>>;
  totals: { bill: number; estimate: number; paid: number; due: number };
}

export interface RepairStats {
  byStatus: { status: RepairStatus; count: number }[];
  byPriority: { priority: RepairPriority; count: number }[];
  todayCount: number;
  monthRevenue: number;
  monthDelivered: number;
  totalRevenue: number;
  totalDelivered: number;
  openTickets: number;
  late: number;
  readyDue: number;
  deliveredToday: number;
}

export interface RepairListParams {
  search?: string;
  status?: RepairStatus;
  priority?: RepairPriority;
  view?: RepairView;
  technician?: string;
  customerId?: string;
  shopId?: string;
  from?: string;
  to?: string;
  sort?: RepairSort;
  page?: number;
  limit?: number;
}

export interface RepairTicketPayload {
  shopId?: string;
  imei1?: string;
  imei2?: string;
  serialNumber?: string;
  deviceBrand: string;
  deviceModel: string;
  deviceColor?: string;
  passcode?: string;
  hasSimCard?: boolean;
  hasMemoryCard?: boolean;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerCnic?: string;
  customerAddress?: string;
  reportedIssue: string;
  priority?: RepairPriority;
  estimatedCost?: number;
  advancePaid?: number;
  advanceMethod?: PaymentMethod;
  estimatedReadyAt?: string;
  technicianName?: string;
  beforePhotos?: string[];
  notes?: string;
  warrantyDays?: number;
  warrantyOf?: string;
}

export interface DiagnosePayload {
  diagnosedIssue: string;
  diagnosisNotes?: string;
  recommendedActions?: string;
  estimatedCost: number;
  laborCost?: number;
}

export interface AddPartPayload {
  productId?: string;
  partName: string;
  partNumber?: string;
  quantity: number;
  unitCost?: number;
  unitPrice: number;
  source?: PartSource;
  notes?: string;
}


export const repairsApi = {
  list: (params?: RepairListParams) =>
    apiClient.get('/repair-tickets', { params }).then((r) => r.data) as Promise<RepairListPage>,

  stats: (shopId?: string) =>
    apiClient.get('/repair-tickets/stats', { params: { shopId } }).then((r) => r.data) as Promise<RepairStats>,

  technicians: () =>
    apiClient.get('/repair-tickets/technicians').then((r) => r.data) as Promise<Array<{ name: string; total: number; open: number }>>,

  /** One step at the counter: take the balance, hand the phone back, post the bill. */
  deliver: (id: string, payload: { amount?: number; paymentMethod?: string; note?: string }) =>
    apiClient.post(`/repair-tickets/${id}/deliver`, payload).then((r) => r.data) as Promise<{
      ticket: RepairTicket;
      sale: { id: string; saleNumber: string; total: number; paidAmount?: number; creditAmount?: number } | null;
    }>,

  getOne: (id: string) => apiClient.get(`/repair-tickets/${id}`).then((r) => r.data) as Promise<RepairTicket>,

  create: (payload: RepairTicketPayload) => apiClient.post('/repair-tickets', payload).then((r) => r.data) as Promise<RepairTicket>,

  update: (id: string, payload: Partial<RepairTicketPayload> & { laborCost?: number; discount?: number; afterPhotos?: string[] }) =>
    apiClient.patch(`/repair-tickets/${id}`, payload).then((r) => r.data) as Promise<RepairTicket>,

  diagnose: (id: string, payload: DiagnosePayload) =>
    apiClient.post(`/repair-tickets/${id}/diagnose`, payload).then((r) => r.data) as Promise<RepairTicket>,

  addPart: (id: string, payload: AddPartPayload) =>
    apiClient.post(`/repair-tickets/${id}/parts`, payload).then((r) => r.data) as Promise<RepairPart>,

  removePart: (id: string, partId: string) =>
    apiClient.delete(`/repair-tickets/${id}/parts/${partId}`).then((r) => r.data) as Promise<RepairTicket>,

  updateStatus: (id: string, payload: { toStatus: RepairStatus; note?: string }) =>
    apiClient.patch(`/repair-tickets/${id}/status`, payload).then((r) => r.data) as Promise<RepairTicket>,

  addPayment: (id: string, payload: { amount: number; paymentMethod?: PaymentMethod; reference?: string; notes?: string }) =>
    apiClient.post(`/repair-tickets/${id}/payments`, payload).then((r) => r.data) as Promise<RepairPaymentRecord>,
};

/* ───────────── mobile-reports ───────────── */
export interface MobileDashboard {
  newPhonesInStock: number;
  newPhonesStockValue: number;
  ptaTaxLocked: number;
  usedPhonesInStock: number;
  usedPhonesStockValue: number;
  usedPhonesPotentialRevenue: number;
  openRepairTickets: number;
  activeEmiPlans: number;
  emiOutstanding: number;
  monthRevenue: number;
  monthCogs: number;
  monthProfit: number;
  monthSalesCount: number;
}

export interface PtaBreakdownRow {
  ptaStatus: PtaStatus;
  count: number;
  taxPaid: number;
  stockValue: number;
}

export interface TopBrand {
  brandId: string;
  brandName: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  margin: number;
}

export interface RepairAnalytics {
  byStatus: { status: RepairStatus; count: number }[];
  delivered: number;
  totalRevenue: number;
  partsCost: number;
  laborRevenue: number;
  collected: number;
  /** What the parts cost the shop. */
  partsOwnCost: number;
  grossProfit: number;
  topBrands: { brand: string; count: number }[];
}

export interface EmiAnalytics {
  byStatus: { status: EmiPlanStatus; count: number; financed: number; remaining: number }[];
  activeFinanced: number;
  activePaid: number;
  activeRemaining: number;
  overdueCount: number;
  overdueAmount: number;
  collectedThisMonth: number;
  collectedCountThisMonth: number;
}

export interface UsedPhoneAnalytics {
  byCondition: { condition: UsedPhoneCondition; count: number; totalCost: number; resalePrice: number }[];
  soldCount: number;
  soldRevenue: number;
  soldCogs: number;
  soldProfit: number;
  inStockCount: number;
  inStockCost: number;
  inStockResale: number;
  inStockPotentialProfit: number;
}


/* ── Profit by source ─────────────────────────────────────── */

export type ProfitSourceKey = 'NEW_PHONE' | 'USED_PHONE' | 'ACCESSORY' | 'REPAIR';

export interface ProfitSourceRow {
  key: ProfitSourceKey;
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  units: number;
  sales: number;
  margin: number;
}

export interface ProfitByProductRow {
  productId: string;
  name: string;
  brand: string | null;
  revenue: number;
  cost: number;
  profit: number;
  units: number;
  margin: number;
}

export interface ProfitBySource {
  range: { from: string; to: string };
  sources: ProfitSourceRow[];
  totals: { revenue: number; cost: number; profit: number; units: number; margin: number; salesCount: number };
  topProducts: ProfitByProductRow[];
  daily: { date: string; revenue: number; profit: number }[];
}

/* ── Low stock ────────────────────────────────────────────── */

export interface LowStockPhoneRow {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  color: string | null;
  brand: string | null;
  sku: string | null;
  inStock: number;
  lowStockAlert: number;
  price: number;
  stockValue: number;
  isOut: boolean;
}

export interface LowStockAccessoryRow {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  brand: string | null;
  stock: number;
  lowStockAlert: number;
  price: number;
  isOut: boolean;
  notInShop: boolean;
}

export interface MobileLowStock {
  phones: LowStockPhoneRow[];
  accessories: LowStockAccessoryRow[];
  summary: {
    phoneModelsLow: number;
    phoneModelsOut: number;
    accessoriesLow: number;
    accessoriesOut: number;
  };
}

/* ── Stock aging ──────────────────────────────────────────── */

export interface AgingBucket {
  key: string;
  label: string;
  min: number;
  max: number;
  phones: number;
  phoneValue: number;
  usedPhones: number;
  usedValue: number;
}

export interface AgingItem {
  kind: 'NEW' | 'USED';
  id: string;
  ref: string;
  name: string;
  variantName: string | null;
  brand: string | null;
  color: string | null;
  ptaStatus: PtaStatus | null;
  condition?: string;
  cost: number;
  price: number;
  ageDays: number;
  bucket: string;
}

export interface StockAccessoryRow {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  brand: string | null;
  category: string | null;
  stock: number;
  unitCost: number;
  price: number;
  /** stock × khareed qeemat */
  value: number;
  /** stock × bechne ki qeemat */
  retailValue: number;
  lowStockAlert: number;
  isLow: boolean;
  isOut: boolean;
}

export interface MobileStockAging {
  buckets: AgingBucket[];
  items: AgingItem[];
  accessories: StockAccessoryRow[];
  deadStock: { count: number; value: number; items: AgingItem[] };
  totals: {
    phones: number;
    phoneValue: number;
    usedPhones: number;
    usedValue: number;
    accessories: number;
    accessoryUnits: number;
    accessoryValue: number;
    totalValue: number;
    totalRetailValue: number;
    potentialProfit: number;
  };
}


export const mobileReportsApi = {
  dashboard: () =>
    apiClient.get('/mobile-reports/dashboard').then((r) => r.data) as Promise<MobileDashboard>,
  ptaBreakdown: () =>
    apiClient.get('/mobile-reports/pta-breakdown').then((r) => r.data) as Promise<PtaBreakdownRow[]>,
  topBrands: (days = 30) =>
    apiClient.get('/mobile-reports/top-brands', { params: { days } }).then((r) => r.data) as Promise<TopBrand[]>,
  repairAnalytics: (days = 30) =>
    apiClient.get('/mobile-reports/repair-analytics', { params: { days } }).then((r) => r.data) as Promise<RepairAnalytics>,
  emiAnalytics: () =>
    apiClient.get('/mobile-reports/emi-analytics').then((r) => r.data) as Promise<EmiAnalytics>,
  usedPhoneAnalytics: (days = 30) =>
    apiClient.get('/mobile-reports/used-phone-analytics', { params: { days } }).then((r) => r.data) as Promise<UsedPhoneAnalytics>,

  /** Kamai kahan se aa rahi hai — naya phone / used / accessory / repair. */
  profitBySource: (params: { from?: string; to?: string; shopId?: string } = {}) =>
    apiClient.get('/mobile-reports/profit-by-source', { params }).then((r) => r.data) as Promise<ProfitBySource>,

  lowStock: (shopId?: string) =>
    apiClient.get('/mobile-reports/low-stock', { params: { shopId } }).then((r) => r.data) as Promise<MobileLowStock>,

  stockAging: (shopId?: string) =>
    apiClient.get('/mobile-reports/stock-aging', { params: { shopId } }).then((r) => r.data) as Promise<MobileStockAging>,
};

/* ───────────── mobile-pos ───────────── */
/**
 * Mobile POS catalog — ek hi call me POS ki teeno tabs ka data.
 * Backend: apps/api/src/industries/mobile/pos/mobile-pos.service.ts
 */

/** IN_STOCK naya phone, resolved sale price ke saath. */
export interface PosPhone extends Omit<ProductImei, 'product' | 'variant'> {
  /** variant.price ?? product.price — wohi jo checkout par lagta hai */
  salePrice: number;
  resolvedCostPrice: number;
  productName: string;
  brandName: string | null;
  imageUrl: string | null;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    unit?: string | null;
    price: number;
    costPrice: number;
    images?: { url: string }[];
  } | null;
  variant?: {
    id: string;
    name: string;
    color?: string | null;
    colorHex?: string | null;
    price: number;
    costPrice: number;
  } | null;
}

/** Non-IMEI product (charger, cover, handsfree...) — stock current shop ka. */
export interface PosAccessory {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockAlert: number;
  hasVariants: boolean;
  imageUrl: string | null;
  /** true = is shop ke liye stock row hi nahi bani (checkout fail hoga) */
  notInShop: boolean;
}

export interface MobilePosCatalog {
  phones: PosPhone[];
  usedPhones: UsedPhone[];
  accessories: PosAccessory[];
  /** Products sold by IMEI (any status), so they are never sold as plain products. */
  phoneProductIds: string[];
  /** Trade-in ho chuke lekin inspection me atke phones — ye POS me nahi bikte */
  usedPhonesPendingInspection: number;
  counts: { phones: number; usedPhones: number; accessories: number };
}


export const mobilePosApi = {
  catalog: (params: { shopId?: string; search?: string }) =>
    apiClient
      .get('/industries/mobile/pos/catalog', { params })
      .then((r) => r.data) as Promise<MobilePosCatalog>,
};
