import { apiClient } from '@/api/client';

export type RiderStatus = 'ACTIVE' | 'BUSY' | 'OFFLINE' | 'ON_BREAK' | 'INACTIVE';

export interface Rider {
  id: string;
  name: string;
  phone: string;
  cnic?: string;
  email?: string;
  avatarUrl?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  status: RiderStatus;
  currentLat?: number;
  currentLng?: number;
  lastLocationUpdate?: string;
  isEmployee: boolean;
  commissionType?: string;
  commissionValue: number;
  baseSalary: number;
  totalDeliveries: number;
  totalDistance: number;
  avgRating?: number;
  totalTips: number;
  isActive: boolean;
  notes?: string;
  deliveries?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const ridersApi = {
  create: (data: Partial<Rider>) =>
    apiClient.post('/restaurant/riders', data).then(unwrap<Rider>),

  list: (params?: { status?: string; active?: boolean }) =>
    apiClient.get('/restaurant/riders', { params }).then(unwrap<Rider[]>),

  getOne: (id: string) =>
    apiClient.get('/restaurant/riders/' + id).then(unwrap<Rider>),

  update: (id: string, data: Partial<Rider>) =>
    apiClient.patch('/restaurant/riders/' + id, data).then(unwrap<Rider>),

  updateLocation: (id: string, lat: number, lng: number) =>
    apiClient.post('/restaurant/riders/' + id + '/location', { lat, lng }).then(unwrap<Rider>),

  remove: (id: string) =>
    apiClient.delete('/restaurant/riders/' + id).then(unwrap),
};
