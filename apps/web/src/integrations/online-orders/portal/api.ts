/**
 * Customer portal API: the public side (token in the link, no login) and
 * the shop's side (make a link, the returns and exchanges queue).
 */

import { apiClient } from '@core/api/client';
import { publicFetch } from '../public/publicApi';
import type { Journey } from '../api/insights.api';

export type RequestType = 'RETURN' | 'EXCHANGE' | 'CANCEL' | 'ADDRESS' | 'REORDER';
export type RequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'DONE' | 'WITHDRAWN';

export interface PortalBrand { shop: string; phone: string | null; logoUrl: string | null; accent: string }

export interface PortalRequest {
  id: string; type: RequestType; status: RequestStatus; reason: string | null; note: string | null;
  items: Array<{ index: number; qty: number }> | null; decisionNote: string | null; refundNote: string | null;
  pickupCourier: string | null; pickupTracking: string | null; createdAt: string; decidedAt: string | null;
}

export interface PortalOrder {
  id: string; no: string; status: string; label: string;
  customer: { name: string; phone: string | null; address: string | null; city: string | null };
  items: Array<{ index: number; name: string; variant: string | null; quantity: number; price: number; image: string | null; product: boolean }>;
  money: { subtotal: number; deliveryFee: number; discount: number; total: number; paid: boolean; method: string | null };
  steps: Array<{ key: string; label: string; at: string | null }>;
  closed: { label: string; at: string | null } | null;
  courier: { name: string; trackingNumber: string; site: string | null } | null;
  journey: Journey | null;
  requests: PortalRequest[];
  allowed: RequestType[];
}

export type PortalOpen =
  | { kind: 'ORDER'; brand: PortalBrand; order: PortalOrder }
  | { kind: 'CUSTOMER'; brand: PortalBrand; name: string | null; orders: Array<{ id: string; no: string; status: string; label: string; total: number; at: string; items: number }> };

export interface RequestBody {
  orderId?: string; type: RequestType; reason?: string; note?: string; items?: Array<{ index: number; qty: number }>; photos?: string[];
  pickup?: { mode: 'PICKUP' | 'DROP_OFF'; address?: string; city?: string; slot?: string };
  address?: { name?: string; phone?: string; address?: string; city?: string };
}

const P = (token: string) => `/portal/v1/${encodeURIComponent(token)}`;

export const portalPublic = {
  open: (token: string) => publicFetch<PortalOpen>(P(token)),
  order: (token: string, orderId: string) => publicFetch<{ brand: PortalBrand; order: PortalOrder }>(`${P(token)}/orders/${encodeURIComponent(orderId)}`),
  request: (token: string, body: RequestBody) => publicFetch<{ ok: boolean; id: string; order: PortalOrder }>(`${P(token)}/requests`, { method: 'POST', json: body }),
  withdraw: (token: string, id: string) => publicFetch<{ ok: boolean; order: PortalOrder }>(`${P(token)}/requests/${id}/withdraw`, { method: 'POST', json: {} }),
  /** Uploads one photo straight to storage and returns its public URL. */
  async upload(token: string, file: File): Promise<string> {
    const u = await publicFetch<{ uploadUrl: string; publicUrl: string; headers: Record<string, string> }>(`${P(token)}/upload`, {
      method: 'POST', json: { fileName: file.name, contentType: file.type, fileSize: file.size },
    });
    const res = await fetch(u.uploadUrl, { method: 'PUT', headers: u.headers, body: file });
    if (!res.ok) throw new Error('upload');
    return u.publicUrl;
  },
};

export interface QueueItem extends Omit<PortalRequest, 'items'> {
  channelOrderId: string; photos: string[] | null; pickup: { mode: string; address: string | null; city: string | null; slot: string | null } | null;
  address: { name: string | null; phone: string | null; address: string | null; city: string | null } | null;
  refundAmount: number | null; resultOrderId: string | null;
  order: { id: string; no: string; status: string; total: number; customerName: string; customerPhone: string | null; customerCity: string | null; customerAddress: string | null; dispatched: boolean; trackingNumber: string | null; courierCode: string | null } | null;
  lines: Array<{ index: number; qty: number; name: string; variant: string | null; price: number }>;
}
export interface QueueSummary { open: number; requested: number; approved: number; done: number; rejected: number; returns: number; exchanges: number; cancels: number; addresses: number; reorders: number }

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const portalAdmin = {
  link: (orderId: string, kind: 'ORDER' | 'CUSTOMER' = 'ORDER') =>
    apiClient.post<{ data: { url: string; kind: string; phone: string | null; name: string; no: string } }>('/online-orders/portal/link', { orderId, kind }).then(unwrap),
  requests: (q: { status?: string; type?: string; search?: string }) =>
    apiClient.get<{ data: { items: QueueItem[]; summary: QueueSummary } }>('/online-orders/portal/requests', { params: q }).then(unwrap),
  approve: (id: string, body: { note?: string; pickupCourier?: string; pickupTracking?: string }) =>
    apiClient.post<{ data: { ok: boolean; status: string; resultOrderId: string | null } }>(`/online-orders/portal/requests/${id}/approve`, body).then(unwrap),
  reject: (id: string, note: string) => apiClient.post(`/online-orders/portal/requests/${id}/reject`, { note }).then(unwrap),
  done: (id: string, note?: string) => apiClient.post(`/online-orders/portal/requests/${id}/done`, { note }).then(unwrap),
  refund: (id: string, note: string, amount?: number) => apiClient.post(`/online-orders/portal/requests/${id}/refund-note`, { note, amount }).then(unwrap),
};
