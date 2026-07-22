import { apiClient } from '@core/api/client';

export interface VehicleMake {
  id: string;
  name: string;
  country?: string;
  logoUrl?: string;
  displayOrder: number;
  isActive: boolean;
  _count?: { models: number };
  models?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const vehicleMakesApi = {
  create: (data: Partial<VehicleMake>) => apiClient.post('/autoparts/vehicle-makes', data).then(unwrap<VehicleMake>),
  list: (params?: { search?: string; active?: boolean }) =>
    apiClient.get('/autoparts/vehicle-makes', { params }).then(unwrap<VehicleMake[]>),
  seedPakistani: () => apiClient.post('/autoparts/vehicle-makes/seed-pakistani').then(unwrap<{ created: number; total: number }>),
  getOne: (id: string) => apiClient.get('/autoparts/vehicle-makes/' + id).then(unwrap<VehicleMake>),
  update: (id: string, data: Partial<VehicleMake>) => apiClient.patch('/autoparts/vehicle-makes/' + id, data).then(unwrap<VehicleMake>),
  remove: (id: string) => apiClient.delete('/autoparts/vehicle-makes/' + id).then(unwrap),
};
