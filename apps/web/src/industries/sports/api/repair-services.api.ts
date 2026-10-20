import { apiClient } from '@core/api/client';

export type RepairStatus = 'RECEIVED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED';
export type RepairView = 'active' | 'work' | 'ready' | 'late' | 'advance' | 'done' | 'all';

/** A part taken from stock for the repair (string, grip); sold on the delivery bill. */
export interface RepairPart { productId: string; variantId?: string; name?: string; quantity: number; price: number }

export interface SportsRepairService {
  id: string;
  serviceNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  itemType: string;
  itemBrand?: string | null;
  itemDescription: string;
  issue: string;
  status: RepairStatus;
  receivedAt: string;
  estimatedReadyAt?: string | null;
  completedAt?: string | null;
  deliveredAt?: string | null;
  estimatedCost: number;
  finalCost: number;
  advancePaid: number;
  repairType?: string | null;
  workDone?: string | null;
  partsUsed?: RepairPart[] | null;
  photosBeforeUrls: string[];
  photosAfterUrls: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepairDetail extends SportsRepairService {
  sale: { id: string; saleNumber: string } | null;
  refunded: number;
}

export interface RepairInput {
  customerId?: string; customerName: string; customerPhone: string;
  itemType: string; itemBrand?: string; itemDescription: string; issue: string; repairType?: string;
  estimatedCost?: number; advancePaid?: number; paymentMethod?: string; estimatedReadyAt?: string;
  photosBeforeUrls?: string[]; notes?: string;
}

export interface RepairPage {
  items: SportsRepairService[];
  total: number;
  page: number;
  pages: number;
  counts: Record<RepairView, number>;
  totals: { value: number; advance: number; due: number };
}

export interface RepairQuery { view?: RepairView; search?: string; from?: string; to?: string; page?: number; limit?: number }

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const repairServicesApi = {
  create: (data: RepairInput) => apiClient.post('/sports/repair-services', data).then(unwrap<SportsRepairService>),
  page: (params: RepairQuery) => apiClient.get('/sports/repair-services/page', { params }).then(unwrap<RepairPage>),
  summary: () => apiClient.get('/sports/repair-services/summary').then(unwrap<unknown>),
  getOne: (id: string) => apiClient.get('/sports/repair-services/' + id).then(unwrap<RepairDetail>),
  updateStatus: (id: string, data: {
    status: RepairStatus; workDone?: string; partsUsed?: RepairPart[]; finalCost?: number;
    photosAfterUrls?: string[]; notes?: string; paidNow?: number; paymentMethod?: string;
  }) => apiClient.patch('/sports/repair-services/' + id + '/status', data).then(unwrap<SportsRepairService>),
  recordPayment: (id: string, amount: number, paymentMethod?: string) =>
    apiClient.post('/sports/repair-services/' + id + '/payment', { amount, paymentMethod }).then(unwrap<SportsRepairService>),
  /** Gives back in cash the advance of a cancelled repair. */
  refund: (id: string, managerPin?: string) => apiClient.post('/sports/repair-services/' + id + '/refund', { managerPin }).then(unwrap<SportsRepairService>),
  /** Cancels the repair; nothing is deleted. */
  cancel: (id: string) => apiClient.delete('/sports/repair-services/' + id).then(unwrap<SportsRepairService>),
};
