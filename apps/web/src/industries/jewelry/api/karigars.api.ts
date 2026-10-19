import { apiClient } from '@core/api/client';
import type { MetalStockEntry } from './metal-stock.api';

export interface Karigar {
  id: string;
  karigarNumber: string;
  fullName: string;
  fatherName?: string;
  cnic?: string;
  phone: string;
  address?: string;
  photoUrl?: string;
  specializations: string[];
  yearsExperience?: number;
  skillLevel?: string;
  hourlyRate?: number;
  perGramRate?: number;
  fixedRatePerPiece?: number;
  metalIssuedGrams: number;
  metalReturnedGrams: number;
  wastageGrams: number;
  outstandingGrams: number;
  totalOrders: number;
  completedOrders: number;
  /** Labour earned (pieces back from orders, or written by hand). */
  totalEarnings: number;
  /** Labour paid out as expenses. */
  paidLabour: number;
  qualityRating?: number;
  isActive: boolean;
  isInHouse: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KarigarOrder {
  id: string; orderNumber: string; customerName: string; status: string; purity: string; promisedDate?: string | null;
  metalIssuedGrams?: number | null; metalReceivedGrams?: number | null; wastageGrams?: number | null; designDescription: string;
}

export interface KarigarRepair {
  id: string; repairNumber: string; customerName?: string | null; itemDescription: string; status: string; promisedDate?: string | null; charge: number;
}

export interface LabourPayment {
  id: string; expenseNumber: string; title: string; description?: string | null; amount: number; paymentMethod: string; expenseDate: string;
}

export interface KarigarLedger {
  karigar: Karigar;
  metal: MetalStockEntry[];
  orders: KarigarOrder[];
  repairs: KarigarRepair[];
  labour: { earned: number; paid: number; due: number };
  payments: LabourPayment[];
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const karigarsApi = {
  create: (data: Partial<Karigar>) => apiClient.post('/jewelry/karigars', data).then(unwrap<Karigar>),
  list: (params?: any) => apiClient.get('/jewelry/karigars', { params }).then(unwrap<Karigar[]>),
  summary: () => apiClient.get('/jewelry/karigars/summary').then(unwrap<any>),
  update: (id: string, data: Partial<Karigar>) => apiClient.patch('/jewelry/karigars/' + id, data).then(unwrap<Karigar>),
  ledger: (id: string) => apiClient.get('/jewelry/karigars/' + id + '/ledger').then(unwrap<KarigarLedger>),
  /** Labour for work done outside an order (repairs, polish). */
  recordLabour: (id: string, earnings: number) => apiClient.post('/jewelry/karigars/' + id + '/record-order', { earnings }).then(unwrap<Karigar>),
  payLabour: (id: string, data: { amount: number; paymentMethod: string; note?: string }) =>
    apiClient.post('/jewelry/karigars/' + id + '/pay-labour', data).then(unwrap<{ karigar: Karigar; expense: { id: string; expenseNumber: string; amount: number } }>),
  issueMetal: (id: string, data: { grams: number; purity: string; reference?: string; notes?: string }) =>
    apiClient.post('/jewelry/karigars/' + id + '/issue-metal', data).then(unwrap<Karigar>),
  receiveMetal: (id: string, data: { receivedGrams: number; wastageGrams: number; returnedGrams: number; purity: string; reference?: string; notes?: string }) =>
    apiClient.post('/jewelry/karigars/' + id + '/receive-metal', data).then(unwrap<Karigar>),
};
