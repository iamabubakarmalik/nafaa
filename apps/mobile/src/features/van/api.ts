/**
 * Van salesman calls (online only): the salesman's van with its stock and
 * open day, spot sales from the van and market returns. Shapes follow the
 * API's distribution phase 2 contract (API.md §14).
 */

import { http } from '@/features/booker/native/device';

export interface VanStockLine {
  productId: string; variantId: string | null; name: string | null; variantName: string | null; baseUnit: string; qty: number; free: number; text: string;
  price: number; units: { id: string; unitName: string; conversionRate: number }[];
}
export interface MyVan {
  id: string; name: string; vehicleNo: string | null; salesmanName: string | null; routeId: string | null; routeName: string | null;
  stock: VanStockLine[]; stockValue: number;
  session: { id: string; dayKey: string; money: { invoices: number; salesValue: number; expectedCash: number; pending: number } } | null;
}
export interface CustomerHit { id: string; name: string; businessName?: string | null; phone?: string | null; balance?: number }

export const vanApi = {
  mine: () => http.get<{ vans: Array<{ id: string; name: string }> }>('/distribution/vans/mine'),
  van: (id: string) => http.get<MyVan>(`/distribution/vans/${id}`),
  sell: (id: string, body: unknown) => http.post<{ order: { orderNumber: string; total: number }; invoice: { saleNumber: string } | null; duplicate: boolean; warnings: string[] }>(`/distribution/vans/${id}/sell`, body),
  marketReturn: (body: unknown) => http.post<{ marketReturn: { number: string; totalValue: number }; duplicate: boolean }>('/distribution/returns', body),
  customers: async (search: string): Promise<CustomerHit[]> => {
    const r = await http.get<any>('/customers', { search, limit: 15 });
    const list = Array.isArray(r) ? r : r?.customers ?? r?.data ?? r?.items ?? [];
    return list as CustomerHit[];
  },
};
