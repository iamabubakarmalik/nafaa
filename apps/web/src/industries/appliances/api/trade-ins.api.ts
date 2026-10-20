/** Old appliances taken in trade at the counter (ATI-… codes). */
import { apiClient } from '@core/api/client';
import type { PosTradeIn } from '@modules/pos/components';

export type TradeInStatus = 'HELD' | 'SOLD' | 'SCRAPPED' | 'RETURNED';
export type TradeInView = TradeInStatus | 'all';
export type TradeInCondition = 'WORKING' | 'NEEDS_REPAIR' | 'SCRAP';

export interface ApplianceTradeIn {
  id: string;
  code: string;
  description: string;
  brand?: string | null;
  model?: string | null;
  condition?: TradeInCondition | null;
  value: number;
  status: TradeInStatus;
  saleId?: string | null;
  customerId?: string | null;
  createdAt: string;
  /** The bill the value was taken off. */
  sale?: { id: string; saleNumber: string; status: string } | null;
  customer?: { id: string; name: string; phone?: string | null } | null;
  /** The bill the unit was sold on with, when sold. */
  resale?: { id: string; saleNumber: string; total: number; createdAt: string } | null;
}

export interface TradeInPage {
  items: ApplianceTradeIn[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<TradeInView, { count: number; value: number }>;
}

export interface TradeInInput { description: string; brand?: string; model?: string; condition?: TradeInCondition; value: number; customerId?: string }

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;
const base = '/appliances/trade-ins';

export const tradeInsApi = {
  page: (params: { view?: TradeInView; search?: string; page?: number; limit?: number }) => apiClient.get(base, { params }).then(unwrap<TradeInPage>),
  counter: () => apiClient.get(`${base}/counter`).then(unwrap<PosTradeIn[]>),
  create: (data: TradeInInput) => apiClient.post(base, data).then(unwrap<ApplianceTradeIn>),
  update: (id: string, data: Partial<Omit<TradeInInput, 'customerId'>>) => apiClient.patch(`${base}/${id}`, data).then(unwrap<ApplianceTradeIn>),
  setStatus: (id: string, status: Exclude<TradeInStatus, 'SOLD'>) => apiClient.patch(`${base}/${id}/status`, { status }).then(unwrap<ApplianceTradeIn>),
  sell: (id: string, data: { price: number; paymentMethod?: string; buyer?: string }) =>
    apiClient.post(`${base}/${id}/sell`, data).then(unwrap<{ saleId: string | null; saleNumber: string | null }>),
};
