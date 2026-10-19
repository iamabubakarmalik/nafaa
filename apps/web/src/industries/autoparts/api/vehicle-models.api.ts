import { apiClient } from '@core/api/client';

export type VehicleType = 'CAR' | 'SUV' | 'VAN' | 'PICKUP' | 'TRUCK' | 'BUS'
  | 'MOTORCYCLE' | 'SCOOTER' | 'RICKSHAW' | 'TRACTOR' | 'BICYCLE' | 'ATV' | 'BOAT' | 'OTHER';

export interface VehicleModel {
  id: string;
  makeId: string;
  name: string;
  vehicleType: VehicleType;
  yearFrom?: number | null;
  yearTo?: number | null;
  engineOptions: string[];
  isActive: boolean;
  make?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleModelInput {
  makeId?: string; name?: string; vehicleType?: VehicleType; yearFrom?: number; yearTo?: number; engineOptions?: string[]; isActive?: boolean;
}

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const vehicleModelsApi = {
  create: (data: VehicleModelInput) => apiClient.post('/autoparts/vehicle-models', data).then(unwrap<VehicleModel>),
  list: (params?: { makeId?: string; vehicleType?: string; search?: string; active?: boolean }) =>
    apiClient.get('/autoparts/vehicle-models', { params }).then(unwrap<VehicleModel[]>),
  update: (id: string, data: VehicleModelInput) => apiClient.patch('/autoparts/vehicle-models/' + id, data).then(unwrap<VehicleModel>),
  remove: (id: string) => apiClient.delete('/autoparts/vehicle-models/' + id).then(unwrap<VehicleModel>),
};
