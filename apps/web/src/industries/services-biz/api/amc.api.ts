import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { ServiceJob } from './jobs.api';

export type AmcStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED' | 'RENEWAL_DUE';
export type AmcType = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'COMPREHENSIVE' | 'CUSTOM';

export interface AmcVisit {
  id: string; visitNumber: number; scheduledDate: string; completedAt?: string | null; technicianId?: string | null;
  serviceJobId?: string | null; status: string; visitType: string; workDone?: string | null;
}

export interface AmcContract {
  id: string;
  amcNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  type: AmcType;
  status: AmcStatus;
  coveredItems: string[] | null;
  numberOfVisits: number;
  visitsUsed: number;
  visitsRemaining: number;
  includesParts: boolean;
  includesLabour: boolean;
  emergencyIncluded: boolean;
  contractValue: number;
  amountPaid: number;
  paymentMode?: string | null;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  serviceAddress: string;
  city?: string | null;
  termsConditions?: string | null;
  cancellationReason?: string | null;
  notes?: string | null;
  visits: AmcVisit[];
  createdAt: string;
}

export interface AmcDetail extends AmcContract {
  sale: { id: string; saleNumber: string; status: string; total: number; paidAmount: number; creditAmount: number } | null;
  due: number;
  jobs: Array<Pick<ServiceJob, 'id' | 'jobNumber' | 'status' | 'serviceName' | 'scheduledStart' | 'completedAt' | 'totalCharge'>>;
}

export interface AmcInput {
  customerId?: string; customerName?: string; customerPhone?: string; type?: AmcType; coveredItems?: string[]; numberOfVisits: number;
  includesParts?: boolean; includesLabour?: boolean; emergencyIncluded?: boolean; contractValue: number; amountPaid?: number; paymentMode?: PaymentMethod;
  startDate?: string; endDate?: string; autoRenew?: boolean; serviceAddress: string; city?: string; termsConditions?: string; notes?: string;
  autoScheduleVisits?: boolean;
}

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;
const base = '/services-biz/amc';

export const amcApi = {
  create: (data: AmcInput) => apiClient.post(base, data).then(unwrap<AmcDetail>),
  list: (params?: { status?: AmcStatus; search?: string; customerId?: string }) => apiClient.get(base, { params }).then(unwrap<AmcContract[]>),
  renewalDue: (daysAhead?: number) => apiClient.get(`${base}/renewal-due`, { params: { daysAhead } }).then(unwrap<AmcContract[]>),
  getOne: (id: string) => apiClient.get(`${base}/${id}`).then(unwrap<AmcDetail>),
  scheduleVisit: (id: string, data: { scheduledDate: string; technicianId?: string }) => apiClient.post(`${base}/${id}/visits/schedule`, data).then(unwrap<AmcDetail>),
  visitJob: (id: string, visitId: string, data: { primaryTechnicianId?: string } = {}) => apiClient.post(`${base}/${id}/visits/${visitId}/job`, data).then(unwrap<ServiceJob>),
  completeVisit: (id: string, visitId: string, data: { workDone?: string; technicianId?: string }) => apiClient.post(`${base}/${id}/visits/${visitId}/complete`, data).then(unwrap<AmcDetail>),
  pay: (id: string, amount: number, paymentMethod: PaymentMethod) => apiClient.post(`${base}/${id}/payments`, { amount, paymentMethod }).then(unwrap<AmcDetail>),
  renew: (id: string, data: { contractValue?: number; amountPaid?: number; paymentMode?: PaymentMethod }) => apiClient.post(`${base}/${id}/renew`, data).then(unwrap<AmcDetail>),
  cancel: (id: string, reason: string) => apiClient.post(`${base}/${id}/cancel`, { reason }).then(unwrap<AmcDetail>),
};
