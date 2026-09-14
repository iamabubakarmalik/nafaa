import { apiClient } from '@core/api/client';

export type ApplianceAmcType = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'COMPREHENSIVE';
export type ApplianceAmcStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'RENEWED' | 'SUSPENDED';

export interface AmcContract {
  id: string;
  contractNumber: string;
  amcType: ApplianceAmcType;
  status: ApplianceAmcStatus;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  productId?: string;
  productName?: string;
  serialNumber?: string;
  serialTrackingId?: string;
  startDate: string;
  expiryDate: string;
  durationMonths: number;
  contractValue: number;
  paidAmount: number;
  freeVisitsAllowed: number;
  freeVisitsUsed: number;
  freePartsAllowed: boolean;
  laborCovered: boolean;
  gasRefillCovered: boolean;
  emergencyCallsAllowed?: number;
  servicesIncluded: string[];
  servicesExcluded: string[];
  exclusions?: string;
  totalVisitsUsed: number;
  totalPartsClaimed: number;
  totalLaborSaved: number;
  autoRenew: boolean;
  renewalReminderSent: boolean;
  documentUrls: string[];
  notes?: string;
  relatedRequests?: any[];
  computed?: {
    daysRemaining: number;
    visitsRemaining: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export interface AmcSummary {
  active: number; expiringSoon: number; expired: number; cancelled: number;
  totalContractValue: number; totalCollected: number;
  renewed: number; suspended: number;
  /** Contract ka baqi paisa */
  pendingAmount: number;
  /** Tareekh guzar chuki lekin status abhi ACTIVE hai */
  staleActive: number;
  visitsExhausted: number;
  autoRenewCount: number;
  /** Customer ne AMC se kitna bachaya — bechne ki sab se achhi daleel */
  customerSaved: number;
  month: { newContracts: number; billed: number; collected: number };
  byType: { type: string; count: number; value: number; collected: number }[];
  expiringList: Array<{
    id: string; contractNumber: string; amcType: string;
    customerName: string; customerPhone: string; expiryDate: string;
    contractValue: number; paidAmount: number;
    freeVisitsAllowed: number; freeVisitsUsed: number;
    daysLeft: number; visitsLeft: number; pending: number; autoRenew: boolean;
  }>;
}

export const amcContractsApi = {
  create: (data: Partial<AmcContract>) =>
    apiClient.post('/appliances/amc-contracts', data).then(unwrap<AmcContract>),
  list: (params?: {
    status?: string; amcType?: string; customerId?: string;
    expiringSoon?: boolean; expired?: boolean; search?: string;
  }) => apiClient.get('/appliances/amc-contracts', { params }).then(unwrap<AmcContract[]>),
  summary: () =>
    apiClient.get('/appliances/amc-contracts/summary').then(unwrap<AmcSummary>),
  expiringSoon: (days = 30) =>
    apiClient.get('/appliances/amc-contracts/expiring-soon', { params: { days } }).then(unwrap<AmcContract[]>),
  getOne: (id: string) =>
    apiClient.get('/appliances/amc-contracts/' + id).then(unwrap<AmcContract>),
  update: (id: string, data: Partial<AmcContract>) =>
    apiClient.patch('/appliances/amc-contracts/' + id, data).then(unwrap<AmcContract>),
  updateStatus: (id: string, data: { status: ApplianceAmcStatus; reason?: string }) =>
    apiClient.patch('/appliances/amc-contracts/' + id + '/status', data).then(unwrap<AmcContract>),
  renew: (id: string, data: { durationMonths: number; contractValue: number; paidAmount?: number; freeVisitsAllowed?: number }) =>
    apiClient.post('/appliances/amc-contracts/' + id + '/renew', data).then(unwrap<AmcContract>),
  sendReminder: (id: string) =>
    apiClient.post('/appliances/amc-contracts/' + id + '/send-reminder').then(unwrap<AmcContract>),
};
