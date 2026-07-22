import { apiClient } from '@/api/client';

export interface BookRental {
  id: string;
  rentalNumber: string;
  customerId?: string;
  productId: string;
  variantId?: string;
  customerName?: string;
  customerPhone?: string;
  customerCnic?: string;
  quantity: number;
  rentalPrice: number;
  depositAmount: number;
  issuedAt: string;
  dueDate: string;
  returnedAt?: string;
  actualReturnDate?: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST' | 'DAMAGED' | 'CANCELLED';
  fineAmount: number;
  finePerDay: number;
  conditionOnIssue?: string;
  conditionOnReturn?: string;
  damageNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const rentalsApi = {
  create: (data: any) => apiClient.post('/bookstore/rentals', data).then(unwrap<BookRental>),
  list: (params?: any) => apiClient.get('/bookstore/rentals', { params }).then(unwrap<BookRental[]>),
  return: (id: string, data: any) => apiClient.post('/bookstore/rentals/' + id + '/return', data).then(unwrap<BookRental>),
  markLost: (id: string) => apiClient.post('/bookstore/rentals/' + id + '/lost').then(unwrap<BookRental>),
  cancel: (id: string) => apiClient.post('/bookstore/rentals/' + id + '/cancel').then(unwrap<BookRental>),
  updateOverdue: () => apiClient.post('/bookstore/rentals/update-overdue').then(unwrap),
};
