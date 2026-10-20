import { apiClient } from '@core/api/client';
import type { PetSpeciesType } from './products.api';

export type PetGroomingStatus =
  | 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'READY_FOR_PICKUP'
  | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type PetGroomingServiceType =
  | 'BATH' | 'HAIRCUT' | 'FULL_GROOMING' | 'NAIL_TRIMMING' | 'EAR_CLEANING' | 'TEETH_CLEANING'
  | 'ANAL_GLAND' | 'FLEA_TREATMENT' | 'DEWORMING' | 'DELUXE_PACKAGE' | 'OTHER';

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
  previousVisits?: PetGroomingAppointment[];
  createdAt: string;
  updatedAt: string;
}

export interface GroomingInput {
  customerId?: string; customerName: string; customerPhone: string;
  petName: string; petSpecies: PetSpeciesType; petBreed?: string; petAgeMonths?: number; petWeightKg?: number;
  petTemperament?: string; petAllergies?: string; petSpecialInstructions?: string;
  scheduledDate: string; scheduledSlot?: string; serviceType: PetGroomingServiceType; additionalServices?: PetGroomingServiceType[];
  serviceDescription?: string; groomerId?: string; serviceFee: number; additionalCharges?: number; discount?: number;
}

export interface GroomingPage {
  items: PetGroomingAppointment[]; total: number; page: number; limit: number;
  totals: { fee: number; paid: number };
  counts: Partial<Record<PetGroomingStatus, number>>;
}

export interface GroomingAnalytics {
  booked: number; done: number; noShow: number; cancelled: number; value: number; avgRating: number | null;
  byDay: Bucket[]; byService: Bucket[]; byGroomer: Bucket[]; bySpecies: Bucket[];
}
interface Bucket { key: string; count: number; value: number }

export interface PaymentPart { method: string; amount: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope varies by endpoint
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const groomingApi = {
  create: (data: GroomingInput) => apiClient.post('/petshop/grooming', data).then(unwrap<PetGroomingAppointment>),
  /** `status` may be OPEN (booked to ready); `from`/`to` filter the visit day. */
  paged: (params: { status?: string; groomerId?: string; species?: string; today?: boolean; from?: string; to?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/petshop/grooming/paged', { params }).then(unwrap<GroomingPage>),
  analytics: (params: { from?: string; to?: string }) => apiClient.get('/petshop/grooming/analytics', { params }).then(unwrap<GroomingAnalytics>),
  availableSlots: (groomerId: string, date: string) =>
    apiClient.get('/petshop/grooming/available-slots', { params: { groomerId, date } })
      .then(unwrap<{ available: string[]; booked: Array<{ scheduledSlot?: string; petName: string }>; reason?: string }>),
  getOne: (id: string) => apiClient.get('/petshop/grooming/' + id).then(unwrap<PetGroomingAppointment>),
  start: (id: string) => apiClient.post('/petshop/grooming/' + id + '/start').then(unwrap<PetGroomingAppointment>),
  complete: (id: string, data: { additionalCharges?: number; discount?: number; groomerNotes?: string }) =>
    apiClient.post('/petshop/grooming/' + id + '/complete', data).then(unwrap<PetGroomingAppointment>),
  /** Pet goes home: the bill is made. `payments` splits the money; less than the balance goes on the khata. */
  pickup: (id: string, data: { paymentMethod?: string; paidAmount?: number; payments?: PaymentPart[] }) =>
    apiClient.post('/petshop/grooming/' + id + '/pickup', data)
      .then(unwrap<PetGroomingAppointment & { sale?: { id: string; saleNumber: string }; change?: number }>),
  update: (id: string, data: Partial<GroomingInput>) => apiClient.patch('/petshop/grooming/' + id, data).then(unwrap<PetGroomingAppointment>),
  /** Advance before pickup; kept on the customer's khata. */
  payment: (id: string, data: { amount: number; paymentMethod?: string }) =>
    apiClient.post('/petshop/grooming/' + id + '/payment', data).then(unwrap<PetGroomingAppointment>),
  rate: (id: string, data: { rating: number; feedback?: string }) =>
    apiClient.post('/petshop/grooming/' + id + '/rate', data).then(unwrap<PetGroomingAppointment>),
  updateStatus: (id: string, data: { status: PetGroomingStatus; reason?: string; rescheduledDate?: string }) =>
    apiClient.patch('/petshop/grooming/' + id + '/status', data).then(unwrap<PetGroomingAppointment>),
  /** Cancels the appointment (nothing is deleted). */
  cancel: (id: string) => apiClient.delete('/petshop/grooming/' + id).then(unwrap<PetGroomingAppointment>),
};
