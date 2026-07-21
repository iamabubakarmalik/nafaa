import { apiClient } from '@/api/client';

export interface AmcContract {
  id: string;
  amcNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  type: 'BASIC' | 'STANDARD' | 'PREMIUM' | 'COMPREHENSIVE' | 'CUSTOM';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED' | 'RENEWAL_DUE';
  coveredItems: any;
  coveredServiceTypes: string[];
  numberOfVisits: number;
  visitsUsed: number;
  visitsRemaining: number;
  includesParts: boolean;
  includesLabour: boolean;
  partsCapAmount?: number;
  emergencyIncluded: boolean;
  emergencyDiscountPct: number;
  contractValue: number;
  amountPaid: number;
  paymentMode?: string;
  paymentInstallments: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  reminderDaysBefore: number;
  serviceAddress: string;
  city?: string;
  numberOfSites: number;
  contractDocUrl?: string;
  termsConditions?: string;
  specialConditions?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmount?: number;
  notes?: string;
  visits: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const amcApi = {
  create: (data: any) => apiClient.post('/services-biz/amc', data).then(unwrap<AmcContract>),
  list: (params?: any) => apiClient.get('/services-biz/amc', { params }).then(unwrap<AmcContract[]>),
  renewalDue: (daysAhead?: number) => apiClient.get('/services-biz/amc/renewal-due', { params: { daysAhead } }).then(unwrap<AmcContract[]>),
  expireOld: () => apiClient.post('/services-biz/amc/expire-old').then(unwrap),
  getOne: (id: string) => apiClient.get('/services-biz/amc/' + id).then(unwrap<AmcContract>),
  scheduleVisit: (id: string, data: any) => apiClient.post('/services-biz/amc/' + id + '/visits/schedule', data).then(unwrap),
  completeVisit: (id: string, visitId: string, data: any) =>
    apiClient.post('/services-biz/amc/' + id + '/visits/' + visitId + '/complete', data).then(unwrap<AmcContract>),
  cancel: (id: string, reason?: string, refundAmount?: number) =>
    apiClient.post('/services-biz/amc/' + id + '/cancel', { reason, refundAmount }).then(unwrap<AmcContract>),
};
