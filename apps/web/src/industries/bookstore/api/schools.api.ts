import { apiClient } from '@core/api/client';

export interface School {
  id: string;
  name: string;
  code?: string;
  type?: string;
  board?: string;
  medium?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  principalName?: string;
  contactPerson?: string;
  contactPhone?: string;
  discountPct: number;
  creditDays: number;
  creditLimit: number;
  logoUrl?: string;
  notes?: string;
  totalOrders: number;
  totalRevenue: number;
  outstandingAmount: number;
  isActive: boolean;
  _count?: { bookLists: number };
  /** The school's khata (a customer of the same name), when opened. */
  customer?: { id: string; balance: number; creditLimit: number } | null;
  bookLists?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const schoolsApi = {
  create: (data: Partial<School>) => apiClient.post('/bookstore/schools', data).then(unwrap<School>),
  list: (params?: any) => apiClient.get('/bookstore/schools', { params }).then(unwrap<School[]>),
  getOne: (id: string) => apiClient.get('/bookstore/schools/' + id).then(unwrap<School>),
  update: (id: string, data: Partial<School>) => apiClient.patch('/bookstore/schools/' + id, data).then(unwrap<School>),
  openKhata: (id: string) => apiClient.post('/bookstore/schools/' + id + '/khata').then(unwrap<{ id: string; name: string; balance: number }>),
  remove: (id: string) => apiClient.delete('/bookstore/schools/' + id).then(unwrap),
};
