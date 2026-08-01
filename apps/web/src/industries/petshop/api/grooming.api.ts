import { apiClient } from '@core/api/client';
import type { PetSpeciesType } from './products.api';

export type PetGroomingStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'READY_FOR_PICKUP'
  | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type PetGroomingServiceType =
  | 'BATH_BASIC' | 'BATH_DELUXE' | 'FULL_GROOMING' | 'HAIRCUT'
  | 'NAIL_TRIMMING' | 'EAR_CLEANING' | 'TEETH_CLEANING' | 'FLEA_TREATMENT'
  | 'DE_SHEDDING' | 'ANAL_GLAND' | 'STYLING' | 'PACKAGE' | 'OTHER';

export interface PetGroomingAppointment {
  id: string;
  appointmentNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  petName: string;
  petSpecies: PetSpeciesType;
  petBreed?: string;
  petAgeMonths?: number;
  petWeightKg?: number;
  petTemperament?: string;
  petAllergies?: string;
  petSpecialInstructions?: string;
  scheduledDate: string;
  scheduledSlot?: string;
  checkedInAt?: string;
  startedAt?: string;
  completedAt?: string;
  pickedUpAt?: string;
  serviceType: PetGroomingServiceType;
  additionalServices: PetGroomingServiceType[];
  serviceDescription?: string;
  groomerId?: string;
  groomerName?: string;
  status: PetGroomingStatus;
  serviceFee: number;
  additionalCharges: number;
  discount: number;
  totalFee: number;
  paidAmount: number;
  paymentMethod?: string;
  photosBeforeUrls: string[];
  photosAfterUrls: string[];
  customerRating?: number;
  customerFeedback?: string;
  groomerNotes?: string;
  computed?: { durationMinutes: number | null; balance: number };
  previousVisits?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const groomingApi = {
  create: (data: Partial<PetGroomingAppointment>) =>
    apiClient.post('/petshop/grooming', data).then(unwrap<PetGroomingAppointment>),

  list: (params?: {
    status?: string; customerId?: string; groomerId?: string; species?: string;
    today?: boolean; from?: string; to?: string; search?: string;
  }) => apiClient.get('/petshop/grooming', { params }).then(unwrap<PetGroomingAppointment[]>),

  summary: () => apiClient.get('/petshop/grooming/summary').then(unwrap<any>),
  today: () => apiClient.get('/petshop/grooming/today').then(unwrap<PetGroomingAppointment[]>),
  availableSlots: (groomerId: string, date: string) =>
    apiClient.get('/petshop/grooming/available-slots', { params: { groomerId, date } }).then(unwrap<any>),

  getOne: (id: string) => apiClient.get('/petshop/grooming/' + id).then(unwrap<PetGroomingAppointment>),

  assignGroomer: (id: string, groomerId: string) =>
    apiClient.post('/petshop/grooming/' + id + '/assign-groomer', { groomerId }).then(unwrap<PetGroomingAppointment>),

  checkIn: (id: string, data: { photosBeforeUrls?: string[]; notes?: string }) =>
    apiClient.post('/petshop/grooming/' + id + '/check-in', data).then(unwrap<PetGroomingAppointment>),

  start: (id: string) =>
    apiClient.post('/petshop/grooming/' + id + '/start').then(unwrap<PetGroomingAppointment>),

  complete: (id: string, data: { photosAfterUrls?: string[]; additionalCharges?: number; discount?: number; groomerNotes?: string }) =>
    apiClient.post('/petshop/grooming/' + id + '/complete', data).then(unwrap<PetGroomingAppointment>),

  pickup: (id: string) =>
    apiClient.post('/petshop/grooming/' + id + '/pickup').then(unwrap<PetGroomingAppointment>),

  payment: (id: string, data: { amount: number; paymentMethod?: string }) =>
    apiClient.post('/petshop/grooming/' + id + '/payment', data).then(unwrap<PetGroomingAppointment>),

  rate: (id: string, data: { rating: number; feedback?: string }) =>
    apiClient.post('/petshop/grooming/' + id + '/rate', data).then(unwrap<PetGroomingAppointment>),

  updateStatus: (id: string, data: { status: PetGroomingStatus; reason?: string; rescheduledDate?: string }) =>
    apiClient.patch('/petshop/grooming/' + id + '/status', data).then(unwrap<PetGroomingAppointment>),

  remove: (id: string) => apiClient.delete('/petshop/grooming/' + id).then(unwrap),
};
