import { apiClient } from '@/api/client';

export type VehicleType = 'CAR' | 'SUV' | 'VAN' | 'PICKUP' | 'TRUCK' | 'BUS'
  | 'MOTORCYCLE' | 'SCOOTER' | 'RICKSHAW' | 'TRACTOR' | 'BICYCLE' | 'ATV' | 'BOAT' | 'OTHER';

export interface VehicleModel {
  id: string;
  makeId: string;
  name: string;
  vehicleType: VehicleType;
  yearFrom?: number;
  yearTo?: number;
  engineOptions: string[];
  imageUrl?: string;
  isActive: boolean;
  make?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const vehicleModelsApi = {
  create: (data: Partial<VehicleModel>) => apiClient.post('/autoparts/vehicle-models', data).then(unwrap<VehicleModel>),
  list: (params?: { makeId?: string; vehicleType?: string; search?: string; active?: boolean }) =>
    apiClient.get('/autoparts/vehicle-models', { params }).then(unwrap<VehicleModel[]>),
  getOne: (id: string) => apiClient.get('/autoparts/vehicle-models/' + id).then(unwrap<VehicleModel>),
  update: (id: string, data: Partial<VehicleModel>) => apiClient.patch('/autoparts/vehicle-models/' + id, data).then(unwrap<VehicleModel>),
  remove: (id: string) => apiClient.delete('/autoparts/vehicle-models/' + id).then(unwrap),
};
