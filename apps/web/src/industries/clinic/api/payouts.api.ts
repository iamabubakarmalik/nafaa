import { apiClient } from '@core/api/client';

export interface DoctorPayout {
  id: string;
  doctorId: string;
  amount: number;
  periodFrom: string;
  periodTo: string;
  expenseId: string | null;
  note: string | null;
  createdAt: string;
  doctor: { id: string; fullName: string; title?: string | null } | null;
  expense: { id: string; expenseNumber: string; paymentMethod: string } | null;
  createdBy: { id: string; fullName: string } | null;
}

export interface PayoutDue {
  doctor: { id: string; fullName: string; title?: string | null; commissionPct: number; commissionType?: string | null };
  from: string; to: string;
  seen: number; fees: number; labFees: number; bills: number;
  commissionType: 'PERCENTAGE' | 'FIXED'; commissionPct: number;
  share: number; paid: number; due: number;
  payouts: Array<{ id: string; amount: number; periodFrom: string; periodTo: string; createdAt: string }>;
}

export type PayoutMethod = 'CASH' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';

const unwrap = <T,>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const payoutsApi = {
  list: (params: { doctorId?: string; page?: number; limit?: number }) =>
    apiClient.get('/clinic/doctor-payouts', { params }).then(unwrap<{ items: DoctorPayout[]; total: number; page: number; limit: number; summary: { paid: number } }>),
  due: (doctorId: string, from: string, to: string) => apiClient.get('/clinic/doctor-payouts/due', { params: { doctorId, from, to } }).then(unwrap<PayoutDue>),
  /** Pays the share as a PAID expense (from the drawer when cash). */
  pay: (data: { doctorId: string; from: string; to: string; amount: number; paymentMethod: PayoutMethod; note?: string }) =>
    apiClient.post('/clinic/doctor-payouts', data).then(unwrap<DoctorPayout & { expenseNumber: string }>),
};
