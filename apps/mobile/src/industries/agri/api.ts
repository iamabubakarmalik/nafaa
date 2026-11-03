/**
 * Agri endpoints (same paths and shapes as apps/web/src/industries/agri/api):
 * farmers and their khata, bulk orders, crop advice, seasonal plans, subsidy
 * claims and the per-product agri profile. They need the server; screens show
 * the last saved data offline.
 */

import { apiClient } from '@/core/api/client';
import type { OrderStatus } from '@nafaa/core/industries/agri';

export type { OrderStatus };

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const put = <T>(path: string, body?: object) => apiClient.put<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

// ───── farmers ─────

export type FarmerStatus = 'ACTIVE' | 'SUSPENDED' | 'DEFAULTED' | 'CLOSED' | 'PENDING_APPROVAL';

export interface Farmer {
  id: string;
  customerId?: string;
  farmerNumber: string;
  fullName: string;
  fatherName?: string;
  cnic?: string;
  phone: string;
  altPhone?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  province?: string;
  address?: string;
  landmark?: string;
  landAreaAcres?: number;
  landAreaKanals?: number;
  landOwnership?: string;
  soilType?: string;
  waterSource?: string;
  irrigationType?: string;
  farmingType: string[];
  primaryCrops: string[];
  livestock?: unknown;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  landDocUrl?: string;
  photoUrl?: string;
  creditLimit: number;
  currentBalance: number;
  creditDays: number;
  interestRate: number;
  currentSeason?: string;
  currentCrop?: string;
  totalOrders: number;
  totalPurchases: number;
  totalOutstanding: number;
  totalPaid: number;
  lastPurchaseAt?: string;
  status: FarmerStatus;
  registeredAt: string;
  suspendedAt?: string;
  suspensionReason?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Live khata figures laid over the farmer row by the API. */
  khataLinked?: boolean;
  advance?: number;
  dueNow?: number;
  notDue?: number;
  overLimit?: boolean;
  lastPaymentAt?: string | null;
  seasons?: SeasonOwed[];
  currentSeasonLabel?: string;
}

/** Udhaar still owed from one crop season and when it is expected back. */
export interface SeasonOwed { key: string; label: string; owed: number; recoveryBy: string; due: boolean }

export type FarmerTab = 'all' | 'owing' | 'due' | 'over' | 'suspended';

export interface FarmerPage {
  items: Farmer[];
  total: number;
  page: number;
  limit: number;
  counts: Record<FarmerTab, number>;
  stats: { farmers: number; owed: number; dueNow: number; notDue: number; advance: number; creditLimit: number; acres: number; season: string };
  analytics: { crops: Array<{ name: string; count: number }>; districts: Array<{ name: string; count: number }>; seasons: Array<{ key: string; label: string; owed: number; due: boolean }> };
}

export interface KhataSeason { key: string; label: string; recoveryBy: string; udhaar: number; received: number; other: number; opening: number; closing: number }
export interface KhataEntry { id: string; type: string; amount: number; balanceAfter: number; reference?: string | null; note?: string | null; paymentMethod?: string | null; createdAt: string }
export interface FarmerKhata { farmer: Farmer; seasons: KhataSeason[]; entries: KhataEntry[] }


export const farmersApi = {
  create: (data: Partial<Farmer>) => post<Farmer>('/agri/farmers', data),
  list: (params?: { search?: string; status?: string; district?: string }) => get<Farmer[]>('/agri/farmers', params),
  page: (params: { search?: string; tab?: FarmerTab; sort?: string; page?: number; limit?: number }) => get<FarmerPage>('/agri/farmers/page', params),
  khata: (id: string) => get<FarmerKhata>('/agri/farmers/' + id + '/khata'),
  byCustomer: (customerId: string) => get<Farmer | null>('/agri/farmers/by-customer/' + customerId),
  /** Links an older farmer to a customer khata; without customerId a new customer is made. */
  linkCustomer: (id: string, customerId?: string) =>
    post<Farmer>('/agri/farmers/' + id + '/link-customer', { customerId }),
  getOne: (id: string) => get<Farmer>('/agri/farmers/' + id),
  update: (id: string, data: Partial<Farmer>) => patch<Farmer>('/agri/farmers/' + id, data),
  suspend: (id: string, reason: string) => post<Farmer>('/agri/farmers/' + id + '/suspend', { reason }),
  reactivate: (id: string) => post<Farmer>('/agri/farmers/' + id + '/reactivate'),
  /** Money received from the farmer, written on the customer khata. */
  payment: (id: string, body: { amount: number; paymentMethod: string; note?: string }) => post<Farmer>('/agri/farmers/' + id + '/payment', body),
  /** Hides the farmer from lists (record and khata stay). */
  remove: (id: string) => del<unknown>('/agri/farmers/' + id),
};

// ───── bulk-orders ─────


export interface BulkOrderItem {
  id?: string;
  productId?: string;
  productName: string;
  category?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  discount: number;
  total: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface BulkOrder {
  id: string;
  orderNumber: string;
  /** Bill made when the order was marked delivered. */
  bill?: { id: string; saleNumber: string } | null;
  farmerId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  orderDate: string;
  deliveryDate?: string;
  status: OrderStatus;
  season?: string;
  cropTarget?: string;
  landAreaAcres?: number;
  isDelivery: boolean;
  deliveryAddress?: string;
  deliveryCharges: number;
  transportType?: string;
  vehicleNumber?: string;
  subtotal: number;
  bulkDiscount: number;
  taxAmount: number;
  otherCharges: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  isCredit: boolean;
  creditDueDate?: string;
  advisorNotes?: string;
  farmerNotes?: string;
  cancellationReason?: string;
  items: BulkOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BulkOrderPage {
  items: BulkOrder[];
  total: number;
  page: number;
  limit: number;
  counts: Partial<Record<OrderStatus, number>>;
  stats: { orders: number; value: number; advance: number; pending: number; openValue: number };
  analytics: { seasons: Array<{ season: string | null; orders: number; value: number }> };
}

export interface BulkOrderInput {
  farmerId?: string; customerId?: string; customerName?: string; customerPhone?: string;
  season?: string; cropTarget?: string; landAreaAcres?: number; deliveryDate?: string;
  isDelivery?: boolean; deliveryAddress?: string; deliveryCharges?: number; transportType?: string; vehicleNumber?: string;
  bulkDiscount?: number; otherCharges?: number; isCredit?: boolean; creditDueDate?: string; advisorNotes?: string; farmerNotes?: string;
  items: Array<{ productId?: string; productName: string; category?: string; quantity: number; unit: string; pricePerUnit: number; discount?: number }>;
}


export const bulkOrdersApi = {
  create: (data: BulkOrderInput) => post<BulkOrder>('/agri/bulk-orders', data),
  page: (params: { status?: string; season?: string; farmerId?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }) => get<BulkOrderPage>('/agri/bulk-orders/page', params),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    patch<BulkOrder>('/agri/bulk-orders/' + id + '/status', { status, cancellationReason }),
  addPayment: (id: string, amount: number, paymentMethod: string) => post<BulkOrder>('/agri/bulk-orders/' + id + '/payment', { amount, paymentMethod }),
};

// ───── seasonal-plans ─────

export interface SeasonalPlan {
  id: string;
  season: string;
  year: number;
  cropName: string;
  sowingStart: string;
  sowingEnd: string;
  harvestStart: string;
  harvestEnd: string;
  /** Products for the crop: [{ productId, name, perAcre, unit }] (older rows may differ). */
  recommendedProducts?: unknown;
  /** Spray / fertilizer calendar: [{ day, what }]. */
  applicationSchedule?: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanInput {
  season: string; year: number; cropName: string; sowingStart: string; sowingEnd: string; harvestStart: string; harvestEnd: string;
  recommendedProducts?: Array<{ productId?: string; name: string; perAcre: number; unit: string }>; applicationSchedule?: Array<{ day: number; what: string }>; isActive?: boolean;
}


export const seasonalPlansApi = {
  create: (data: PlanInput) => post<SeasonalPlan>('/agri/seasonal-plans', data),
  list: (params?: { season?: string; year?: number; active?: boolean }) => get<SeasonalPlan[]>('/agri/seasonal-plans', params),
  update: (id: string, data: Partial<PlanInput>) => patch<SeasonalPlan>('/agri/seasonal-plans/' + id, data),
  remove: (id: string) => del<unknown>('/agri/seasonal-plans/' + id),
};

// ───── subsidy ─────

export interface SubsidyClaim {
  id: string;
  claimNumber: string;
  farmerId: string;
  schemeName: string;
  govtScheme?: string;
  productType: string;
  quantity: number;
  originalPrice: number;
  subsidyAmount: number;
  finalPrice: number;
  farmerCnic?: string;
  cropTarget?: string;
  landAreaAcres?: number;
  documentsSubmitted: string[];
  approvedBy?: string;
  approvalDate?: string;
  disbursementDate?: string;
  status: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  farmer?: { id: string; fullName: string; phone: string; village?: string | null } | null;
}


export interface ClaimInput { farmerId: string; schemeName: string; govtScheme?: string; productType: string; quantity: number; originalPrice: number; subsidyAmount: number; farmerCnic?: string; cropTarget?: string; landAreaAcres?: number; documentsSubmitted?: string[]; notes?: string }

export interface SubsidyPage {
  items: SubsidyClaim[];
  total: number;
  page: number;
  limit: number;
  counts: Record<string, number>;
  amounts: Record<string, number>;
  analytics: { schemes: Array<{ scheme: string; claims: number; amount: number }> };
}


export const subsidyApi = {
  create: (data: ClaimInput) => post<SubsidyClaim>('/agri/subsidy', data),
  list: (params?: { status?: string; farmerId?: string; search?: string }) => get<SubsidyClaim[]>('/agri/subsidy', params),
  page: (params: { status?: string; farmerId?: string; search?: string; page?: number; limit?: number }) => get<SubsidyPage>('/agri/subsidy/page', params),
  approve: (id: string, approvedBy?: string) => post<SubsidyClaim>('/agri/subsidy/' + id + '/approve', { approvedBy }),
  reject: (id: string, reason: string) => post<SubsidyClaim>('/agri/subsidy/' + id + '/reject', { reason }),
  disburse: (id: string) => post<SubsidyClaim>('/agri/subsidy/' + id + '/disburse'),
};

// ───── advisory ─────

export interface CropAdvisory {
  id: string;
  advisoryNumber: string;
  farmerId?: string;
  advisorId?: string;
  advisorName?: string;
  cropName: string;
  cropVariety?: string;
  season?: string;
  landAreaAcres?: number;
  stage?: string;
  sowingDate?: string;
  expectedHarvest?: string;
  currentIssues?: string;
  /** Advice lines (older rows may hold other shapes). */
  recommendations?: unknown;
  /** Products advised: [{ productId, name }]. */
  productSuggestions?: unknown;
  followUpDate?: string;
  completed: boolean;
  notes?: string;
  attachmentUrls: string[];
  createdAt: string;
  updatedAt: string;
  farmer?: { id: string; fullName: string; phone: string; village?: string | null } | null;
}

export interface AdvisoryInput {
  farmerId?: string | null; advisorName?: string; cropName: string; cropVariety?: string; season?: string; landAreaAcres?: number | null; stage?: string;
  sowingDate?: string | null; expectedHarvest?: string | null; currentIssues?: string; recommendations?: string[]; productSuggestions?: Array<{ productId: string; name: string }>;
  followUpDate?: string | null; notes?: string; completed?: boolean;
}

export type AdvisoryTab = 'open' | 'due' | 'done' | 'all';

export interface AdvisoryPage {
  items: CropAdvisory[];
  total: number;
  page: number;
  limit: number;
  counts: Record<AdvisoryTab, number>;
  analytics: { crops: Array<{ crop: string; notes: number }>; stages: Array<{ stage: string; notes: number }> };
}


export const advisoryApi = {
  create: (data: AdvisoryInput) => post<CropAdvisory>('/agri/advisory', data),
  page: (params: { farmerId?: string; season?: string; search?: string; tab?: AdvisoryTab; page?: number; limit?: number }) => get<AdvisoryPage>('/agri/advisory/page', params),
  update: (id: string, data: Partial<AdvisoryInput>) => patch<CropAdvisory>('/agri/advisory/' + id, data),
  complete: (id: string) => post<CropAdvisory>('/agri/advisory/' + id + '/complete'),
};

// ───── products ─────

export type AgriCategory = 'SEEDS' | 'FERTILIZER' | 'PESTICIDE' | 'HERBICIDE' | 'FUNGICIDE'
  | 'INSECTICIDE' | 'ANIMAL_FEED' | 'POULTRY_FEED' | 'CATTLE_FEED' | 'FISH_FEED'
  | 'VETERINARY_MEDICINE' | 'FARM_TOOLS' | 'IRRIGATION' | 'MACHINERY_PART'
  | 'MULCH_COVER' | 'GROWTH_HORMONE' | 'SOIL_CONDITIONER' | 'PLANT_NUTRIENT'
  | 'ORGANIC_INPUT' | 'OTHER';

export type SeedType = 'WHEAT' | 'RICE' | 'COTTON' | 'MAIZE' | 'SUGARCANE' | 'POTATO'
  | 'ONION' | 'TOMATO' | 'CHILLI' | 'PULSES' | 'VEGETABLES' | 'FRUITS' | 'FODDER' | 'OILSEEDS' | 'OTHER';

export type FertilizerType = 'UREA' | 'DAP' | 'NPK' | 'POTASH' | 'ZINC' | 'SULFUR'
  | 'BORON' | 'MICRONUTRIENT' | 'ORGANIC' | 'BIO_FERTILIZER' | 'LIQUID' | 'FOLIAR' | 'OTHER';

export type FeedType = 'STARTER' | 'GROWER' | 'FINISHER' | 'LAYER' | 'BREEDER'
  | 'MILK_REPLACER' | 'MINERAL_MIX' | 'CONCENTRATE' | 'ROUGHAGE' | 'SILAGE'
  | 'HAY' | 'BRAN' | 'OIL_CAKE' | 'MOLASSES' | 'OTHER';

export type SeasonType = 'KHARIF' | 'RABI' | 'ZAID' | 'ALL_SEASON' | 'SPRING' | 'SUMMER' | 'MONSOON' | 'WINTER';

export interface AgriProductProfile {
  id: string;
  productId: string;
  category: AgriCategory;
  subCategory?: string;
  seedType?: SeedType;
  fertilizerType?: FertilizerType;
  feedType?: FeedType;
  brand?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  npkRatio?: string;
  activeIngredient?: string;
  ingredients?: unknown;
  concentration?: string;
  packSize?: string;
  packUnit?: string;
  bagsPerTon?: number;
  applicationRate?: string;
  applicationMethod?: string;
  applicationInterval?: string;
  targetCrops: string[];
  targetPests: string[];
  targetAnimals: string[];
  season?: SeasonType;
  suitableFor: string[];
  cropStage?: string;
  toxicityLevel?: string;
  ppePeriod?: number;
  reEntryPeriod?: number;
  warningLabel?: string;
  hazardClass?: string;
  isOrganic: boolean;
  organicCertNumber?: string;
  govtRegNumber?: string;
  govtRegExpiry?: string;
  shelfLifeMonths?: number;
  storageTemp?: string;
  storageInstructions?: string;
  reorderLevel?: number;
  minStockAlert?: number;
  bulkDiscountThreshold?: number;
  bulkDiscountPct?: number;
  imageUrls: string[];
  descriptionLong?: string;
  usageInstructions?: string;
  precautions?: string;
  firstAid?: string;
  msdsUrl?: string;
  brochureUrl?: string;
  videoUrl?: string;
  isPopular: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  isSeasonal: boolean;
  isRestricted: boolean;
  requiresLicense: boolean;
  totalSold: number;
  totalRevenue: number;
  product?: unknown;
  createdAt: string;
  updatedAt: string;
}

/** Light per-product facts (GET /agri/products/facts). */
export type AgriFacts = Pick<AgriProductProfile,
  'productId' | 'category' | 'season' | 'brand' | 'manufacturer' | 'npkRatio' | 'activeIngredient' | 'packSize' | 'packUnit' | 'targetCrops' | 'targetPests'
  | 'applicationRate' | 'toxicityLevel' | 'govtRegNumber' | 'govtRegExpiry' | 'isRestricted' | 'requiresLicense' | 'isOrganic'
  | 'bulkDiscountThreshold' | 'bulkDiscountPct' | 'reEntryPeriod' | 'ppePeriod'>;


export const agriProductsApi = {
  /** Agri details of a new product (needs products.create). */
  upsert: (data: Partial<AgriProductProfile>) => post<AgriProductProfile>('/agri/products', data),
  /** Agri details of an existing product (needs products.edit). */
  update: (data: Partial<AgriProductProfile>) => put<AgriProductProfile>('/agri/products', data),
  facts: () => get<AgriFacts[]>('/agri/products/facts'),
  list: (params?: object) => get<AgriProductProfile[]>('/agri/products', params),
  byProduct: (productId: string) => get<AgriProductProfile | null>('/agri/products/by-product/' + productId),
};
