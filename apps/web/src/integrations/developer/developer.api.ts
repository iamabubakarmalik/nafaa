import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export interface ApiKeyRow { id: string; name: string; scope: 'read' | 'write'; shopId: string | null; preview: string; createdAt: string; lastUsedAt: string | null }
export interface WebhookRow {
  id: string; url: string; events: string[]; description: string; active: boolean; source: 'dashboard' | 'api';
  createdAt: string; failCount: number; lastSuccessAt?: string | null; lastFailureAt?: string | null; lastError?: string | null; disabledReason?: string | null;
}
export interface WebhookLog { at: string; endpointId: string; eventId: string; type: string; ok: boolean; status?: number; ms: number; error?: string; attempt: number }
export interface DeveloperOverview {
  keys: ApiKeyRow[]; endpoints: WebhookRow[]; log: WebhookLog[]; pendingRetries: number;
  events: { type: string; label: string }[];
}

export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

export const developerApi = {
  overview: () => apiClient.get('/developer').then((r) => unwrap<DeveloperOverview>(r)),
  createKey: (b: { name: string; scope: 'read' | 'write' }) => apiClient.post('/developer/keys', b).then((r) => unwrap<{ id: string; key: string }>(r)),
  revokeKey: (id: string) => apiClient.delete(`/developer/keys/${id}`).then((r) => unwrap<{ ok: boolean }>(r)),
  createHook: (b: { url: string; events: string[]; description?: string }) => apiClient.post('/developer/webhooks', b).then((r) => unwrap<WebhookRow & { secret: string }>(r)),
  updateHook: (id: string, b: Partial<{ url: string; events: string[]; description: string; active: boolean }>) => apiClient.patch(`/developer/webhooks/${id}`, b).then((r) => unwrap<WebhookRow>(r)),
  removeHook: (id: string) => apiClient.delete(`/developer/webhooks/${id}`).then((r) => unwrap<{ ok: boolean }>(r)),
  testHook: (id: string) => apiClient.post(`/developer/webhooks/${id}/test`).then((r) => unwrap<{ ok: boolean; status?: number; ms: number; error?: string }>(r)),
  rotateSecret: (id: string) => apiClient.post(`/developer/webhooks/${id}/secret`).then((r) => unwrap<{ secret: string }>(r)),
};
