import { apiClient } from '@core/api/client';
import type { Power } from '../lib/meta';

export interface OpticalPrescription extends Power {
  id: string;
  prescriptionNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerAge?: number | null;
  customerGender?: string | null;
  prescribedBy?: string | null;
  doctorName?: string | null;
  clinicName?: string | null;
  prescriptionDate: string;
  expiryDate?: string | null;
  prescriptionType?: string | null;
  rightVa?: string | null; leftVa?: string | null;
  segHeight?: number | null;
  clRightBaseCurve?: string | null; clLeftBaseCurve?: string | null; clRightDiameter?: string | null; clLeftDiameter?: string | null;
  notes?: string | null;
  isActive: boolean;
  timesUsed: number;
  computed?: { daysToExpiry: number | null; isExpired: boolean; isExpiringSoon: boolean };
  lensOrders?: Array<{ id: string; orderNumber: string; status: string; totalPrice: number; orderedAt: string; frameName: string; lensType: string }>;
  createdAt: string;
}

export type RxView = 'active' | 'expiring' | 'expired' | 'inactive' | 'all';
export interface RxPage { items: OpticalPrescription[]; total: number; page: number; limit: number; totalPages: number }
export interface RxSummary { total: number; active: number; expiringSoon: number; expired: number; thisMonth: number }
export type RxInput = Partial<Omit<OpticalPrescription, 'id' | 'prescriptionNumber' | 'computed' | 'lensOrders' | 'createdAt' | 'timesUsed'>>;

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const prescriptionsApi = {
  create: (data: RxInput) => apiClient.post('/optical/prescriptions', data).then(unwrap<OpticalPrescription>),
  page: (params: { view?: RxView; page?: number; limit?: number; search?: string; from?: string; to?: string; customerId?: string; type?: string }) =>
    apiClient.get('/optical/prescriptions/page', { params }).then(unwrap<RxPage>),
  summary: () => apiClient.get('/optical/prescriptions/summary').then(unwrap<RxSummary>),
  byCustomer: (customerId: string) => apiClient.get('/optical/prescriptions/by-customer/' + customerId).then(unwrap<OpticalPrescription[]>),
  getOne: (id: string) => apiClient.get('/optical/prescriptions/' + id).then(unwrap<OpticalPrescription>),
  update: (id: string, data: RxInput) => apiClient.patch('/optical/prescriptions/' + id, data).then(unwrap<OpticalPrescription>),
  renew: (id: string, overrides?: RxInput) => apiClient.post('/optical/prescriptions/' + id + '/renew', overrides || {}).then(unwrap<OpticalPrescription>),
  deactivate: (id: string) => apiClient.post('/optical/prescriptions/' + id + '/deactivate').then(unwrap<OpticalPrescription>),
};
