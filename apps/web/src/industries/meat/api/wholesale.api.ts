import { apiClient } from '@core/api/client';

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
  specialPricing?: unknown;
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
const base = '/meat/wholesale/';

export const wholesaleApi = {
  create: (data: Partial<WholesaleAccount>) => apiClient.post('/meat/wholesale', data).then(unwrap<WholesaleAccount>),
  list: (params?: Record<string, string | undefined>) => apiClient.get('/meat/wholesale', { params }).then(unwrap<WholesaleAccount[]>),
  byCustomer: (customerId: string) => apiClient.get(base + 'by-customer/' + customerId).then(unwrap<WholesaleAccount | null>),
  update: (id: string, data: Partial<WholesaleAccount>) => apiClient.patch(base + id, data).then(unwrap<WholesaleAccount>),
  /** A khata payment from the buyer (drawer for cash). */
  payment: (id: string, amount: number, paymentMethod: string, note?: string) =>
    apiClient.post(base + id + '/payment', { amount, paymentMethod, note }).then(unwrap<WholesaleAccount>),
  remove: (id: string) => apiClient.delete(base + id).then(unwrap),
};
