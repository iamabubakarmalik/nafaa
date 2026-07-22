import { apiClient } from '@core/api/client';

export interface ServiceZone {
  id: string;
  name: string;
  city: string;
  areas: string[];
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  travelCharge: number;
  emergencyChargeExtra: number;
  minEmergencyChargeThreshold?: number;
  defaultTravelTimeMin: number;
  activeHours: string;
  isEmergencyServed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const zonesApi = {
  create: (data: Partial<ServiceZone>) => apiClient.post('/services-biz/zones', data).then(unwrap<ServiceZone>),
  list: () => apiClient.get('/services-biz/zones').then(unwrap<ServiceZone[]>),
  getOne: (id: string) => apiClient.get('/services-biz/zones/' + id).then(unwrap<ServiceZone>),
  update: (id: string, data: Partial<ServiceZone>) => apiClient.patch('/services-biz/zones/' + id, data).then(unwrap<ServiceZone>),
  remove: (id: string) => apiClient.delete('/services-biz/zones/' + id).then(unwrap),
};
