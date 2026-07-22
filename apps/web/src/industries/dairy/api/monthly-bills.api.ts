import { apiClient } from '@core/api/client';

export interface MonthlyBill {
  id: string;
  dairyCustomerId: string;
  billNumber: string;
  month: number;
  year: number;
  cycleStartDate: string;
  cycleEndDate: string;
  totalLiters: number;
  totalDeliveries: number;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  remainingAmount: number;
  openingBalance: number;
  closingBalance: number;
  isPaid: boolean;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  isPrinted: boolean;
  sentToCustomer: boolean;
  sentAt?: string;
  notes?: string;
  customer?: any;
  deliveries?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const monthlyBillsApi = {
  generate: (data: { dairyCustomerId: string; month: number; year: number }) =>
    apiClient.post('/dairy/monthly-bills', data).then(unwrap<MonthlyBill>),
  bulkGenerate: (data: { month: number; year: number }) =>
    apiClient.post('/dairy/monthly-bills/bulk-generate', data).then(unwrap<any>),
  list: (params?: { customerId?: string; month?: number; year?: number; isPaid?: boolean }) =>
    apiClient.get('/dairy/monthly-bills', { params }).then(unwrap<MonthlyBill[]>),
  getOne: (id: string) => apiClient.get('/dairy/monthly-bills/' + id).then(unwrap<MonthlyBill>),
  payment: (id: string, data: { amount: number; paymentMethod?: string; reference?: string }) =>
    apiClient.post('/dairy/monthly-bills/' + id + '/payments', data).then(unwrap<MonthlyBill>),
  markSent: (id: string) => apiClient.post('/dairy/monthly-bills/' + id + '/mark-sent').then(unwrap<MonthlyBill>),
};
