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
  totalEarnings: number;
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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const karigarsApi = {
  create: (data: Partial<Karigar>) => apiClient.post('/jewelry/karigars', data).then(unwrap<Karigar>),
  list: (params?: any) => apiClient.get('/jewelry/karigars', { params }).then(unwrap<Karigar[]>),
  summary: () => apiClient.get('/jewelry/karigars/summary').then(unwrap<any>),
  update: (id: string, data: Partial<Karigar>) => apiClient.patch('/jewelry/karigars/' + id, data).then(unwrap<Karigar>),
  ledger: (id: string) => apiClient.get('/jewelry/karigars/' + id + '/ledger').then(unwrap<{ karigar: Karigar; metal: MetalStockEntry[]; orders: KarigarOrder[] }>),
  issueMetal: (id: string, data: { grams: number; purity: string; reference?: string; notes?: string }) =>
    apiClient.post('/jewelry/karigars/' + id + '/issue-metal', data).then(unwrap<Karigar>),
  receiveMetal: (id: string, data: { receivedGrams: number; wastageGrams: number; returnedGrams: number; purity: string; reference?: string; notes?: string }) =>
    apiClient.post('/jewelry/karigars/' + id + '/receive-metal', data).then(unwrap<Karigar>),
};
