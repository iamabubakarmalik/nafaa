import { apiClient } from '@/api/client';

export type EquipmentCategory = 'CARDIO' | 'STRENGTH' | 'FREE_WEIGHTS' | 'MACHINES'
  | 'FUNCTIONAL' | 'YOGA_MAT' | 'BOXING' | 'CROSSFIT' | 'ACCESSORIES' | 'OTHER';

export type EquipmentStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_ORDER' | 'RESERVED' | 'RETIRED';

export interface Equipment {
  id: string;
  equipmentNumber: string;
  name: string;
  category: EquipmentCategory;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  vendorName?: string;
  warrantyExpiry?: string;
  location?: string;
  roomName?: string;
  status: EquipmentStatus;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceIntervalDays?: number;
  totalMaintenanceCost: number;
  usageCount: number;
  lastUsedAt?: string;
  imageUrls: string[];
  manualUrl?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const equipmentApi = {
  create: (data: Partial<Equipment>) => apiClient.post('/gym/equipment', data).then(unwrap<Equipment>),
  list: (params?: any) => apiClient.get('/gym/equipment', { params }).then(unwrap<Equipment[]>),
  summary: () => apiClient.get('/gym/equipment/summary').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/gym/equipment/' + id).then(unwrap<Equipment>),
  update: (id: string, data: Partial<Equipment>) => apiClient.patch('/gym/equipment/' + id, data).then(unwrap<Equipment>),
  maintenance: (id: string, data: { cost: number; notes?: string; nextDate?: string }) =>
    apiClient.post('/gym/equipment/' + id + '/maintenance', data).then(unwrap<Equipment>),
  remove: (id: string) => apiClient.delete('/gym/equipment/' + id).then(unwrap),
};
