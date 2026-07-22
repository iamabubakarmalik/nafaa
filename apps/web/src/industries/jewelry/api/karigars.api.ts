import { apiClient } from '@core/api/client';

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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const karigarsApi = {
  create: (data: Partial<Karigar>) => apiClient.post('/jewelry/karigars', data).then(unwrap<Karigar>),
  list: (params?: any) => apiClient.get('/jewelry/karigars', { params }).then(unwrap<Karigar[]>),
  summary: () => apiClient.get('/jewelry/karigars/summary').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/jewelry/karigars/' + id).then(unwrap<Karigar>),
  update: (id: string, data: Partial<Karigar>) => apiClient.patch('/jewelry/karigars/' + id, data).then(unwrap<Karigar>),
  issueMetal: (id: string, grams: number) => apiClient.post('/jewelry/karigars/' + id + '/issue-metal', { grams }).then(unwrap<Karigar>),
  receiveMetal: (id: string, receivedGrams: number, wastageGrams: number) => apiClient.post('/jewelry/karigars/' + id + '/receive-metal', { receivedGrams, wastageGrams }).then(unwrap<Karigar>),
  recordOrder: (id: string, earnings: number) => apiClient.post('/jewelry/karigars/' + id + '/record-order', { earnings }).then(unwrap<Karigar>),
  remove: (id: string) => apiClient.delete('/jewelry/karigars/' + id).then(unwrap),
};
