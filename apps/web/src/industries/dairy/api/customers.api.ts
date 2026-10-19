import { apiClient } from '@core/api/client';

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
  /** Balance comes from the shared khata once linked. */
  khataLinked?: boolean;
  route?: { id: string; name: string; routeNumber: string; slot: string } | null;
  recentDeliveries?: import('./deliveries.api').DairyDelivery[];
  bills?: import('./monthly-bills.api').MonthlyBill[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export type CustomerTab = 'all' | 'active' | 'paused' | 'owing' | 'closed';
export interface CustomerPage {
  items: DairyCustomer[];
  total: number;
  page: number;
  limit: number;
  counts: Record<CustomerTab, number>;
  totals: { dailyLiters: number; owed: number; advance: number; unlinked: number };
}
export interface CustomerQuery { tab?: CustomerTab; search?: string; routeId?: string; page?: number; limit?: number }

/** Body for create and edit; money moves only through payments and deliveries. */
export interface CustomerInput {
  name: string; phone?: string; cnic?: string; address?: string; area?: string; landmark?: string; city?: string;
  routeId?: string; deliveryFrequency?: DeliveryFrequency; morningQuantity?: number; eveningQuantity?: number;
  productPreference?: string; containerType?: string; customRate?: number | null; billingCycle?: string;
  startDate?: string; notes?: string; customerId?: string; advancePayment?: number; advanceMethod?: string;
}

export const dairyCustomersApi = {
  page: (params: CustomerQuery) => apiClient.get('/dairy/customers', { params: { ...params, page: params.page ?? 1 } }).then(unwrap<CustomerPage>),
  save: (id: string | undefined, data: Partial<CustomerInput>) => (id
    ? apiClient.patch('/dairy/customers/' + id, data) : apiClient.post('/dairy/customers', data)).then(unwrap<DairyCustomer>),
  reopen: (id: string) => apiClient.post('/dairy/customers/' + id + '/reopen').then(unwrap<DairyCustomer>),
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
