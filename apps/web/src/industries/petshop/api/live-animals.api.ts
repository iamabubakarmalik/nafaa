import { apiClient } from '@core/api/client';
import type { PetSpeciesType } from './products.api';

export type PetSaleStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DECEASED' | 'RETURNED';

export interface PetLiveAnimal {
  id: string;
  animalNumber: string;
  species: PetSpeciesType;
  breed?: string;
  subBreed?: string;
  name?: string;
  gender?: string;
  ageMonths?: number;
  color?: string;
  weightKg?: number;
  birthDate?: string;
  acquiredDate?: string;
  sourceType?: string;
  sourceName?: string;
  isVaccinated: boolean;
  vaccinationDetails?: string;
  isDewormed: boolean;
  dewormingDetails?: string;
  hasHealthCertificate: boolean;
  healthNotes?: string;
  medicalHistory?: MedicalEntry[];
  costPrice?: number;
  askingPrice: number;
  soldPrice?: number;
  soldAt?: string;
  soldToCustomerId?: string;
  soldToCustomerName?: string;
  status: PetSaleStatus;
  currentCage?: string;
  feedingSchedule?: string;
  specialNeeds?: string;
  imageUrls: string[];
  videoUrl?: string;
  isFeatured: boolean;
  notes?: string;
  computed?: {
    ageDays: number | null;
    ageMonthsComputed: number | null;
    daysInStore: number | null;
    profit: number | null;
    isLongStay: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MedicalEntry { at: string; type: string; description: string; vetName?: string; cost?: number; nextDueDate?: string | null }

export interface AnimalPage {
  items: PetLiveAnimal[]; total: number; page: number; limit: number;
  counts: Partial<Record<PetSaleStatus, number>>;
}

export interface AnimalAnalytics {
  sold: number; revenue: number; profit: number; deaths: number; deathLoss: number; avgDaysToSell: number | null;
  bySpecies: Array<{ species: string; sold: number; revenue: number; profit: number }>;
  inStock: Array<{ species: string; count: number; value: number; cost: number }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope varies by endpoint
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const liveAnimalsApi = {
  create: (data: Partial<PetLiveAnimal>) => apiClient.post('/petshop/live-animals', data).then(unwrap<PetLiveAnimal>),
  /** Animals for the counter (on sale), unpaged. */
  list: (params?: { status?: string; species?: string; search?: string }) =>
    apiClient.get('/petshop/live-animals', { params }).then(unwrap<PetLiveAnimal[]>),
  /** `status` may be ON_SALE (available and reserved). */
  paged: (params: { species?: string; status?: string; vaccinated?: boolean; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/petshop/live-animals/paged', { params }).then(unwrap<AnimalPage>),
  analytics: (params: { from?: string; to?: string }) => apiClient.get('/petshop/live-animals/analytics', { params }).then(unwrap<AnimalAnalytics>),
  summary: () => apiClient.get('/petshop/live-animals/summary')
    .then(unwrap<{ available: number; reserved: number; sold: number; deceased: number; inventoryValue: number; inventoryCost: number; monthly: { count: number; revenue: number; cost: number; profit: number } }>),
  getOne: (id: string) => apiClient.get('/petshop/live-animals/' + id).then(unwrap<PetLiveAnimal>),
  update: (id: string, data: Partial<PetLiveAnimal>) => apiClient.patch('/petshop/live-animals/' + id, data).then(unwrap<PetLiveAnimal>),
  reserve: (id: string, customerName?: string) => apiClient.post('/petshop/live-animals/' + id + '/reserve', { customerName }).then(unwrap<PetLiveAnimal>),
  unreserve: (id: string) => apiClient.post('/petshop/live-animals/' + id + '/unreserve').then(unwrap<PetLiveAnimal>),
  /** Catalogue line (stock 1) the POS bills this animal through. */
  counterItem: (id: string) =>
    apiClient.post('/petshop/live-animals/' + id + '/counter-item').then(unwrap<{ animalId: string; productId: string; name: string; price: number; cost: number }>),
  /** Marks every animal on a counter bill sold. */
  fromSale: (saleId: string) => apiClient.post('/petshop/live-animals/from-sale/' + saleId).then(unwrap<{ saleNumber: string; marked: string[] }>),
  addMedicalRecord: (id: string, data: { type: string; description: string; vetName?: string; cost?: number; nextDueDate?: string; paidNow?: boolean; paymentMethod?: string }) =>
    apiClient.post('/petshop/live-animals/' + id + '/medical-record', data).then(unwrap<PetLiveAnimal>),
  /** Shelf states; DECEASED writes the cost off as a loss. */
  updateStatus: (id: string, data: { status: PetSaleStatus; reason?: string }) =>
    apiClient.patch('/petshop/live-animals/' + id + '/status', data).then(unwrap<PetLiveAnimal>),
};
