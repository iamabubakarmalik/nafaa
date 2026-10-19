import { apiClient } from '@core/api/client';

export interface VehicleMake {
  id: string;
  name: string;
  country?: string | null;
  logoUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  _count?: { models: number };
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMakeInput { name?: string; country?: string; displayOrder?: number; isActive?: boolean }

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const vehicleMakesApi = {
  create: (data: VehicleMakeInput) => apiClient.post('/autoparts/vehicle-makes', data).then(unwrap<VehicleMake>),
  list: (params?: { search?: string; active?: boolean }) => apiClient.get('/autoparts/vehicle-makes', { params }).then(unwrap<VehicleMake[]>),
  seedPakistani: () => apiClient.post('/autoparts/vehicle-makes/seed-pakistani').then(unwrap<{ created: number; models: number; total: number }>),
  update: (id: string, data: VehicleMakeInput) => apiClient.patch('/autoparts/vehicle-makes/' + id, data).then(unwrap<VehicleMake>),
  remove: (id: string) => apiClient.delete('/autoparts/vehicle-makes/' + id).then(unwrap<VehicleMake>),
};
