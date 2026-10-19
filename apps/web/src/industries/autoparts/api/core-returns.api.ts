import { apiClient } from '@core/api/client';
import type { PosTradeIn } from '@modules/pos/components';

export type CoreStatus = 'HELD' | 'SENT_TO_SUPPLIER' | 'SCRAPPED';
export type CoreView = CoreStatus | 'all';

/** An old part a customer gave back; its value was or will be taken off a bill as a trade-in. */
export interface CoreReturn {
  id: string;
  code: string;
  description: string;
  value: number;
  status: CoreStatus;
  createdAt: string;
  sale?: { id: string; saleNumber: string; status: string; customer?: { name: string } | null } | null;
  job?: { id: string; jobNumber: string; registrationNumber?: string | null; customerName?: string | null } | null;
  product?: { id: string; name: string } | null;
}

export interface CorePage {
  items: CoreReturn[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<CoreView, { count: number; value: number }>;
}

export interface CoreInput { description: string; value: number; productId?: string; jobId?: string }

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;
const base = '/autoparts/core-returns';

export const coreReturnsApi = {
  page: (params: { view?: CoreView; search?: string; page?: number; limit?: number }) => apiClient.get(base, { params }).then(unwrap<CorePage>),
  tradeIns: () => apiClient.get(`${base}/trade-ins`).then(unwrap<PosTradeIn[]>),
  create: (data: CoreInput) => apiClient.post(base, data).then(unwrap<CoreReturn>),
  setStatus: (id: string, status: CoreStatus) => apiClient.patch(`${base}/${id}/status`, { status }).then(unwrap<CoreReturn>),
};
