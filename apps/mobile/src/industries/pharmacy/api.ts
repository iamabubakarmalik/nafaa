/**
 * Pharmacy endpoints (same paths and shapes as apps/web/src/industries/pharmacy/api):
 * medicines and their formula, prescriptions, doctors, salts and interactions,
 * expiry, the narcotic register, cold chain and the dashboard numbers. They
 * need the server; screens show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);

/* ───────────── medicines ───────────── */

export type StorageCondition = 'ROOM_TEMPERATURE' | 'COOL' | 'REFRIGERATED' | 'FROZEN' | 'CONTROLLED_ROOM' | 'PROTECT_FROM_LIGHT' | 'PROTECT_FROM_MOISTURE';

export interface PharmacyMedicine {
  id: string; productId: string; registrationNumber?: string; dosageForm?: string; packSize?: string; manufacturer?: string; indication?: string;
  storageCondition: StorageCondition; storageInstructions?: string; requiresColdChain: boolean; minTemperature?: number; maxTemperature?: number;
  scheduleClass: string; requiresPrescription: boolean; isNarcotic: boolean; isRefrigerated: boolean; isGeneric: boolean;
  product?: { productSalts?: Array<{ saltId: string; strength: string | null; isMainSalt: boolean; salt?: { name: string } }> } | null;
}

/** Lean medicine facts per product, for the counter and the product list. */
export interface MedicineFacts {
  id: string; medicineId: string; productId: string; scheduleClass: string; requiresPrescription: boolean; isNarcotic: boolean;
  requiresColdChain: boolean; isRefrigerated: boolean; dosageForm: string | null; packSize: string | null; manufacturer: string | null;
  registrationNumber: string | null; isGeneric: boolean; storageInstructions: string | null;
  /** "Paracetamol 500mg + Caffeine 65mg" */
  generic: string;
  saltIds: string[];
}

export const medicinesApi = {
  upsert: (data: Record<string, unknown>) => post<PharmacyMedicine>('/pharmacy/medicines', data),
  lookup: () => get<MedicineFacts[]>('/pharmacy/medicines/lookup'),
  byProduct: (productId: string) => get<PharmacyMedicine | null>(`/pharmacy/medicines/by-product/${productId}`),
};

/* ───────────── prescriptions ───────────── */

export type PrescriptionStatus = 'PENDING' | 'VERIFIED' | 'PARTIALLY_DISPENSED' | 'DISPENSED' | 'REJECTED' | 'CANCELLED';
export type PrescriptionType = 'WALK_IN' | 'ONLINE' | 'REFILL' | 'HOSPITAL' | 'INSURANCE' | 'EMERGENCY';
export type RefillFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'AS_NEEDED';

export interface PrescriptionItem {
  id?: string; productId?: string; batchId?: string; medicineName: string; saltName?: string; strength?: string; dose?: string; frequency?: string;
  duration?: string; instructions?: string; prescribedQty: number; dispensedQty?: number; unit?: string; unitPrice?: number; totalPrice?: number;
  isDispensed?: boolean; isSubstituted?: boolean; substituteFor?: string;
}

export interface Prescription {
  id: string; prescriptionNumber: string; type: PrescriptionType; status: PrescriptionStatus;
  doctorId?: string; doctorName?: string; doctorRegNumber?: string; doctorSpeciality?: string; hospitalName?: string;
  customerId?: string; patientName?: string; patientAge?: number; patientGender?: string; patientPhone?: string; patientCnic?: string;
  prescriptionDate?: string; diagnosis?: string; imageUrls: string[]; isRefillable: boolean; refillsAllowed: number; refillsUsed: number;
  refillFrequency?: RefillFrequency; nextRefillDate?: string; verifiedAt?: string; dispensedAt?: string; rejectionReason?: string;
  totalAmount: number; notes?: string; items: PrescriptionItem[];
  sale?: { id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number; status: string; soldAt: string } | null;
  createdAt: string; updatedAt: string;
}

export interface PrescriptionQuery { status?: PrescriptionStatus; doctorId?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }
export interface PrescriptionPage {
  items: Prescription[]; total: number; page: number; limit: number;
  counts: Record<'all' | PrescriptionStatus, number>; dispensedValue: number;
}

export interface DispensePayload {
  items: Array<{ itemId: string; dispensedQty: number; unitPrice?: number; productId?: string; batchId?: string }>;
  paymentMethod?: string; paidAmount?: number; discount?: number; managerPin?: string; notes?: string;
}

export const prescriptionsApi = {
  create: (data: Record<string, unknown>) => post<Prescription>('/pharmacy/prescriptions', data),
  page: (params: PrescriptionQuery) => get<PrescriptionPage>('/pharmacy/prescriptions/page', params),
  getOne: (id: string) => get<Prescription>(`/pharmacy/prescriptions/${id}`),
  verify: (id: string, notes?: string) => post<Prescription>(`/pharmacy/prescriptions/${id}/verify`, { notes }),
  reject: (id: string, reason: string) => post<Prescription>(`/pharmacy/prescriptions/${id}/reject`, { reason }),
  dispense: (id: string, body: DispensePayload) => post<Prescription & { sale?: { id: string; saleNumber: string; total: number; creditAmount: number } }>(`/pharmacy/prescriptions/${id}/dispense`, body),
  refill: (id: string) => post<Prescription>(`/pharmacy/prescriptions/${id}/refill`),
};

/** Batches of a product in a branch, for choosing what to hand over (same endpoint as the counter's batch picker). */
export interface PosBatch { id: string; productId: string; batchNumber: string; expiryDate: string | null; quantity: number }
export const batchesApi = {
  list: (shopId: string, productIds: string[]) => get<PosBatch[]>('/sales/batches', { shopId, productIds: productIds.join(',') }),
};

/* ───────────── doctors ───────────── */

export interface Doctor {
  id: string; name: string; registrationNumber: string; phone?: string; cnic?: string; qualification?: string; specialization?: string;
  clinicName?: string; clinicAddress?: string; hospitalAffiliation?: string; totalPrescriptions: number; totalBusiness: number;
  lastPrescriptionAt?: string | null; notes?: string; isVerified: boolean; isActive: boolean;
}

export const doctorsApi = {
  create: (data: Record<string, unknown>) => post<Doctor>('/pharmacy/doctors', data),
  list: (params?: { search?: string; isActive?: boolean }) => get<Doctor[]>('/pharmacy/doctors', params),
  update: (id: string, data: Record<string, unknown>) => patch<Doctor>(`/pharmacy/doctors/${id}`, data),
  verify: (id: string) => post<Doctor>(`/pharmacy/doctors/${id}/verify`),
  remove: (id: string) => apiClient.delete<unknown>(`/pharmacy/doctors/${id}`).then((r) => r.data),
};

/* ───────────── salts and interactions ───────────── */

export interface Salt {
  id: string; name: string; genericName?: string; code?: string; category?: string; standardDose?: string; maxDailyDose?: string;
  isPregnancySafe: boolean; isPediatricSafe: boolean; sideEffects?: string; warnings?: string; scheduleClass: string;
  requiresPrescription: boolean; isNarcotic: boolean; isActive: boolean; _count?: { productSalts: number };
}

export interface DrugInteraction {
  id: string; saltAId: string; saltBId: string; severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
  description: string; clinicalEffect?: string; management?: string; isActive: boolean; saltA?: { name: string }; saltB?: { name: string };
}

export interface SaltBrand { product: { id: string; name: string; price: number; stock: number; isActive: boolean; brand?: { name: string } | null }; strength: string }

export const saltsApi = {
  create: (data: Record<string, unknown>) => post<Salt>('/pharmacy/salts', data),
  list: (params?: { search?: string }) => get<Salt[]>('/pharmacy/salts', params),
  update: (id: string, data: Record<string, unknown>) => patch<Salt>(`/pharmacy/salts/${id}`, data),
  assign: (productId: string, salts: Array<{ saltId: string; strength: string; isMainSalt: boolean }>) => post<unknown>(`/pharmacy/salts/assign/${productId}`, { salts }),
  productsBySalt: (id: string) => get<SaltBrand[]>(`/pharmacy/salts/${id}/products`),
};

export const interactionsApi = {
  list: (params?: { severity?: string; saltId?: string }) => get<DrugInteraction[]>('/pharmacy/drug-interactions', params),
  check: (saltIds: string[]) => post<{ interactions: DrugInteraction[]; hasWarnings: boolean; hasMajor: boolean }>('/pharmacy/drug-interactions/check', { saltIds }),
  create: (data: Record<string, unknown>) => post<DrugInteraction>('/pharmacy/drug-interactions', data),
  update: (id: string, data: Record<string, unknown>) => patch<DrugInteraction>(`/pharmacy/drug-interactions/${id}`, data),
  remove: (id: string) => apiClient.delete<unknown>(`/pharmacy/drug-interactions/${id}`).then((r) => r.data),
};

/* ───────────── expiry ───────────── */

export type ExpiryBucket = 'expired' | '30' | '90' | '180' | 'all';
export type ExpirySort = 'soon' | 'value' | 'name';

export interface ExpiryRow {
  id: string; batchNumber: string; expiryDate: string; daysLeft: number; quantity: number; unitCost: number; value: number; saleValue: number;
  shop: { id: string; name: string } | null;
  product: { id: string; name: string; unit: string; price: number; costPrice: number };
  medicine: { isNarcotic: boolean; requiresColdChain: boolean; requiresPrescription: boolean; dosageForm: string | null; manufacturer: string | null } | null;
  generic: string;
}
export interface ExpiryTotals { batches: number; qty: number; cost: number; sale: number }
export interface ExpiryPage { items: ExpiryRow[]; total: number; page: number; limit: number; totals: Record<'expired' | 'd30' | 'd90' | 'd180', ExpiryTotals> }
export interface BatchSourceLine {
  itemId: string; purchaseId: string; purchaseNumber: string; purchasedAt: string; supplier: { id: string; name: string };
  unitName: string | null; unitCost: number; returnableUnits: number;
}

export const expiryApi = {
  list: (params: { bucket?: ExpiryBucket; search?: string; sort?: ExpirySort; page?: number; limit?: number }) => get<ExpiryPage>('/pharmacy/expiry', params),
  source: (batchId: string) => get<{ batch: { id: string; batchNumber: string; quantity: number }; lines: BatchSourceLine[] }>(`/pharmacy/expiry/${batchId}/source`),
};

/* ───────────── narcotic register ───────────── */

export interface RxParty { patientName?: string; patientCnic?: string; patientPhone?: string; doctorName?: string; doctorRegNumber?: string; prescriptionNumber?: string }
export interface NarcoticOverviewRow {
  productId: string; name: string; unit: string; isActive: boolean; scheduleClass: string; dosageForm: string | null;
  stock: number; inQty: number; outQty: number; sales: number; missing: number;
}
export interface NarcoticOverview { items: NarcoticOverviewRow[]; totals: { medicines: number; sales: number; missing: number; out: number } }
export interface RegisterRow {
  no: number; id: string; at: string; type: string; label: string; reference: string | null; returnOf?: string; note: string | null;
  inQty: number; outQty: number; opening: number; closing: number; saleId?: string; saleVoided: boolean; party?: RxParty; missing: boolean;
}
export interface NarcoticRegister {
  medicine: { id: string; name: string; unit: string; scheduleClass: string; registrationNumber: string | null; dosageForm: string | null };
  opening: number; closing: number; inQty: number; outQty: number; missing: number; rows: RegisterRow[];
}
export interface SaleDetailsPayload {
  saleId: string; productId: string; patientName: string; patientCnic?: string; patientPhone?: string; doctorName: string; doctorRegNumber?: string; prescriptionNumber?: string;
}

export const controlledLogApi = {
  overview: (params?: { from?: string; to?: string }) => get<NarcoticOverview>('/pharmacy/controlled-log/overview', params),
  register: (productId: string, params?: { from?: string; to?: string }) => get<NarcoticRegister>(`/pharmacy/controlled-log/register/${productId}`, params),
  saleDetails: (data: SaleDetailsPayload) => post<unknown>('/pharmacy/controlled-log/sale-details', data),
};

/* ───────────── cold chain ───────────── */

export interface TemperatureLog {
  id: string; logDate: string; temperature: number; humidity?: number; location?: string; isWithinRange: boolean; minLimit?: number; maxLimit?: number; notes?: string;
}
export interface TemperatureSummary {
  total: number; breaches: number; compliancePct: number; lastReadingAt: string | null;
  byLocation: Array<{ location: string; _avg: { temperature: number | null; humidity: number | null }; _min: { temperature: number | null }; _max: { temperature: number | null } }>;
}

export const temperatureApi = {
  create: (data: Record<string, unknown>) => post<TemperatureLog>('/pharmacy/temperature-log', data),
  list: (params?: { location?: string; withinRange?: boolean; from?: string; to?: string }) => get<TemperatureLog[]>('/pharmacy/temperature-log', params),
  summary: (days = 7) => get<TemperatureSummary>('/pharmacy/temperature-log/summary', { days }),
};

/* ───────────── dashboard ───────────── */

export interface PharmacyOverview {
  totals?: { medicines: number; controlledCount: number; coldChainCount: number };
  prescriptions?: { pending: number; verified: number; dispensedToday: number };
  alerts?: { expiringSoon: number; expired: number; refillsDueToday: number; recentTempBreaches: number };
}
export interface ExpiringBatch { id: string; productId: string; batchNumber: string; expiryDate: string; quantity: number; costPrice?: number | null; product?: { id: string; name: string; unit?: string } }

export const pharmacyDashboardApi = {
  overview: (shopId?: string) => get<PharmacyOverview>('/pharmacy/dashboard/overview', shopId ? { shopId } : {}),
  expiring: (days = 90) => get<ExpiringBatch[]>('/pharmacy/dashboard/expiring', { days }),
};

/* ───────────── substitutes ───────────── */

export interface SubstituteSuggestion {
  product: { id: string; name: string; price: number; isActive: boolean };
  exact: boolean; stock: number; priceDifference: number;
  matchedSalts: Array<{ strength: string | null; salt: { name: string } }>;
}

export const substitutesApi = {
  autoSuggest: (productId: string) => get<SubstituteSuggestion[]>(`/pharmacy/substitutes/auto-suggest/${productId}`),
};
