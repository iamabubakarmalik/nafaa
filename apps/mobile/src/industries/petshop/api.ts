/**
 * Pet shop endpoints (same paths and shapes as apps/web/src/industries/petshop/api):
 * live animals, grooming visits, groomers, product profiles and the dashboard
 * overview. They need the server; screens show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';
import type { AnimalStatus, GroomingStatus, PetSpecies } from '@nafaa/core/industries/petshop';

export type { AnimalStatus, GroomingStatus, PetSpecies };
export type PetSpeciesType = PetSpecies;
export type PetLifeStage = 'PUPPY' | 'KITTEN' | 'ADULT' | 'SENIOR' | 'ALL_STAGES';
export type PetCategoryType = string;

export type GroomingService =
  | 'BATH' | 'HAIRCUT' | 'FULL_GROOMING' | 'NAIL_TRIMMING' | 'EAR_CLEANING' | 'TEETH_CLEANING'
  | 'ANAL_GLAND' | 'FLEA_TREATMENT' | 'DEWORMING' | 'DELUXE_PACKAGE' | 'OTHER';

export interface MedicalEntry { at: string; type: string; description: string; vetName?: string; cost?: number; nextDueDate?: string | null }

export interface LiveAnimal {
  id: string; animalNumber: string; species: PetSpecies; breed?: string; name?: string; gender?: string; ageMonths?: number; color?: string; weightKg?: number;
  acquiredDate?: string; sourceType?: string; sourceName?: string;
  isVaccinated: boolean; vaccinationDetails?: string; isDewormed: boolean; dewormingDetails?: string; hasHealthCertificate: boolean; healthNotes?: string;
  medicalHistory?: MedicalEntry[]; costPrice?: number; askingPrice: number; soldPrice?: number; soldAt?: string; soldToCustomerName?: string;
  status: AnimalStatus; currentCage?: string; feedingSchedule?: string; specialNeeds?: string; imageUrls: string[]; isFeatured: boolean; notes?: string;
  createdAt: string; updatedAt: string;
}
export interface AnimalPage { items: LiveAnimal[]; total: number; page: number; pages: number; limit: number; counts: Partial<Record<AnimalStatus, number>> }
export interface AnimalAnalytics {
  sold: number; revenue: number; profit: number; deaths: number; deathLoss: number; avgDaysToSell: number | null;
  bySpecies: Array<{ species: string; sold: number; revenue: number; profit: number }>;
  inStock: Array<{ species: string; count: number; value: number; cost: number }>;
}
export interface AnimalSummary {
  available: number; reserved: number; sold: number; deceased: number; inventoryValue: number; inventoryCost: number;
  monthly: { count: number; revenue: number; cost: number; profit: number };
}

export interface Grooming {
  id: string; appointmentNumber: string; customerId?: string; customerName: string; customerPhone: string;
  petName: string; petSpecies: PetSpecies; petBreed?: string; petAgeMonths?: number; petWeightKg?: number; petTemperament?: string; petAllergies?: string; petSpecialInstructions?: string;
  scheduledDate: string; scheduledSlot?: string; serviceType: GroomingService; additionalServices: GroomingService[]; serviceDescription?: string;
  groomerId?: string; groomerName?: string; status: GroomingStatus; serviceFee: number; additionalCharges: number; discount: number; totalFee: number; paidAmount: number;
  customerRating?: number; customerFeedback?: string; groomerNotes?: string; previousVisits?: Grooming[]; createdAt: string;
}
export interface GroomingInput {
  customerName: string; customerPhone: string; petName: string; petSpecies: PetSpecies; petBreed?: string; petAgeMonths?: number; petWeightKg?: number;
  petTemperament?: string; petAllergies?: string; petSpecialInstructions?: string; scheduledDate: string; scheduledSlot?: string;
  serviceType: GroomingService; additionalServices?: GroomingService[]; groomerId?: string; serviceFee: number; additionalCharges?: number; discount?: number;
}
export interface GroomingPage {
  items: Grooming[]; total: number; page: number; pages: number; limit: number; totals: { fee: number; paid: number }; counts: Partial<Record<GroomingStatus, number>>;
}
interface Bucket { key: string; count: number; value: number }
export interface GroomingAnalytics { booked: number; done: number; noShow: number; cancelled: number; value: number; avgRating: number | null; byDay: Bucket[]; byService: Bucket[]; byGroomer: Bucket[]; bySpecies: Bucket[] }

export interface Groomer {
  id: string; employeeCode: string; name: string; phone: string; cnic?: string; specializations: PetSpecies[]; serviceTypes: GroomingService[];
  experienceYears?: number; workingDays: number[]; workStartTime: string; workEndTime: string; perServiceRate?: number; commissionPct: number; isActive: boolean;
  completedAppointments: number; totalRevenue: number; avgRating?: number; todayAppointments?: Grooming[]; upcoming?: Grooming[];
}
export type GroomerInput = Pick<Groomer, 'employeeCode' | 'name' | 'phone' | 'specializations' | 'serviceTypes' | 'workingDays' | 'workStartTime' | 'workEndTime' | 'commissionPct' | 'isActive'>
  & { cnic?: string; experienceYears?: number; perServiceRate?: number };

export interface PetProfile {
  id: string; productId: string; categoryType?: PetCategoryType; species?: PetSpecies; lifeStage?: PetLifeStage; brand?: string; packSize?: string; flavor?: string;
  weightKg?: number; isGrainFree: boolean; isPrescriptionOnly: boolean; activeIngredient?: string; dosageForm?: string; dosageStrength?: string; storageInstructions?: string;
  size?: string; material?: string; tankCapacityLiters?: number; expiryDate?: string; batchNumber?: string;
}

export interface PetOverview {
  totals?: { animalsAvailable?: number; animalsReserved?: number; animalInventoryValue?: number | string; activeGroomers?: number };
  pending?: { todayAppointments?: number; pendingAppointments?: number; readyForPickup?: number; expiringMedicines?: number; expiredMedicines?: number; healthAlerts?: number };
  today?: { groomingCount?: number; groomingRevenue?: number | string; animalSalesCount?: number; animalRevenue?: number | string };
  monthly?: { grooming?: { count?: number; billed?: number | string; collected?: number | string }; liveAnimals?: { count?: number; revenue?: number | string; cost?: number | string; profit?: number | string } };
  todaySchedule?: Grooming[]; pickupList?: Grooming[]; healthAlerts?: LiveAnimal[];
  expiringList?: Array<{ id: string; productId?: string; brand?: string; batchNumber?: string; expiryDate?: string; product?: { name?: string } }>;
}

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);

export const liveAnimalsApi = {
  create: (data: Partial<LiveAnimal>) => post<LiveAnimal>('/petshop/live-animals', data),
  list: (params?: { status?: string; species?: string; search?: string }) => get<LiveAnimal[]>('/petshop/live-animals', params),
  /** `status` may be ON_SALE (available and reserved). */
  paged: (params: { species?: string; status?: string; vaccinated?: boolean; search?: string; page?: number; limit?: number }) => get<AnimalPage>('/petshop/live-animals/paged', params),
  analytics: (params: { from?: string; to?: string }) => get<AnimalAnalytics>('/petshop/live-animals/analytics', params),
  summary: () => get<AnimalSummary>('/petshop/live-animals/summary'),
  getOne: (id: string) => get<LiveAnimal>(`/petshop/live-animals/${id}`),
  update: (id: string, data: Partial<LiveAnimal>) => patch<LiveAnimal>(`/petshop/live-animals/${id}`, data),
  reserve: (id: string, customerName?: string) => post<LiveAnimal>(`/petshop/live-animals/${id}/reserve`, { customerName }),
  unreserve: (id: string) => post<LiveAnimal>(`/petshop/live-animals/${id}/unreserve`),
  /** Catalogue line (stock 1) the counter bills this animal through. */
  counterItem: (id: string) => post<{ animalId: string; productId: string; name: string; price: number; cost: number }>(`/petshop/live-animals/${id}/counter-item`),
  /** Marks every animal on a counter bill sold. */
  fromSale: (saleId: string) => post<{ saleNumber: string; marked: string[] }>(`/petshop/live-animals/from-sale/${saleId}`),
  addMedicalRecord: (id: string, data: { type: string; description: string; vetName?: string; cost?: number; nextDueDate?: string; paidNow?: boolean; paymentMethod?: string }) =>
    post<LiveAnimal>(`/petshop/live-animals/${id}/medical-record`, data),
  updateStatus: (id: string, data: { status: AnimalStatus; reason?: string }) => patch<LiveAnimal>(`/petshop/live-animals/${id}/status`, data),
};

export const groomingApi = {
  create: (data: GroomingInput) => post<Grooming>('/petshop/grooming', data),
  paged: (params: { status?: string; groomerId?: string; species?: string; today?: boolean; from?: string; to?: string; search?: string; page?: number; limit?: number }) => get<GroomingPage>('/petshop/grooming/paged', params),
  analytics: (params: { from?: string; to?: string }) => get<GroomingAnalytics>('/petshop/grooming/analytics', params),
  availableSlots: (groomerId: string, date: string) => get<{ available: string[]; booked: Array<{ scheduledSlot?: string; petName: string }>; reason?: string }>('/petshop/grooming/available-slots', { groomerId, date }),
  getOne: (id: string) => get<Grooming>(`/petshop/grooming/${id}`),
  start: (id: string) => post<Grooming>(`/petshop/grooming/${id}/start`),
  complete: (id: string, data: { additionalCharges?: number; discount?: number; groomerNotes?: string }) => post<Grooming>(`/petshop/grooming/${id}/complete`, data),
  pickup: (id: string, data: { paymentMethod?: string; paidAmount?: number; payments?: Array<{ method: string; amount: number }> }) =>
    post<Grooming & { sale?: { id: string; saleNumber: string }; change?: number }>(`/petshop/grooming/${id}/pickup`, data),
  update: (id: string, data: Partial<GroomingInput>) => patch<Grooming>(`/petshop/grooming/${id}`, data),
  payment: (id: string, data: { amount: number; paymentMethod?: string }) => post<Grooming>(`/petshop/grooming/${id}/payment`, data),
  rate: (id: string, data: { rating: number; feedback?: string }) => post<Grooming>(`/petshop/grooming/${id}/rate`, data),
  updateStatus: (id: string, data: { status: GroomingStatus; reason?: string; rescheduledDate?: string }) => patch<Grooming>(`/petshop/grooming/${id}/status`, data),
  cancel: (id: string) => apiClient.delete<Grooming>(`/petshop/grooming/${id}`).then((r) => r.data),
};

export const groomersApi = {
  create: (data: GroomerInput) => post<Groomer>('/petshop/groomers', data),
  list: (params?: { active?: boolean; availableToday?: boolean; species?: string; search?: string }) => get<Groomer[]>('/petshop/groomers', params),
  getOne: (id: string) => get<Groomer>(`/petshop/groomers/${id}`),
  workload: (id: string, from?: string, to?: string) => get<{ totals: { total: number; completed: number; cancelled: number; noShow: number; revenue: number; commission: number } }>(`/petshop/groomers/${id}/workload`, { from, to }),
  update: (id: string, data: Partial<GroomerInput>) => patch<Groomer>(`/petshop/groomers/${id}`, data),
  deactivate: (id: string) => apiClient.delete<Groomer>(`/petshop/groomers/${id}`).then((r) => r.data),
};

export const petProductsApi = {
  upsert: (data: Partial<PetProfile>) => post<PetProfile>('/petshop/products', data),
  list: () => get<PetProfile[]>('/petshop/products'),
  byProduct: (productId: string) => get<PetProfile | null>(`/petshop/products/by-product/${productId}`),
};

export const petshopDashboardApi = { overview: () => get<PetOverview>('/petshop/dashboard/overview') };
