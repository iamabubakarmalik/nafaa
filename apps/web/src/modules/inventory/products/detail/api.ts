/** Per-product sales, stock log and branch stock for the detail page. */

import { apiClient } from '@core/api/client';

export interface ProductInsights {
  window: number;
  series: Array<{ key: string; qty: number; revenue: number; profit: number; bills: number }>;
  totals: { qty: number; revenue: number; profit: number; bills: number; perDay: number; daysLeft: number | null };
  allTime: { qty: number; revenue: number; lines: number; firstSoldAt: string | null; lastSoldAt: string | null };
  recent: Array<{
    id: string; saleId: string; saleNumber: string; soldAt: string; status: string;
    customer: { id: string; name: string } | null; qty: number; returnedQty: number; price: number; total: number;
  }>;
  movements: Array<{
    id: string; type: string; quantity: number; balanceAfter: number; reference: string | null; note: string | null;
    createdAt: string; shop: { name: string } | null;
  }>;
  shops: Array<{ shopId: string; name: string; stock: number; lowStockAlert: number }>;
  customers: Array<{ id?: string; name?: string; phone?: string | null; bills: number; lastAt: string | null }>;
}

export const productInsightsApi = {
  get: (id: string, days: number) =>
    apiClient.get<{ data: ProductInsights }>(`/products/${id}/insights`, { params: { days } }).then((r) => r.data.data),
};
