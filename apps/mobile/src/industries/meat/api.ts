/**
 * Meat endpoints (same paths and shapes as apps/web/src/industries/meat/api):
 * weight orders, cutting jobs, live animals, slaughter log, subscriptions,
 * wholesale, qurbani, the product profile and the dashboard. They need the
 * server; screens show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const put = <T>(path: string, body?: object) => apiClient.put<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);


// ───── weight-orders ─────

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'CUTTING' | 'PACKED'
  | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface WeightOrderItem {
  id?: string;
  productId?: string;
  productName: string;
  cutCategory?: string;
  requestedKg: number;
  actualKg?: number;
  pricePerKg: number;
  total: number;
  cuttingInstructions?: string;
  packagingNotes?: string;
}

export interface WeightOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  orderDate: string;
  neededBy?: string;
  scheduledDelivery?: string;
  status: OrderStatus;
  isDelivery: boolean;
  deliveryAddress?: string;
  deliveryCharges: number;
  deliveryPersonId?: string;
  deliveredAt?: string;
  occasion?: string;
  specialInstructions?: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  cuttingStyle?: string;
  packagingPref?: string;
  numberOfPackets?: number;
  cancelledAt?: string;
  cancellationReason?: string;
  items: WeightOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export type OrderTab = 'all' | 'open' | 'today' | 'ready' | 'delivery' | 'delivered' | 'cancelled';

export interface OrderPage {
  items: WeightOrder[]; total: number; page: number; limit: number;
  counts: Record<OrderTab, number>; openValue: number; advances: number;
}

/** Money of one order split by where it sits (see the API). */
export interface OrderMoney { khataPaid: number; legacyPaid: number }

export interface OrderInput {
  customerId?: string | null; customerName?: string; customerPhone?: string;
  neededBy?: string | null; isDelivery: boolean; deliveryAddress?: string; deliveryCharges?: number; discount?: number;
  occasion?: string; specialInstructions?: string; cuttingStyle?: string; packagingPref?: string; numberOfPackets?: number | null;
  advance?: number; paymentMethod?: string;
  items: Array<{ productId: string; requestedKg: number; pricePerKg: number; cuttingInstructions?: string }>;
}


const WO = '/meat/weight-orders/';

export const weightOrdersApi = {
  create: (data: OrderInput) => post<WeightOrder>('/meat/weight-orders', data),
  list: (params?: Record<string, string | undefined>) => get<WeightOrder[]>('/meat/weight-orders', params),
  page: (params: Record<string, string | number | undefined>) => get<OrderPage>(WO + 'page', params),
  getOne: (id: string) => get<WeightOrder & OrderMoney>(WO + id),
  update: (id: string, data: Partial<OrderInput>) => patch<WeightOrder & OrderMoney>(WO + id, data),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    patch<WeightOrder>(WO + id + '/status', { status, cancellationReason }),
  updateActualWeights: (id: string, items: { itemId: string; actualKg: number }[]) =>
    patch<WeightOrder>(WO + id + '/actual-weights', { items }),
  addPayment: (id: string, amount: number, paymentMethod: string, expectedPaid: number) =>
    post<WeightOrder>(WO + id + '/payment', { amount, paymentMethod, expectedPaid }),
  /** Makes the bill (stock, sale, khata) and marks the order handed over. */
  checkout: (id: string, body: { payments: Array<{ method: string; amount: number }>; expectedTotal: number; managerPin?: string }) =>
    post<WeightOrder & OrderMoney>(WO + id + '/checkout', body),
  refund: (id: string, managerPin?: string) => post<WeightOrder & OrderMoney>(WO + id + '/refund', { managerPin }),
  bySales: (ids: string[]) => get<Record<string, { id: string; orderNumber: string; isDelivery: boolean; occasion: string | null }>>(WO + 'by-sales', { ids: ids.join(',') }),
  bill: (id: string) => get<{ id: string; saleNumber: string; total: number; creditAmount: number } | null>(WO + id + '/bill'),
};

// ───── cutting-jobs ─────

export interface CuttingJob {
  id: string;
  jobNumber: string;
  slaughterLogId?: string;
  butcherId?: string;
  butcherName?: string;
  inputWeightKg: number;
  outputWeightKg?: number;
  wasteWeightKg?: number;
  yieldPct?: number;
  startedAt: string;
  completedAt?: string;
  durationMin?: number;
  status: string;
  cutsProduced?: CutsJson | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CutsJson {
  source?: { productId: string; name: string } | null;
  cuts?: Array<{ productId: string; name: string; qty: number; unitCost: number }>;
  value?: number;
}


export const cuttingJobsApi = {
  create: (data: { inputWeightKg: number; sourceProductId: string; slaughterLogId?: string; butcherName?: string; notes?: string }) =>
    post<CuttingJob>('/meat/cutting-jobs', data),
  list: (params?: Record<string, string | undefined>) => get<CuttingJob[]>('/meat/cutting-jobs', params),
  complete: (id: string, data: { cuts: Array<{ productId: string; kg: number }>; wasteWeightKg?: number; notes?: string }) =>
    post<CuttingJob>('/meat/cutting-jobs/' + id + '/complete', data),
  cancel: (id: string, reason?: string) => post<CuttingJob>('/meat/cutting-jobs/' + id + '/cancel', { reason }),
};

// ───── live-animals ─────

export interface LiveAnimal {
  id: string;
  tagNumber: string;
  animalType: string;
  breed?: string;
  color?: string;
  sex?: string;
  ageMonths?: number;
  weightKg: number;
  purchasePrice: number;
  purchaseDate: string;
  vendorId?: string;
  vendorName?: string;
  sourceName?: string;
  vaccinationStatus?: string;
  healthCertUrl?: string;
  isHealthy: boolean;
  healthNotes?: string;
  vetCheckedAt?: string;
  feedingType?: string;
  dailyFeedCost: number;
  daysHeld: number;
  totalFeedCost: number;
  isSlaughtered: boolean;
  slaughteredAt?: string;
  slaughterMethod?: string;
  slaughterCertBy?: string;
  slaughterWeightKg?: number;
  meatYieldKg?: number;
  yieldPct?: number;
  isSold: boolean;
  soldPrice?: number;
  soldAt?: string;
  soldToCustomer?: string;
  photoUrls: string[];
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MandiInput {
  supplierId: string; productId: string; paymentMethod: string; paidAmount?: number; otherCharges?: number; notes?: string; purchasedAt?: string;
  /** Birds or loose live stock by weight. */
  kg?: number; ratePerKg?: number; birds?: number;
  /** Or tagged animals, one row each. */
  animals?: Array<{ tagNumber?: string; animalType: string; breed?: string; color?: string; sex?: string; ageMonths?: number; weightKg: number; price: number }>;
}

export interface LiveSummary {
  aliveCount: number;
  byType: Array<{ animalType: string; _count: { _all: number }; _sum: { weightKg: number | null } }>;
  totalCost: { _sum: { purchasePrice: number | null; totalFeedCost: number | null } };
}


export const liveAnimalsApi = {
  mandi: (data: MandiInput) => post<{ purchaseId: string; purchaseNumber: string; total: number; paidAmount: number; animals: number }>('/meat/live-animals/mandi', data),
  create: (data: Partial<LiveAnimal>) => post<LiveAnimal>('/meat/live-animals', data),
  list: (params?: Record<string, string | undefined>) => get<LiveAnimal[]>('/meat/live-animals', params),
  summary: () => get<LiveSummary>('/meat/live-animals/summary'),
  update: (id: string, data: Partial<LiveAnimal>) => patch<LiveAnimal>('/meat/live-animals/' + id, data),
  addFeedCost: (id: string, days: number, costPerDay: number, paymentMethod: string) =>
    post<LiveAnimal>('/meat/live-animals/' + id + '/feed-cost', { days, costPerDay, paymentMethod }),
  remove: (id: string) => del<unknown>('/meat/live-animals/' + id),
};

// ───── slaughter ─────

export interface SlaughterLog {
  id: string;
  slaughterNumber: string;
  liveAnimalId?: string;
  animalType: string;
  animalTag?: string;
  slaughterDate: string;
  slaughterTime?: string;
  slaughterMethod: string;
  slaughteredBy?: string;
  slaughtererId?: string;
  slaughtererCertNumber?: string;
  witnessedBy?: string;
  liveWeightKg: number;
  dressedWeightKg?: number;
  yieldPct?: number;
  facilityName?: string;
  facilityLicense?: string;
  facilityAddress?: string;
  isHalal: boolean;
  halalCertNumber?: string;
  religiousAuthority?: string;
  vetInspection: boolean;
  vetInspectorName?: string;
  vetCertNumber?: string;
  postMortemNotes?: string;
  qualityGrade?: string;
  temperature?: number;
  storageLocation?: string;
  photoUrls: string[];
  documentUrls: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlaughterInput {
  liveAnimalId?: string; animalType?: string; animalTag?: string; liveWeightKg: number; dressedWeightKg?: number;
  sourceProductId?: string; stockProductId?: string; extras?: Array<{ productId: string; kg: number }>;
  slaughterMethod?: string; slaughterDate?: string; slaughteredBy?: string; isHalal?: boolean; halalCertNumber?: string;
  vetInspection?: boolean; vetInspectorName?: string; qualityGrade?: string; notes?: string;
}

export interface SlaughterMove { productId: string; name: string; unit: string; qty: number; unitCost: number; type: string }

export interface HalalStats {
  total: number; halal: number; halalPct: number; withCert: number; certPct: number; withVet: number; vetPct: number;
  liveKg: number; dressedKg: number; yieldPct: number;
}


export const slaughterApi = {
  create: (data: SlaughterInput) => post<SlaughterLog>('/meat/slaughter', data),
  list: (params?: Record<string, string | undefined>) => get<SlaughterLog[]>('/meat/slaughter', params),
  halalCompliance: (from?: string, to?: string) => get<HalalStats>('/meat/slaughter/halal-compliance', { from, to }),
  getOne: (id: string) => get<SlaughterLog & { moves: SlaughterMove[] }>('/meat/slaughter/' + id),
  update: (id: string, data: Partial<SlaughterLog>) => patch<SlaughterLog>('/meat/slaughter/' + id, data),
};

// ───── subscriptions ─────

export type SubscriptionFreq = 'DAILY' | 'ALTERNATE_DAY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  status: SubscriptionStatus;
  frequency: SubscriptionFreq;
  customDays: number[];
  startDate: string;
  endDate?: string;
  nextDeliveryDate?: string;
  lastDeliveryDate?: string;
  standardItems: Array<{ productId: string; productName: string; kg: number }>;
  totalMonthlyKg: number;
  discountPct: number;
  deliveryAddress: string;
  deliveryTimeSlot?: string;
  contactPerson?: string;
  contactPhone?: string;
  billingCycle: string;
  monthlyEstimate: number;
  autoRenew: boolean;
  pausedAt?: string;
  pauseReason?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  totalDeliveries: number;
  totalRevenue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const SUB = '/meat/subscriptions/';

export const subscriptionsApi = {
  create: (data: Record<string, unknown>) => post<Subscription>('/meat/subscriptions', data),
  list: (params?: Record<string, string | undefined>) => get<Subscription[]>('/meat/subscriptions', params),
  update: (id: string, data: Record<string, unknown>) => patch<Subscription>(SUB + id, data),
  pause: (id: string, reason?: string) => post<Subscription>(SUB + id + '/pause', { reason }),
  resume: (id: string) => post<Subscription>(SUB + id + '/resume'),
  cancel: (id: string, reason?: string) => post<Subscription>(SUB + id + '/cancel', { reason }),
  /** Makes today's delivery as a weight order at today's rates. */
  deliver: (id: string) => post<{ id: string; orderNumber: string; total: number }>(SUB + id + '/deliver'),
};

// ───── wholesale ─────

export interface WholesaleAccount {
  id: string;
  customerId: string;
  accountNumber: string;
  businessName: string;
  businessType: string;
  contractStart?: string;
  contractEnd?: string;
  creditLimit: number;
  currentBalance: number;
  creditDays: number;
  discountPct: number;
  specialPricing?: unknown;
  requiresDelivery: boolean;
  deliveryDays: number[];
  deliveryTimeSlot?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  billingAddress?: string;
  deliveryAddress?: string;
  gstNumber?: string;
  ntnNumber?: string;
  totalOrders: number;
  totalPurchases: number;
  totalOutstanding: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const WS = '/meat/wholesale/';

export const wholesaleApi = {
  create: (data: Partial<WholesaleAccount>) => post<WholesaleAccount>('/meat/wholesale', data),
  list: (params?: Record<string, string | undefined>) => get<WholesaleAccount[]>('/meat/wholesale', params),
  byCustomer: (customerId: string) => get<WholesaleAccount | null>(WS + 'by-customer/' + customerId),
  update: (id: string, data: Partial<WholesaleAccount>) => patch<WholesaleAccount>(WS + id, data),
  /** A khata payment from the buyer (drawer for cash). */
  payment: (id: string, amount: number, paymentMethod: string, note?: string) =>
    post<WholesaleAccount>(WS + id + '/payment', { amount, paymentMethod, note }),
  remove: (id: string) => del<unknown>(WS + id),
};

// ───── qurbani ─────

export interface QurbaniBooking {
  id: string;
  bookingNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerCnic?: string;
  customerAddress?: string;
  occasion: string;
  animalType: string;
  animalPreference?: string;
  shareCount: number;
  shareNumber?: number;
  advanceAmount: number;
  finalPrice?: number;
  paidAmount: number;
  paymentStatus: string;
  slaughterDate?: string;
  slaughterDay?: number;
  wantsMeatDelivery: boolean;
  deliveryPreference: string;
  deliveryAddress?: string;
  needsCharityShare: boolean;
  charityShareKg?: number;
  charityRecipient?: string;
  cuttingStyle?: string;
  packagingCount?: number;
  wantsSkin: boolean;
  wantsOffal: boolean;
  specialInstructions?: string;
  liveAnimalId?: string;
  slaughterLogId?: string;
  status: string;
  cancelledAt?: string;
  cancellationReason?: string;
  bookedAt: string;
  updatedAt: string;
}

export interface QurbaniMoney {
  khataPaid?: number; legacyPaid?: number;
  bill?: { id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number; soldAt: string } | null;
}

const QB = '/meat/qurbani/';

export const qurbaniApi = {
  create: (data: Record<string, unknown>) => post<QurbaniBooking>('/meat/qurbani', data),
  list: (params?: Record<string, string | undefined>) => get<QurbaniBooking[]>('/meat/qurbani', params),
  getOne: (id: string) => get<QurbaniBooking & QurbaniMoney>(QB + id),
  update: (id: string, data: Record<string, unknown>) => patch<QurbaniBooking>(QB + id, data),
  payment: (id: string, amount: number, paymentMethod: string) => post<QurbaniBooking>(QB + id + '/payment', { amount, paymentMethod }),
  updateStatus: (id: string, status: string, reason?: string) => post<QurbaniBooking>(QB + id + '/status', { status, reason }),
  /** Hand-over: one bill for the share; the advance on khata cancels it. */
  complete: (id: string, paidNow: number, paymentMethod: string) =>
    post<{ booking: QurbaniBooking; sale: { id: string; saleNumber: string; total: number } }>(QB + id + '/complete', { paidNow, paymentMethod }),
  refund: (id: string, managerPin?: string) => post<QurbaniBooking>(QB + id + '/refund', { managerPin }),
};

// ───── products ─────

export type AnimalType = 'BEEF' | 'MUTTON' | 'GOAT' | 'LAMB' | 'CHICKEN' | 'DUCK' | 'TURKEY'
  | 'QUAIL' | 'CAMEL' | 'BUFFALO' | 'FISH' | 'PRAWN' | 'OTHER';

export type CutCategory = 'WHOLE_ANIMAL' | 'HALF_ANIMAL' | 'QUARTER' | 'PRIMAL_CUT' | 'RETAIL_CUT'
  | 'BONELESS' | 'WITH_BONE' | 'MINCE' | 'UNDERCUT' | 'RIBS' | 'CHOPS' | 'BREAST' | 'LEG'
  | 'THIGH' | 'WING' | 'DRUMSTICK' | 'LIVER' | 'KIDNEY' | 'HEART' | 'BRAIN' | 'TONGUE'
  | 'TROTTERS' | 'HEAD' | 'TAIL' | 'OFFAL' | 'BONES' | 'FAT' | 'SKIN' | 'OTHER';

export type FreshnessType = 'LIVE' | 'FRESH_SLAUGHTERED' | 'FRESH_CHILLED' | 'FROZEN'
  | 'PREPARED' | 'PROCESSED' | 'MARINATED' | 'SMOKED' | 'DRIED' | 'CURED';

export type SlaughterMethod = 'HALAL_HAND' | 'HALAL_MACHINE' | 'KOSHER' | 'STANDARD' | 'ORGANIC' | 'FREE_RANGE' | 'OTHER';
export type QualityGrade = 'PREMIUM' | 'GRADE_A' | 'GRADE_B' | 'GRADE_C' | 'STANDARD' | 'ECONOMY';
export type SaleUnit = 'KG' | 'GRAM' | 'POUND' | 'PIECE' | 'DOZEN' | 'WHOLE' | 'HALF' | 'QUARTER' | 'KILO_PACK';

export interface MeatProductProfile {
  id: string;
  productId: string;
  animalType: AnimalType;
  cutCategory: CutCategory;
  freshnessType: FreshnessType;
  slaughterMethod: SlaughterMethod;
  qualityGrade: QualityGrade;
  saleUnit: SaleUnit;
  pricePerKg: number;
  pricePerPiece?: number;
  minOrderKg?: number;
  maxOrderKg?: number;
  weightVariancePct: number;
  isBoneless: boolean;
  isBoneIn: boolean;
  isSkinless: boolean;
  isMarinated: boolean;
  marinationType?: string;
  isOrganic: boolean;
  isFreeRange: boolean;
  isGrainFed: boolean;
  isGrassFed: boolean;
  isFrozen: boolean;
  halalCertNumber?: string;
  halalCertBy?: string;
  halalCertExpiry?: string;
  isHalalCertified: boolean;
  otherCerts: string[];
  farmName?: string;
  farmLocation?: string;
  slaughterhouseName?: string;
  slaughterhouseLic?: string;
  countryOfOrigin?: string;
  breed?: string;
  storageTempMin?: number;
  storageTempMax?: number;
  shelfLifeDays?: number;
  packagingType?: string;
  batchNumber?: string;
  animalAge?: string;
  animalSex?: string;
  cuttingStyle?: string;
  cleaningLevel?: string;
  packagingWeight?: number;
  imageUrls: string[];
  descriptionLong?: string;
  cookingSuggestions?: string;
  nutritionInfo?: unknown;
  isPopular: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  totalSoldKg: number;
  totalRevenue: number;
  product?: { id: string; name: string; price: number; unit: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DaySheetRow {
  productId: string; name: string; unit: string; animalType: string | null; cutCategory: string | null;
  price: number; wholesalePrice: number | null; costPrice: number;
  opening: number; bought: number; madeIn: number; returned: number; sold: number; cutOut: number; waste: number; otherIn: number; otherOut: number;
  closing: number; closingValue: number; now: number;
}

export interface DaySheet {
  date: string;
  rows: DaySheetRow[];
  totals: { bought: number; madeIn: number; sold: number; cutOut: number; waste: number; closing: number; closingValue: number } | null;
}


export const meatProductsApi = {
  upsert: (data: Partial<MeatProductProfile>) => post<MeatProductProfile>('/meat/products', data),
  list: (params?: Record<string, string | undefined>) => get<MeatProductProfile[]>('/meat/products', params),
  byProduct: (productId: string) => get<MeatProductProfile | null>('/meat/products/by-product/' + productId),
  daySheet: (date?: string) => get<DaySheet>('/meat/products/day-sheet', { date }),
};

// ───── dashboard ─────


export const meatDashboardApi = {
  overview: () => get<Record<string, unknown>>('/meat/dashboard/overview'),
};
