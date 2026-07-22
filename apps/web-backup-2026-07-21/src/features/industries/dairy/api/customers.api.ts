import { apiClient } from '@/api/client';

export type DeliveryFrequency = 'DAILY' | 'ALTERNATE_DAY' | 'WEEKLY' | 'ON_DEMAND'
  | 'MORNING_ONLY' | 'EVENING_ONLY' | 'MORNING_EVENING';

export type KhataStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'DEFAULTED';

export interface DairyCustomer {
  id: string;
  customerNumber: string;
  customerId?: string;
  routeId?: string;
  name: string;
  phone?: string;
  cnic?: string;
  address?: string;
  city?: string;
  area?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  deliveryFrequency: DeliveryFrequency;
  morningQuantity: number;
  eveningQuantity: number;
  productPreference?: string;
  containerType?: string;
  customRate?: number;
  billingCycle: string;
  currentBalance: number;
  totalPurchases: number;
  totalPayments: number;
  advancePayment: number;
  totalDeliveries: number;
  missedDeliveries: number;
  lastDeliveryDate?: string;
  lastPaymentDate?: string;
  status: KhataStatus;
  startDate: string;
  pausedFrom?: string;
  pausedTo?: string;
  notes?: string;
  photoUrl?: string;
  route?: any;
  recentDeliveries?: any[];
  bills?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const dairyCustomersApi = {
  create: (data: Partial<DairyCustomer>) => apiClient.post('/dairy/customers', data).then(unwrap<DairyCustomer>),
  list: (params?: any) => apiClient.get('/dairy/customers', { params }).then(unwrap<DairyCustomer[]>),
  summary: () => apiClient.get('/dairy/customers/summary').then(unwrap<any>),
  outstanding: () => apiClient.get('/dairy/customers/outstanding').then(unwrap<DairyCustomer[]>),
  getOne: (id: string) => apiClient.get('/dairy/customers/' + id).then(unwrap<DairyCustomer>),
  update: (id: string, data: Partial<DairyCustomer>) => apiClient.patch('/dairy/customers/' + id, data).then(unwrap<DairyCustomer>),
  payment: (id: string, data: { amount: number; paymentMethod?: string; reference?: string; notes?: string }) =>
    apiClient.post('/dairy/customers/' + id + '/payments', data).then(unwrap<DairyCustomer>),
  pause: (id: string, data: { pausedFrom: string; pausedTo: string; reason?: string }) =>
    apiClient.post('/dairy/customers/' + id + '/pause', data).then(unwrap<DairyCustomer>),
  resume: (id: string) => apiClient.post('/dairy/customers/' + id + '/resume').then(unwrap<DairyCustomer>),
  close: (id: string, reason?: string) => apiClient.post('/dairy/customers/' + id + '/close', { reason }).then(unwrap<DairyCustomer>),
};
