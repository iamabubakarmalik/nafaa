/** Per-product sales, stock log, branch stock and purchases for the detail page. */

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

export interface ProductPurchases {
  totals: { qty: number; amount: number; returned: number; bills: number; avgCost: number | null; lastCost: number | null; lastAt: string | null };
  suppliers: Array<{ id: string; name: string; bills: number; lastAt: string | null }>;
  recent: Array<{
    id: string; purchaseId: string; purchaseNumber: string; purchasedAt: string; status: 'PENDING' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
    supplier: { id: string; name: string } | null; shop: string | null; variantId: string | null; unitName: string; conversionRate: number;
    quantity: number; baseQuantity: number; costPrice: number; total: number; receivedQty: number; returnedQty: number;
    batchNo: string | null; expiryDate: string | null;
  }>;
}

export const productInsightsApi = {
  get: (id: string, days: number) =>
    apiClient.get<{ data: ProductInsights }>(`/products/${id}/insights`, { params: { days } }).then((r) => r.data.data),
  purchases: (id: string) =>
    apiClient.get<{ data: ProductPurchases }>(`/products/${id}/purchases`).then((r) => r.data.data),
};
