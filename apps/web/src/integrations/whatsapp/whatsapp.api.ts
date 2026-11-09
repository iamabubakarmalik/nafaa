/**
 * WhatsApp Business (Cloud API) for online orders: connection, number,
 * which order events send a message, Meta templates, the cost estimate and
 * the message log. All under /integrations/whatsapp.
 */

import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type WaKey = 'confirm' | 'dispatched' | 'delivered' | 'cart';
export type TemplateStatus = 'NOT_SUBMITTED' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';

export interface WaStatus {
  access: { live: boolean; reason: 'paused' | 'not_configured' | 'soon' | null; beta: boolean };
  facebookConnected: boolean;
  connected: boolean;
  number: { phoneNumberId: string; wabaId: string | null; displayPhone: string | null; name: string | null; quality: string | null } | null;
  settings: { language: 'en' | 'ur'; sendConfirm: boolean; confirmCodOnly: boolean; sendDispatched: boolean; sendDelivered: boolean } | null;
  lastError: string | null;
  templates: Array<{ key: WaKey; name: string; category: 'UTILITY' | 'MARKETING'; status: TemplateStatus; rejectedReason: string | null; body: string | null; syncedAt: string | null }>;
  last30: { sent: Partial<Record<string, number>>; replies: number; confirmedYes: number; confirmedNo: number };
  estimate: { perMonth: Partial<Record<WaKey, number>>; usd: number; pkr: number; perMessagePkr: { UTILITY: number; MARKETING: number } };
}

export interface WaAccount { id: string; name: string; phones: Array<{ id: string; displayPhone: string; name: string; quality: string | null }> }

export interface WaMessage {
  id: string; direction: 'IN' | 'OUT'; toPhone: string; customerName: string | null; body: string; status: string; event: string | null;
  orderId: string | null; orderNo: string | null; payload: string | null; errorMessage: string | null; createdAt: string;
}

export const WA_KEY = 'whatsapp-cloud';

export const whatsappApi = {
  status: () => apiClient.get('/integrations/whatsapp/status').then((r) => unwrap<WaStatus>(r)),
  numbers: () => apiClient.get('/integrations/whatsapp/numbers', { timeout: 60_000 }).then((r) => unwrap<{ accounts: WaAccount[] }>(r)),
  connect: (wabaId: string, phoneNumberId: string) => apiClient.post('/integrations/whatsapp/connect', { wabaId, phoneNumberId }).then((r) => unwrap<WaStatus>(r)),
  disconnect: () => apiClient.post('/integrations/whatsapp/disconnect', {}).then((r) => unwrap<{ ok: boolean }>(r)),
  saveSettings: (b: Partial<NonNullable<WaStatus['settings']>>) => apiClient.put('/integrations/whatsapp/settings', b).then((r) => unwrap<WaStatus>(r)),
  submitTemplates: (keys?: WaKey[]) => apiClient.post('/integrations/whatsapp/templates/submit', { keys }, { timeout: 60_000 }).then((r) => unwrap<{ results: Array<{ key: WaKey; ok: boolean; status?: string; error?: string }>; status: WaStatus }>(r)),
  syncTemplates: () => apiClient.post('/integrations/whatsapp/templates/sync', {}).then((r) => unwrap<WaStatus>(r)),
  test: (phone: string) => apiClient.post('/integrations/whatsapp/test', { phone }).then((r) => unwrap<{ ok: boolean }>(r)),
  sendForOrder: (orderId: string, key: WaKey) => apiClient.post(`/integrations/whatsapp/orders/${orderId}/send`, { key }).then((r) => unwrap<{ sent: boolean }>(r)),
  messages: (direction?: 'IN' | 'OUT') => apiClient.get('/integrations/whatsapp/messages', { params: { direction, limit: 60 } }).then((r) => unwrap<{ items: WaMessage[] }>(r)),
};
