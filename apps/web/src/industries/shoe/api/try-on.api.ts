import { apiClient } from '@core/api/client';

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export type RequestStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

/** A customer waiting for a size or colour (size request). */
export interface SizeRequest {
  id: string;
  requestNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  productId?: string | null;
  productName: string;
  requestedSizes: string[];
  colorPreference?: string | null;
  gender?: string | null;
  status: RequestStatus;
  scheduledAt?: string | null;
  completedAt?: string | null;
  purchased: boolean;
  purchasedSize?: string | null;
  notes?: string | null;
  createdAt: string;
  /** Asked sizes now in stock in this branch (open requests only). */
  available: Array<{ size: string | null; color: string | null; stock: number }>;
}

export interface NewSizeRequest {
  customerId?: string; customerName: string; customerPhone: string; productId?: string; productName: string;
  requestedSizes: string[]; colorPreference?: string; gender?: string; notes?: string;
}

export type RequestView = 'open' | 'waiting' | 'told' | 'bought' | 'closed' | 'all';
export interface RequestPage { items: SizeRequest[]; total: number; page: number; pages: number; counts: Record<RequestView, number> }

export const shoeTryOnApi = {
  page: (params: { view?: RequestView; search?: string; page?: number; limit?: number }) => apiClient.get('/shoe/try-on/page', { params }).then(unwrap<RequestPage>),
  create: (data: NewSizeRequest) => apiClient.post('/shoe/try-on', data).then(unwrap<SizeRequest>),
  summary: () => apiClient.get('/shoe/try-on/summary').then(unwrap<{ pending: number; scheduled: number; completed: number; cancelled: number; conversion: number }>),
  notified: (id: string) => apiClient.post(`/shoe/try-on/${id}/notified`).then(unwrap<SizeRequest>),
  complete: (id: string, data: { purchased: boolean; purchasedSize?: string }) => apiClient.post(`/shoe/try-on/${id}/complete`, data).then(unwrap<SizeRequest>),
  cancel: (id: string) => apiClient.post(`/shoe/try-on/${id}/cancel`).then(unwrap<SizeRequest>),
};
