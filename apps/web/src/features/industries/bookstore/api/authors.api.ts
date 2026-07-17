import { apiClient } from '@/api/client';

export interface Author {
  id: string;
  name: string;
  penName?: string;
  nationality?: string;
  bornYear?: number;
  diedYear?: number;
  bio?: string;
  photoUrl?: string;
  genres: string[];
  languages: string[];
  totalBooks: number;
  totalSales: number;
  isFeatured: boolean;
  isActive: boolean;
  _count?: { bookAuthors: number };
  bookAuthors?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const authorsApi = {
  create: (data: Partial<Author>) => apiClient.post('/bookstore/authors', data).then(unwrap<Author>),
  list: (params?: any) => apiClient.get('/bookstore/authors', { params }).then(unwrap<Author[]>),
  getOne: (id: string) => apiClient.get('/bookstore/authors/' + id).then(unwrap<Author>),
  update: (id: string, data: Partial<Author>) => apiClient.patch('/bookstore/authors/' + id, data).then(unwrap<Author>),
  toggleFeatured: (id: string) => apiClient.post('/bookstore/authors/' + id + '/toggle-featured').then(unwrap<Author>),
  remove: (id: string) => apiClient.delete('/bookstore/authors/' + id).then(unwrap),
};
