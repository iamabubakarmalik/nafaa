/**
 * Dairy endpoints (same paths and shapes as apps/web/src/industries/dairy/api):
 * delivery customers and routes, home deliveries, milk suppliers and intake,
 * production, quality tests, monthly bills and the product profile. They need the
 * server; screens show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const put = <T>(path: string, body?: object) => apiClient.put<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);


// ───── customers ─────

export type DeliveryFrequency = 'DAILY' | 'ALTERNATE_DAY' | 'WEEKLY' | 'ON_DEMAND'
  | 'MORNING_ONLY' | 'EVENING_ONLY' | 'MORNING_EVENING';

export type KhataStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'DEFAULTED';

export interface DairyCustomer {
  id: string;
  customerNumber: string;
  customerId?: string;
  routeId?: string;
  name: string;
  phone?: string;
  cnic?: string;
  address?: string;
  city?: string;
  area?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  deliveryFrequency: DeliveryFrequency;
  morningQuantity: number;
  eveningQuantity: number;
  productPreference?: string;
  containerType?: string;
  customRate?: number;
  billingCycle: string;
  currentBalance: number;
  totalPurchases: number;
  totalPayments: number;
  advancePayment: number;
  totalDeliveries: number;
  missedDeliveries: number;
  lastDeliveryDate?: string;
  lastPaymentDate?: string;
  status: KhataStatus;
  startDate: string;
  pausedFrom?: string;
  pausedTo?: string;
  notes?: string;
  photoUrl?: string;
  /** Balance comes from the shared khata once linked. */
  khataLinked?: boolean;
  route?: { id: string; name: string; routeNumber: string; slot: string } | null;
  recentDeliveries?: DairyDelivery[];
  bills?: MonthlyBill[];
  createdAt: string;
  updatedAt: string;
}


export type CustomerTab = 'all' | 'active' | 'paused' | 'owing' | 'closed';
export interface CustomerPage {
  items: DairyCustomer[];
  total: number;
  page: number;
  limit: number;
  counts: Record<CustomerTab, number>;
  totals: { dailyLiters: number; owed: number; advance: number; unlinked: number };
}
export interface CustomerQuery { tab?: CustomerTab; search?: string; routeId?: string; page?: number; limit?: number }

/** Body for create and edit; money moves only through payments and deliveries. */
export interface CustomerInput {
  name: string; phone?: string; cnic?: string; address?: string; area?: string; landmark?: string; city?: string;
  routeId?: string; deliveryFrequency?: DeliveryFrequency; morningQuantity?: number; eveningQuantity?: number;
  productPreference?: string; containerType?: string; customRate?: number | null; billingCycle?: string;
  startDate?: string; notes?: string; customerId?: string; advancePayment?: number; advanceMethod?: string;
}

export const dairyCustomersApi = {
  page: (params: CustomerQuery) => get<CustomerPage>('/dairy/customers', { ...params, page: params.page ?? 1 }),
  save: (id: string | undefined, data: Partial<CustomerInput>) => (id ? patch<DairyCustomer>('/dairy/customers/' + id, data) : post<DairyCustomer>('/dairy/customers', data)),
  reopen: (id: string) => post<DairyCustomer>('/dairy/customers/' + id + '/reopen'),
  create: (data: Partial<DairyCustomer>) => post<DairyCustomer>('/dairy/customers', data),
  list: (params?: object) => get<DairyCustomer[]>('/dairy/customers', params),
  summary: () => get<unknown>('/dairy/customers/summary'),
  outstanding: () => get<DairyCustomer[]>('/dairy/customers/outstanding'),
  getOne: (id: string) => get<DairyCustomer>('/dairy/customers/' + id),
  update: (id: string, data: Partial<DairyCustomer>) => patch<DairyCustomer>('/dairy/customers/' + id, data),
  payment: (id: string, data: { amount: number; paymentMethod?: string; reference?: string; notes?: string }) =>
    post<DairyCustomer>('/dairy/customers/' + id + '/payments', data),
  pause: (id: string, data: { pausedFrom: string; pausedTo: string; reason?: string }) =>
    post<DairyCustomer>('/dairy/customers/' + id + '/pause', data),
  resume: (id: string) => post<DairyCustomer>('/dairy/customers/' + id + '/resume'),
  close: (id: string, reason?: string) => post<DairyCustomer>('/dairy/customers/' + id + '/close', { reason }),
};

// ───── deliveries ─────

export type DeliveryStatus = 'SCHEDULED' | 'DELIVERED' | 'SKIPPED' | 'MISSED' | 'RETURNED' | 'CANCELLED';

export interface DairyDelivery {
  id: string;
  dairyCustomerId: string;
  routeId?: string;
  deliveryDate: string;
  slot: string;
  scheduledQty: number;
  deliveredQty: number;
  returnedQty: number;
  unit: string;
  status: DeliveryStatus;
  skipReason?: string;
  ratePerLiter: number;
  totalAmount: number;
  isPaid: boolean;
  paidAmount: number;
  containerReturned: boolean;
  deliveredAt?: string;
  notes?: string;
  customerSignature?: string;
  customer?: (Pick<DairyCustomer, 'id' | 'name' | 'customerNumber' | 'phone' | 'address' | 'area'> & { route?: { id: string; name: string } | null }) | null;
  createdAt: string;
}

export interface DeliverySummary {
  date: string; totalDeliveries: number; totalLiters: number; totalRevenue: number; collected: number;
  deliveredCount: number; skippedCount: number; pendingCount: number; pendingLiters: number; morningLiters: number; eveningLiters: number;
}

export interface ConfirmInput { deliveredQty: number; paidAmount?: number; paymentMethod?: string; containerReturned?: boolean; notes?: string; managerPin?: string }


export const dairyDeliveriesApi = {
  sheet: (params: { from?: string; to?: string; slot?: string; routeId?: string; status?: string; search?: string; customerId?: string }) =>
    get<DairyDelivery[]>('/dairy/deliveries', params),
  summary: (date?: string) => get<DeliverySummary>('/dairy/deliveries/daily-summary', { date }),
  deliver: (id: string, data: ConfirmInput) => post<DairyDelivery>('/dairy/deliveries/' + id + '/confirm', data),
  confirmAll: (data: { date?: string; slot?: string; routeId?: string; ids?: string[] }) =>
    post<{ total: number; done: number; failed: Array<{ id: string; reason: string }> }>('/dairy/deliveries/confirm-all', data),
  markSkipped: (id: string, data: { reason?: string; managerPin?: string }) => post<DairyDelivery>('/dairy/deliveries/' + id + '/skip', data),
  markCancelled: (id: string, data: { reason?: string; managerPin?: string }) => post<DairyDelivery>('/dairy/deliveries/' + id + '/cancel', data),
  add: (data: { dairyCustomerId: string; deliveryDate?: string; slot?: string; scheduledQty: number; ratePerLiter?: number; notes?: string; deliverNow?: boolean }) =>
    post<DairyDelivery>('/dairy/deliveries', data),
  generate: (data: { date?: string; slot?: string; routeId?: string }) =>
    post<{ generatedCount: number; date: string; slot: string }>('/dairy/deliveries/bulk-generate', data),
  create: (data: object) => post<DairyDelivery>('/dairy/deliveries', data),
  bulkGenerate: (data: { date?: string; slot?: string; routeId?: string }) =>
    post<unknown>('/dairy/deliveries/bulk-generate', data),
  list: (params?: object) => get<DairyDelivery[]>('/dairy/deliveries', params),
  today: (slot?: string, routeId?: string) => get<DairyDelivery[]>('/dairy/deliveries/today', { slot, routeId }),
  confirm: (id: string, data: { deliveredQty: number; returnedQty?: number; customerSignature?: string; notes?: string }) =>
    post<DairyDelivery>('/dairy/deliveries/' + id + '/confirm', data),
  skip: (id: string, reason: string) => post<DairyDelivery>('/dairy/deliveries/' + id + '/skip', { reason }),
  cancel: (id: string) => post<DairyDelivery>('/dairy/deliveries/' + id + '/cancel'),
};

// ───── farmer-supplies ─────

export type DeliverySlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export interface FarmerSupply {
  id: string;
  farmerId: string;
  supplyDate: string;
  slot: DeliverySlot;
  quantity: number;
  unit: string;
  fatContent?: number;
  snfContent?: number;
  quality?: string;
  ratePerLiter: number;
  fatBonus: number;
  otherAdjustment: number;
  totalAmount: number;
  isPaid: boolean;
  paidAt?: string;
  notes?: string;
  farmer?: { id: string; name: string; farmerNumber: string; village?: string | null; phone?: string | null } | null;
  createdAt: string;
}

export interface SupplySummary {
  date: string; totalSupplies: number; totalLiters: number; totalAmount: number; averageRate: number; averageFat: number | null;
  morningLiters: number; eveningLiters: number; farmersCount: number;
}

/** Notes of a cancelled slip start with this. */
export const isCancelledSupply = (s: Pick<FarmerSupply, 'notes'>) => !!s.notes?.startsWith('CANCELLED:');


export const farmerSuppliesApi = {
  entries: (params: { from?: string; to?: string; slot?: string; farmerId?: string; quality?: string; search?: string }) =>
    get<FarmerSupply[]>('/dairy/farmer-supplies', params),
  summary: (date?: string) => get<SupplySummary>('/dairy/farmer-supplies/daily-summary', { date }),
  add: (data: { farmerId: string; supplyDate?: string; slot?: string; quantity: number; fatContent?: number; snfContent?: number; quality?: string; ratePerLiter?: number; otherAdjustment?: number; notes?: string }) =>
    post<FarmerSupply & { stockProduct?: { id: string; name: string } | null }>('/dairy/farmer-supplies', data),
  pay: (id: string, pay: { paymentMethod?: string; accountId?: string } = {}) => post<FarmerSupply>('/dairy/farmer-supplies/' + id + '/mark-paid', pay),
  cancel: (id: string, reason?: string) => post<FarmerSupply>('/dairy/farmer-supplies/' + id + '/cancel', { reason }),
  create: (data: object) => post<FarmerSupply>('/dairy/farmer-supplies', data),
  list: (params?: object) => get<FarmerSupply[]>('/dairy/farmer-supplies', params),
  byFarmer: (farmerId: string, params?: { from?: string; to?: string }) =>
    get<FarmerSupply[]>('/dairy/farmer-supplies/by-farmer/' + farmerId, params),
  remove: (id: string) => del<unknown>('/dairy/farmer-supplies/' + id),
};

// ───── farmers ─────

export type BillingCycle = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface DairyFarmer {
  id: string;
  farmerNumber: string;
  name: string;
  fatherName?: string;
  cnic?: string;
  phone?: string;
  address?: string;
  village?: string;
  city?: string;
  cattleCount?: number;
  buffaloCount?: number;
  cowCount?: number;
  goatCount?: number;
  totalCapacityLiters?: number;
  ratePerLiter: number;
  fatBonusRate: number;
  paymentCycle: BillingCycle;
  currentBalance: number;
  totalSupplied: number;
  totalPaid: number;
  avgFatContent?: number;
  avgSnfContent?: number;
  qualityRating?: number;
  lastSupplyDate?: string;
  lastPaymentDate?: string;
  photoUrl?: string;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  notes?: string;
  isActive: boolean;
  recentSupplies?: FarmerSupply[];
  /** Every payment, newest first (bank, JazzCash and drawer cash). */
  payments?: FarmerPaymentLine[];
  createdAt: string;
  updatedAt: string;
}


export interface FarmerInput {
  name: string; fatherName?: string; cnic?: string; phone?: string; address?: string; village?: string; city?: string;
  buffaloCount?: number; cowCount?: number; totalCapacityLiters?: number; ratePerLiter?: number; fatBonusRate?: number;
  paymentCycle?: BillingCycle; notes?: string; isActive?: boolean;
}
export interface FarmerPaymentLine {
  id: string; date: string; amount: number; method: string;
  /** Account the money left from; null for drawer cash. */
  accountName: string | null; reference: string | null; note: string | null;
  /** Cash paid before payments were recorded on their own. */
  legacy: boolean;
}
export interface FarmerPayInput { amount: number; paymentMethod: string; accountId?: string; reference?: string; notes?: string }
export interface PayAccount { id: string; name: string; kind: string; method: string | null; isDefault: boolean; shopName: string | null }
export interface FarmerStatement {
  farmer: { id: string; name: string; farmerNumber: string; phone?: string | null; village?: string | null; ratePerLiter: number };
  from: string; to: string; opening: number; unrecorded: number; liters: number; milkIn: number; paidOut: number; closing: number; currentBalance: number;
  lines: Array<{ date: string; kind: 'MILK' | 'PAYMENT'; text: string; quantity: number | null; fat: number | null; rate: number | null; milk: number; paid: number; balance: number }>;
}
export interface FarmerSummary { totalFarmers: number; activeFarmers: number; totalPayable: number; lifetimeSupplied: number; lifetimePaid: number }

export const farmersApi = {
  all: (params: { search?: string; active?: boolean }) => get<DairyFarmer[]>('/dairy/farmers', params),
  totals: () => get<FarmerSummary>('/dairy/farmers/summary'),
  save: (id: string | undefined, data: Partial<FarmerInput>) => (id ? patch<DairyFarmer>('/dairy/farmers/' + id, data) : post<DairyFarmer>('/dairy/farmers', data)),
  create: (data: Partial<DairyFarmer>) => post<DairyFarmer>('/dairy/farmers', data),
  list: (params?: object) => get<DairyFarmer[]>('/dairy/farmers', params),
  summary: () => get<unknown>('/dairy/farmers/summary'),
  getOne: (id: string) => get<DairyFarmer>('/dairy/farmers/' + id),
  update: (id: string, data: Partial<DairyFarmer>) => patch<DairyFarmer>('/dairy/farmers/' + id, data),
  payment: (id: string, data: FarmerPayInput) => post<DairyFarmer>('/dairy/farmers/' + id + '/payments', data),
  statement: (id: string, params: { from: string; to: string }) => get<FarmerStatement>('/dairy/farmers/' + id + '/statement', params),
  payAccounts: () => get<PayAccount[]>('/dairy/farmers/pay-accounts'),
  remove: (id: string) => del<unknown>('/dairy/farmers/' + id),
};

// ───── monthly-bills ─────

export interface MonthlyBill {
  id: string;
  dairyCustomerId: string;
  billNumber: string;
  month: number;
  year: number;
  cycleStartDate: string;
  cycleEndDate: string;
  totalLiters: number;
  totalDeliveries: number;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  remainingAmount: number;
  openingBalance: number;
  closingBalance: number;
  isPaid: boolean;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  isPrinted: boolean;
  sentToCustomer: boolean;
  sentAt?: string;
  notes?: string;
  customer?: { id: string; name: string; phone?: string | null; customerNumber: string; address?: string | null; route?: { name: string } | null } | null;
  deliveries?: DairyDelivery[];
  createdAt: string;
  updatedAt: string;
}


export const monthlyBillsApi = {
  all: (params: { month?: number; year?: number; isPaid?: boolean; search?: string; customerId?: string }) =>
    get<MonthlyBill[]>('/dairy/monthly-bills', params),
  make: (data: { dairyCustomerId: string; month: number; year: number; notes?: string }) => post<MonthlyBill & { refreshed: boolean }>('/dairy/monthly-bills', data),
  makeAll: (data: { month: number; year: number }) =>
    post<{ total: number; generated: number; updated: number; results: Array<{ name: string; status: string; reason?: string; billNumber?: string }> }>('/dairy/monthly-bills/bulk-generate', data),
  markPrinted: (id: string) => post<MonthlyBill>('/dairy/monthly-bills/' + id + '/mark-printed'),
  generate: (data: { dairyCustomerId: string; month: number; year: number }) =>
    post<MonthlyBill>('/dairy/monthly-bills', data),
  bulkGenerate: (data: { month: number; year: number }) =>
    post<unknown>('/dairy/monthly-bills/bulk-generate', data),
  list: (params?: { customerId?: string; month?: number; year?: number; isPaid?: boolean }) =>
    get<MonthlyBill[]>('/dairy/monthly-bills', params),
  getOne: (id: string) => get<MonthlyBill>('/dairy/monthly-bills/' + id),
  payment: (id: string, data: { amount: number; paymentMethod?: string; reference?: string }) =>
    post<MonthlyBill>('/dairy/monthly-bills/' + id + '/payments', data),
  markSent: (id: string) => post<MonthlyBill>('/dairy/monthly-bills/' + id + '/mark-sent'),
};

// ───── production ─────

export interface ProductionLine { productId: string; name: string; unit: string; quantity: number; unitCost: number }
export interface ProductionBatch {
  reference: string;
  date: string;
  shopId: string | null;
  shopName: string | null;
  note: string | null;
  source: ProductionLine | null;
  outputs: ProductionLine[];
  yieldPct: number | null;
  cost: number;
  cancelled: boolean;
}
export interface ProductionList {
  items: ProductionBatch[];
  totals: { batches: number; milkUsed: number; cost: number; made: Array<{ name: string; unit: string; quantity: number }> };
}


export const dairyProductionApi = {
  list: (params: { from?: string; to?: string }) => get<ProductionList>('/dairy/production', params),
  create: (data: { sourceProductId?: string; sourceQty: number; outputs: Array<{ productId: string; quantity: number }>; notes?: string }) =>
    post<ProductionBatch & { warnings: string[] }>('/dairy/production', data),
  cancel: (ref: string, reason?: string) => post<ProductionBatch>(`/dairy/production/${ref}/cancel`, { reason }),
};

// ───── products ─────

export type DairyProductType = 'FRESH_MILK' | 'BUFFALO_MILK' | 'COW_MILK' | 'GOAT_MILK'
  | 'MIXED_MILK' | 'BOILED_MILK' | 'RAW_MILK' | 'YOGURT' | 'DAHI' | 'LASSI'
  | 'BUTTER_MILK' | 'BUTTER' | 'MAKHAN' | 'DESI_GHEE' | 'CREAM' | 'MALAI'
  | 'KHOA' | 'MAWA' | 'PANEER' | 'CHEESE' | 'KHEER' | 'RABRI' | 'KULFI'
  | 'SWEETS' | 'ICE_CREAM' | 'MILK_POWDER' | 'OTHER';

export type DairyUnit = 'LITER' | 'KG' | 'GRAM' | 'PIECE' | 'PLATE' | 'CUP'
  | 'BOTTLE' | 'PACKET' | 'KATTA' | 'KILO' | 'MAAN' | 'SEER';

export type MilkQuality = 'A_GRADE' | 'B_GRADE' | 'C_GRADE' | 'REJECTED';

export interface DairyProduct {
  id: string;
  productId: string;
  productType: DairyProductType;
  unit: DairyUnit;
  fatContent?: number;
  snfContent?: number;
  proteinContent?: number;
  waterAdded: boolean;
  quality?: MilkQuality;
  isPasteurized: boolean;
  isHomogenized: boolean;
  isRaw: boolean;
  isOrganic: boolean;
  isFresh: boolean;
  productionDate?: string;
  bestBeforeHours?: number;
  shelfLifeHours?: number;
  requiresRefrigeration: boolean;
  storageTempMin?: number;
  storageTempMax?: number;
  farmSource?: string;
  cattleType?: string;
  morningPrice?: number;
  eveningPrice?: number;
  bulkPrice?: number;
  minBulkQty?: number;
  wholesalePrice?: number;
  retailPrice?: number;
  homeDeliveryPrice?: number;
  availableMorning: boolean;
  availableEvening: boolean;
  homeDeliveryAvailable: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  displayOrder: number;
  totalSold: number;
  totalRevenue: number;
  notes?: string;
  product?: unknown;
  createdAt: string;
  updatedAt: string;
}


export const dairyProductsApi = {
  upsert: (data: Partial<DairyProduct>) => post<DairyProduct>('/dairy/products', data),
  list: (params?: object) => get<DairyProduct[]>('/dairy/products', params),
  byProduct: (productId: string) => get<DairyProduct | null>('/dairy/products/by-product/' + productId),
  getOne: (id: string) => get<DairyProduct>('/dairy/products/' + id),
  remove: (id: string, force = false) =>
    del<unknown>(`/dairy/products/${id}${force ? '?force=true' : ''}`),
};

// ───── quality-tests ─────

export interface QualityTest {
  id: string;
  testNumber: string;
  testedAt: string;
  sourceType: string;
  sourceId?: string;
  sourceName?: string;
  fatContent?: number;
  snfContent?: number;
  proteinContent?: number;
  lactoseContent?: number;
  waterContent?: number;
  phLevel?: number;
  temperature?: number;
  adulterationDetected: boolean;
  adulterationTypes: string[];
  quality?: string;
  passed: boolean;
  actionTaken?: string;
  testMethod?: string;
  notes?: string;
  imageUrls: string[];
  createdAt: string;
}


export interface QualitySummary { total: number; passed: number; failed: number; adulteration: number; avgFat: number | null; avgSnf: number | null }

export const qualityTestsApi = {
  all: (params: { from?: string; to?: string; failed?: boolean; sourceType?: string; search?: string }) =>
    get<QualityTest[]>('/dairy/quality-tests', params),
  totals: (params: { from?: string; to?: string }) => get<QualitySummary>('/dairy/quality-tests/summary', params),
  create: (data: Partial<QualityTest>) => post<QualityTest>('/dairy/quality-tests', data),
  list: (params?: object) => get<QualityTest[]>('/dairy/quality-tests', params),
  summary: () => get<unknown>('/dairy/quality-tests/summary'),
  getOne: (id: string) => get<QualityTest>('/dairy/quality-tests/' + id),
};

// ───── routes ─────

export interface DairyRoute {
  id: string;
  routeNumber: string;
  name: string;
  description?: string;
  assignedStaffId?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  slot: string;
  status: 'ACTIVE' | 'PAUSED' | 'DISCONTINUED';
  totalCustomers: number;
  totalDailyLiters: number;
  startTime?: string;
  estimatedDurationMin?: number;
  areaName?: string;
  color?: string;
  isActive: boolean;
  customers?: DairyCustomer[];
  assignedStaff?: { id: string; fullName?: string; name?: string } | null;
  createdAt: string;
  updatedAt: string;
}


export interface RouteInput {
  name: string; areaName?: string; slot?: string; status?: 'ACTIVE' | 'PAUSED' | 'DISCONTINUED'; vehicleType?: string; vehicleNumber?: string;
  startTime?: string; estimatedDurationMin?: number; description?: string; color?: string; isActive?: boolean;
}

export const routesApi = {
  all: (params?: { active?: boolean; search?: string }) => get<DairyRoute[]>('/dairy/routes', params),
  save: (id: string | undefined, data: Partial<RouteInput>) => (id ? patch<DairyRoute>('/dairy/routes/' + id, data) : post<DairyRoute>('/dairy/routes', data)),
  create: (data: Partial<DairyRoute>) => post<DairyRoute>('/dairy/routes', data),
  list: (params?: object) => get<DairyRoute[]>('/dairy/routes', params),
  getOne: (id: string) => get<DairyRoute>('/dairy/routes/' + id),
  todayDeliveries: (id: string) => get<unknown[]>('/dairy/routes/' + id + '/today-deliveries'),
  update: (id: string, data: Partial<DairyRoute>) => patch<DairyRoute>('/dairy/routes/' + id, data),
  remove: (id: string) => del<unknown>('/dairy/routes/' + id),
};

// ───── dashboard ─────


interface NamedRef { id: string; name: string; phone?: string | null }
/** Shape of GET /dairy/dashboard/overview. Prisma decimals may arrive as strings. */
export interface DairyOverview {
  totals?: { totalCustomers?: number; activeCustomers?: number; totalFarmers?: number; activeRoutes?: number };
  today?: {
    scheduledDeliveries?: number; deliveredCount?: number; deliveredLiters?: number | string; deliveredRevenue?: number | string;
    farmerSupplies?: number; suppliedLiters?: number | string; suppliedAmount?: number | string;
  };
  monthly?: { deliveries?: number; liters?: number | string; revenue?: number | string };
  financials?: { customerOutstanding?: number | string; customerCount?: number; farmerPayable?: number | string };
  topFarmers?: Array<{ farmer?: NamedRef; liters: number | string; amount: number | string }>;
  topDebtors?: Array<NamedRef & { currentBalance: number | string }>;
}

export const dairyDashboardApi = {
  overview: () => get<DairyOverview>('/dairy/dashboard/overview'),
};
