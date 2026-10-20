import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type LockerStatus = 'FREE' | 'OCCUPIED' | 'MAINTENANCE';
export type LockerView = 'all' | 'free' | 'occupied' | 'due' | 'maintenance';

export interface GymLocker {
  id: string;
  number: string;
  memberId: string | null;
  monthlyRent: number;
  startDate: string | null;
  /** Rent paid until this moment. */
  endDate: string | null;
  status: LockerStatus;
  notes: string | null;
  due: boolean;
  daysLeft: number | null;
  member: { id: string; memberNumber: string; customerId: string; customer: { id: string; name: string; phone?: string | null; balance: number } | null } | null;
}

export interface LockerRentInput { months: number; paidAmount?: number; paymentMethod?: PaymentMethod }

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const lockersApi = {
  list: (params?: { view?: LockerView; search?: string; memberId?: string }) =>
    apiClient.get('/gym/lockers', { params }).then(unwrap<{ items: GymLocker[]; counts: Record<LockerView, number>; totals: { monthlyRent: number } }>),
  create: (body: { number: string; monthlyRent: number; count?: number; notes?: string }) =>
    apiClient.post('/gym/lockers', body).then(unwrap<{ created: number; numbers: string[] }>),
  update: (id: string, body: { monthlyRent?: number; notes?: string; status?: 'FREE' | 'MAINTENANCE' }) => apiClient.patch('/gym/lockers/' + id, body).then(unwrap<GymLocker>),
  assign: (id: string, body: LockerRentInput & { memberId: string; startDate?: string; monthlyRent?: number }) =>
    apiClient.post('/gym/lockers/' + id + '/assign', body).then(unwrap<GymLocker>),
  rent: (id: string, body: LockerRentInput) => apiClient.post('/gym/lockers/' + id + '/rent', body).then(unwrap<GymLocker>),
  billDue: () => apiClient.post('/gym/lockers/bill-due').then(unwrap<{ billed: number; lockers: string[] }>),
  release: (id: string, reason?: string) => apiClient.post('/gym/lockers/' + id + '/release', { reason }).then(unwrap<GymLocker>),
};
