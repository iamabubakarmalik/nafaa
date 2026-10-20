import { apiClient } from '@core/api/client';

export interface Publisher {
  id: string;
  name: string;
  code?: string;
  country?: string;
  city?: string;
  website?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  logoUrl?: string;
  description?: string;
  defaultDiscountPct: number;
  paymentTerms?: string;
  creditDays: number;
  totalBooks: number;
  totalRevenue: number;
  isActive: boolean;
  _count?: { books: number };
  /** The publisher as a supplier (same name), when opened. */
  supplier?: { id: string; outstandingDue: number; totalPurchased: number } | null;
  books?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const publishersApi = {
  create: (data: Partial<Publisher>) => apiClient.post('/bookstore/publishers', data).then(unwrap<Publisher>),
  list: (params?: { search?: string; active?: boolean; country?: string }) =>
    apiClient.get('/bookstore/publishers', { params }).then(unwrap<Publisher[]>),
  seedPakistani: () => apiClient.post('/bookstore/publishers/seed-pakistani').then(unwrap<{ created: number; total: number }>),
  update: (id: string, data: Partial<Publisher>) => apiClient.patch('/bookstore/publishers/' + id, data).then(unwrap<Publisher>),
  openSupplier: (id: string) => apiClient.post('/bookstore/publishers/' + id + '/supplier').then(unwrap<{ id: string; name: string }>),
  remove: (id: string) => apiClient.delete('/bookstore/publishers/' + id).then(unwrap),
};
