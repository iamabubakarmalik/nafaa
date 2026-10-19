import { apiClient } from '@core/api/client';

export type RepairStatus = 'RECEIVED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type RepairView = 'open' | 'ready' | 'late' | 'done' | 'cancelled' | 'all';

export interface Repair {
  id: string;
  repairNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  itemDescription: string;
  weightGrams?: number | null;
  karat?: number | null;
  status: RepairStatus;
  promisedDate?: string | null;
  charge: number;
  advance: number;
  karigarId?: string | null;
  karigarName?: string | null;
  saleId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Charge less advance. */
  due: number;
}

export interface RepairPage {
  view: RepairView; page: number; limit: number; total: number; pages: number;
  counts: Record<RepairView, number>;
  totals: { charge: number; advance: number; grams: number };
  items: Repair[];
}

export interface RepairInput {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  itemDescription: string;
  weightGrams?: number | null;
  karat?: number | null;
  promisedDate?: string | null;
  charge?: number;
  advance?: number;
  paymentMethod?: string;
  karigarId?: string | null;
  notes?: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const repairsApi = {
  page: (params: { view?: RepairView; search?: string; karigarId?: string; page?: number; limit?: number }) =>
    apiClient.get('/jewelry/repairs/page', { params }).then(unwrap<RepairPage>),
  create: (data: RepairInput) => apiClient.post('/jewelry/repairs', data).then(unwrap<Repair>),
  update: (id: string, data: Partial<RepairInput>) => apiClient.patch('/jewelry/repairs/' + id, data).then(unwrap<Repair>),
  status: (id: string, status: RepairStatus, reason?: string) => apiClient.patch('/jewelry/repairs/' + id + '/status', { status, reason }).then(unwrap<Repair>),
  payment: (id: string, amount: number, paymentMethod: string) => apiClient.post('/jewelry/repairs/' + id + '/payment', { amount, paymentMethod }).then(unwrap<Repair>),
  deliver: (id: string, data: { charge: number; paidAmount: number; paymentMethod: string }) =>
    apiClient.post('/jewelry/repairs/' + id + '/deliver', data).then(unwrap<Repair>),
};
