import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

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

export interface EquipmentSummary {
  byCategory: Array<{ category: EquipmentCategory; _count: { _all: number } }>;
  byStatus: Array<{ status: EquipmentStatus; _count: { _all: number } }>;
  needsMaintenance: number;
}

export type EquipmentInput = Partial<Pick<Equipment, 'name' | 'category' | 'equipmentNumber' | 'brand' | 'model' | 'serialNumber' | 'purchaseDate' | 'purchasePrice'
  | 'vendorName' | 'warrantyExpiry' | 'location' | 'roomName' | 'status' | 'nextMaintenanceDate' | 'maintenanceIntervalDays' | 'notes'>>;

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const equipmentApi = {
  create: (data: EquipmentInput) => apiClient.post('/gym/equipment', data).then(unwrap<Equipment>),
  list: (params?: { category?: string; status?: string; search?: string }) => apiClient.get('/gym/equipment', { params }).then(unwrap<Equipment[]>),
  summary: () => apiClient.get('/gym/equipment/summary').then(unwrap<EquipmentSummary>),
  update: (id: string, data: EquipmentInput) => apiClient.patch('/gym/equipment/' + id, data).then(unwrap<Equipment>),
  maintenance: (id: string, data: { cost: number; notes?: string; nextDate?: string; paid?: boolean; paymentMethod?: PaymentMethod }) =>
    apiClient.post('/gym/equipment/' + id + '/maintenance', data).then(unwrap<Equipment>),
  remove: (id: string) => apiClient.delete('/gym/equipment/' + id).then(unwrap),
};
