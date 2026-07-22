import { apiClient } from '@/api/client';

export interface MeasurementProfile {
  id: string;
  customerId: string;
  profileName: string;
  gender?: string;
  unit: 'INCH' | 'CM';
  neck?: number;
  shoulder?: number;
  chest?: number;
  bust?: number;
  waist?: number;
  hip?: number;
  armhole?: number;
  bicep?: number;
  wrist?: number;
  sleeveLength?: number;
  shirtLength?: number;
  trouserLength?: number;
  inseam?: number;
  thigh?: number;
  knee?: number;
  bottom?: number;
  kurtaLength?: number;
  shalwarLength?: number;
  shalwarBottom?: number;
  daman?: number;
  postureNotes?: string;
  fittingNotes?: string;
  imageUrls: string[];
  measuredById?: string;
  measuredAt: string;
  isDefault: boolean;
  isActive: boolean;
  customer?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const measurementsApi = {
  create: (data: Partial<MeasurementProfile>) =>
    apiClient.post('/garments/measurements', data).then(unwrap<MeasurementProfile>),
  list: (params?: { gender?: string; search?: string }) =>
    apiClient.get('/garments/measurements', { params }).then(unwrap<MeasurementProfile[]>),
  byCustomer: (customerId: string) =>
    apiClient.get('/garments/measurements/by-customer/' + customerId).then(unwrap<MeasurementProfile[]>),
  getOne: (id: string) =>
    apiClient.get('/garments/measurements/' + id).then(unwrap<MeasurementProfile>),
  update: (id: string, data: Partial<MeasurementProfile>) =>
    apiClient.patch('/garments/measurements/' + id, data).then(unwrap<MeasurementProfile>),
  remove: (id: string) =>
    apiClient.delete('/garments/measurements/' + id).then(unwrap),
};
