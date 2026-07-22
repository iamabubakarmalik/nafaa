import { apiClient } from './client';

export interface SearchResults {
  products: Array<{
    id: string;
    name: string;
    sku?: string | null;
    price: number;
    stock: number;
    unit: string;
  }>;
  customers: Array<{
    id: string;
    name: string;
    phone?: string | null;
    balance: number;
  }>;
  sales: Array<{
    id: string;
    saleNumber: string;
    total: number;
    soldAt: string;
    customer?: { name: string } | null;
  }>;
  suppliers: Array<{
    id: string;
    name: string;
    phone?: string | null;
  }>;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const searchApi = {
  global: (q: string) =>
    apiClient.get<{ data: SearchResults }>('/search', { params: { q } }).then(unwrap),
};
