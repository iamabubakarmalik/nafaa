import { apiClient } from '@core/api/client';
import type { PetSpeciesType } from './products.api';

export type PetSaleStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DECEASED' | 'RETURNED' | 'ADOPTED';

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
  medicalHistory?: any[];
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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const liveAnimalsApi = {
  create: (data: Partial<PetLiveAnimal>) =>
    apiClient.post('/petshop/live-animals', data).then(unwrap<PetLiveAnimal>),

  list: (params?: {
    species?: string; status?: string; breed?: string; featured?: boolean;
    vaccinated?: boolean; minPrice?: number; maxPrice?: number; search?: string;
  }) => apiClient.get('/petshop/live-animals', { params }).then(unwrap<PetLiveAnimal[]>),

  summary: () => apiClient.get('/petshop/live-animals/summary').then(unwrap<any>),
  longStay: (days = 60) => apiClient.get('/petshop/live-animals/long-stay', { params: { days } }).then(unwrap<PetLiveAnimal[]>),
  healthAlerts: () => apiClient.get('/petshop/live-animals/health-alerts').then(unwrap<PetLiveAnimal[]>),

  getOne: (id: string) => apiClient.get('/petshop/live-animals/' + id).then(unwrap<PetLiveAnimal>),
  update: (id: string, data: Partial<PetLiveAnimal>) =>
    apiClient.patch('/petshop/live-animals/' + id, data).then(unwrap<PetLiveAnimal>),

  reserve: (id: string, customerName?: string) =>
    apiClient.post('/petshop/live-animals/' + id + '/reserve', { customerName }).then(unwrap<PetLiveAnimal>),
  unreserve: (id: string) =>
    apiClient.post('/petshop/live-animals/' + id + '/unreserve').then(unwrap<PetLiveAnimal>),

  sell: (id: string, data: { soldPrice: number; soldToCustomerId?: string; soldToCustomerName?: string; notes?: string }) =>
    apiClient.post('/petshop/live-animals/' + id + '/sell', data).then(unwrap<PetLiveAnimal>),

  addMedicalRecord: (id: string, data: { type: string; description: string; vetName?: string; cost?: number; nextDueDate?: string }) =>
    apiClient.post('/petshop/live-animals/' + id + '/medical-record', data).then(unwrap<PetLiveAnimal>),

  updateStatus: (id: string, data: { status: PetSaleStatus; reason?: string }) =>
    apiClient.patch('/petshop/live-animals/' + id + '/status', data).then(unwrap<PetLiveAnimal>),

  remove: (id: string) => apiClient.delete('/petshop/live-animals/' + id).then(unwrap),
};
