import { apiClient } from '@/api/client';

export interface SchoolListItem {
  id: string;
  productId?: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
  subject?: string;
  isRequired: boolean;
  isOptional: boolean;
  notes?: string;
  displayOrder: number;
}

export interface SchoolBookList {
  id: string;
  schoolId: string;
  session: string;
  grade: string;
  section?: string;
  medium?: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  discountPct: number;
  bundlePrice?: number;
  totalItems: number;
  imageUrl?: string;
  totalOrders: number;
  totalRevenue: number;
  items: SchoolListItem[];
  school?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const schoolListsApi = {
  create: (data: any) => apiClient.post('/bookstore/school-lists', data).then(unwrap<SchoolBookList>),
  list: (params?: any) => apiClient.get('/bookstore/school-lists', { params }).then(unwrap<SchoolBookList[]>),
  getOne: (id: string) => apiClient.get('/bookstore/school-lists/' + id).then(unwrap<SchoolBookList>),
  update: (id: string, data: any) => apiClient.patch('/bookstore/school-lists/' + id, data).then(unwrap<SchoolBookList>),
  updateStatus: (id: string, status: string) => apiClient.post('/bookstore/school-lists/' + id + '/status', { status }).then(unwrap<SchoolBookList>),
  duplicate: (id: string, newSession: string) => apiClient.post('/bookstore/school-lists/' + id + '/duplicate', { newSession }).then(unwrap<SchoolBookList>),
  remove: (id: string) => apiClient.delete('/bookstore/school-lists/' + id).then(unwrap),
};
