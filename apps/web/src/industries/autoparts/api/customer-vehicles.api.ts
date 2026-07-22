import { apiClient } from '@core/api/client';

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
  customer?: any;
  serviceHistory?: any[];
  reminders?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const customerVehiclesApi = {
  create: (data: Partial<CustomerVehicle>) => apiClient.post('/autoparts/customer-vehicles', data).then(unwrap<CustomerVehicle>),
  list: (params?: any) => apiClient.get('/autoparts/customer-vehicles', { params }).then(unwrap<CustomerVehicle[]>),
  expiringDocuments: (days = 30) => apiClient.get('/autoparts/customer-vehicles/expiring-documents', { params: { days } }).then(unwrap<any>),
  byCustomer: (customerId: string) => apiClient.get('/autoparts/customer-vehicles/by-customer/' + customerId).then(unwrap<CustomerVehicle[]>),
  getOne: (id: string) => apiClient.get('/autoparts/customer-vehicles/' + id).then(unwrap<CustomerVehicle>),
  update: (id: string, data: Partial<CustomerVehicle>) => apiClient.patch('/autoparts/customer-vehicles/' + id, data).then(unwrap<CustomerVehicle>),
  remove: (id: string) => apiClient.delete('/autoparts/customer-vehicles/' + id).then(unwrap),
};
