import { apiClient } from '@core/api/client';

export interface SportsRepairService {
  id: string;
  serviceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  itemType: string;
  itemBrand?: string;
  itemDescription: string;
  issue: string;
  status: string;
  receivedAt: string;
  estimatedReadyAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  estimatedCost: number;
  finalCost: number;
  advancePaid: number;
  repairType?: string;
  workDone?: string;
  partsUsed?: any;
  photosBeforeUrls: string[];
  photosAfterUrls: string[];
  receiptSignatureUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const repairServicesApi = {
  create: (data: Partial<SportsRepairService>) =>
    apiClient.post('/sports/repair-services', data).then(unwrap<SportsRepairService>),

  list: (params?: { status?: string; itemType?: string; repairType?: string; customerId?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/sports/repair-services', { params }).then(unwrap<SportsRepairService[]>),

  summary: () => apiClient.get('/sports/repair-services/summary').then(unwrap<any>),

  overdue: () => apiClient.get('/sports/repair-services/overdue').then(unwrap<SportsRepairService[]>),

  getOne: (id: string) =>
    apiClient.get('/sports/repair-services/' + id).then(unwrap<SportsRepairService>),

  updateStatus: (id: string, data: { status: string; workDone?: string; partsUsed?: any; finalCost?: number; photosAfterUrls?: string[]; notes?: string }) =>
    apiClient.patch('/sports/repair-services/' + id + '/status', data).then(unwrap<SportsRepairService>),

  recordPayment: (id: string, amount: number) =>
    apiClient.post('/sports/repair-services/' + id + '/payment', { amount }).then(unwrap<SportsRepairService>),

  remove: (id: string) =>
    apiClient.delete('/sports/repair-services/' + id).then(unwrap),
};
