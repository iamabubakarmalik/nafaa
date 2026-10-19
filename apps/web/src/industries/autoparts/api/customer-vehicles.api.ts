import { apiClient } from '@core/api/client';
import type { ServiceReminder } from './service-reminders.api';
import type { WorkshopJob } from './workshop-jobs.api';

export type FuelType = 'PETROL' | 'DIESEL' | 'CNG' | 'LPG' | 'HYBRID' | 'ELECTRIC' | 'OTHER';
export type TransmissionType = 'MANUAL' | 'AUTOMATIC' | 'CVT' | 'DCT' | 'SEMI_AUTO';

export interface CustomerVehicle {
  id: string;
  customerId: string;
  registrationNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
  makeId?: string;
  modelId?: string;
  makeName?: string;
  modelName?: string;
  vehicleType: string;
  year?: number;
  color?: string;
  fuelType: FuelType;
  transmission: TransmissionType;
  engineCC?: number;
  odometerKm?: number;
  ownerName?: string;
  ownerPhone?: string;
  ownerCnic?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: string;
  tokenTaxExpiry?: string;
  fitnessExpiry?: string;
  documentUrls: string[];
  photoUrls: string[];
  preferredMechanicId?: string;
  notes?: string;
  totalServices: number;
  totalSpent: number;
  lastServiceAt?: string;
  lastOdometerKm?: number;
  isActive: boolean;
  customer?: { id: string; name: string; phone?: string | null; balance: number } | null;
  serviceHistory?: WorkshopJob[];
  reminders?: ServiceReminder[];
  createdAt: string;
  updatedAt: string;
}

export type VehicleView = 'all' | 'papers' | 'regular' | 'away' | 'inactive';
export type VehicleSort = 'recent' | 'name' | 'spent' | 'visits';

export interface VehiclePage { items: Array<CustomerVehicle & { openJobs: number }>; total: number; page: number; limit: number; totalPages: number }
export interface VehicleStats { total: number; papers: number; regular: number; away: number; inShop: number }
export interface VehicleInput {
  registrationNumber?: string; customerId?: string; chassisNumber?: string; engineNumber?: string; makeId?: string; modelId?: string;
  makeName?: string; modelName?: string; vehicleType?: string; year?: number; color?: string; fuelType?: FuelType; transmission?: TransmissionType;
  engineCC?: number; odometerKm?: number; ownerName?: string; ownerPhone?: string; ownerCnic?: string; insuranceProvider?: string;
  insurancePolicyNumber?: string; insuranceExpiry?: string; tokenTaxExpiry?: string; fitnessExpiry?: string; notes?: string; isActive?: boolean;
}

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const customerVehiclesApi = {
  create: (data: VehicleInput) => apiClient.post('/autoparts/customer-vehicles', data).then(unwrap<CustomerVehicle>),
  page: (params: { view?: VehicleView; search?: string; makeId?: string; vehicleType?: string; customerId?: string; sort?: VehicleSort; page?: number; limit?: number }) =>
    apiClient.get('/autoparts/customer-vehicles', { params: { ...params, page: params.page ?? 1 } }).then(unwrap<VehiclePage>),
  stats: () => apiClient.get('/autoparts/customer-vehicles/stats').then(unwrap<VehicleStats>),
  getOne: (id: string) => apiClient.get('/autoparts/customer-vehicles/' + id).then(unwrap<CustomerVehicle>),
  update: (id: string, data: VehicleInput) => apiClient.patch('/autoparts/customer-vehicles/' + id, data).then(unwrap<CustomerVehicle>),
  remove: (id: string) => apiClient.delete('/autoparts/customer-vehicles/' + id).then(unwrap<CustomerVehicle>),
};
