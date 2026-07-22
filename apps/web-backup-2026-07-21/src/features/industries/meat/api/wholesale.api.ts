import { apiClient } from '@/api/client';

export interface WholesaleAccount {
  id: string;
  customerId: string;
  accountNumber: string;
  businessName: string;
  businessType: string;
  contractStart?: string;
  contractEnd?: string;
  creditLimit: number;
  currentBalance: number;
  creditDays: number;
  discountPct: number;
  specialPricing?: any;
  requiresDelivery: boolean;
  deliveryDays: number[];
  deliveryTimeSlot?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  billingAddress?: string;
  deliveryAddress?: string;
  gstNumber?: string;
  ntnNumber?: string;
  totalOrders: number;
  totalPurchases: number;
  totalOutstanding: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const wholesaleApi = {
  create: (data: Partial<WholesaleAccount>) => apiClient.post('/meat/wholesale', data).then(unwrap<WholesaleAccount>),
  list: (params?: any) => apiClient.get('/meat/wholesale', { params }).then(unwrap<WholesaleAccount[]>),
  byCustomer: (customerId: string) => apiClient.get('/meat/wholesale/by-customer/' + customerId).then(unwrap<WholesaleAccount | null>),
  getOne: (id: string) => apiClient.get('/meat/wholesale/' + id).then(unwrap<WholesaleAccount>),
  update: (id: string, data: Partial<WholesaleAccount>) => apiClient.patch('/meat/wholesale/' + id, data).then(unwrap<WholesaleAccount>),
  purchase: (id: string, amount: number) => apiClient.post('/meat/wholesale/' + id + '/purchase', { amount }).then(unwrap<WholesaleAccount>),
  payment: (id: string, amount: number) => apiClient.post('/meat/wholesale/' + id + '/payment', { amount }).then(unwrap<WholesaleAccount>),
  remove: (id: string) => apiClient.delete('/meat/wholesale/' + id).then(unwrap),
};
