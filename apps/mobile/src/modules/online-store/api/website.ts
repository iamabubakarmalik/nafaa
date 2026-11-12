/**
 * Nafaa Stores (the shop's own website) on mobile: status, 30-day numbers
 * and a few quick switches. Same endpoints as the web
 * (apps/web/src/integrations/stores/api/stores.api.ts); the theme editor
 * and the other editors stay on the web.
 */

import { apiClient } from '@/core/api/client';

const unwrap = <T,>(r: { data: unknown }): T => {
  const d = r.data as { data?: unknown } | null;
  return (d && typeof d === 'object' && 'data' in d && d.data !== undefined ? d.data : d) as T;
};

export type StoreStatus = 'DRAFT' | 'PASSWORD' | 'LIVE' | 'CLOSED';

export interface StoreSummary {
  id: string; name: string; slug: string; status: StoreStatus; themeId: string; url: string; primaryHost: string; integrationId: string; launchedAt: string | null;
}
export interface StoreList { entitled: boolean; rootDomain: string; storefrontUrl: string; items: StoreSummary[] }
export interface StoreHome {
  store: StoreSummary;
  checklist: Array<{ key: string; done: boolean; link: string }>;
  stats: { visitors: number; orders: number; revenue: number; conversion: number };
  recentOrders: Array<{ id: string; orderNumber: string; customerName: string | null; total: number; status: string; receivedAt: string }>;
}
export interface StoreFull extends StoreSummary {
  hasPassword: boolean;
  settings: { showOutOfStock: boolean; whatsappButton: { enabled: boolean; number: string | null; message: string | null; position: 'left' | 'right' } };
  checkout: { codConfirmWhatsApp: boolean; payments: { cod: boolean; SAFEPAY: boolean; JAZZCASH: boolean; EASYPAISA: boolean } };
}

export const websiteApi = {
  list: () => apiClient.get('/stores').then((r) => unwrap<StoreList>(r)),
  home: (id: string) => apiClient.get(`/stores/${id}/home`).then((r) => unwrap<StoreHome>(r)),
  get: (id: string) => apiClient.get(`/stores/${id}`).then((r) => unwrap<StoreFull>(r)),
  setStatus: (id: string, status: 'LIVE' | 'PASSWORD' | 'DRAFT') => apiClient.post(`/stores/${id}/status`, { status }).then((r) => unwrap<StoreFull>(r)),
  updateSettings: (id: string, settings: Record<string, unknown>) => apiClient.patch(`/stores/${id}`, { settings }).then((r) => unwrap<StoreFull>(r)),
  saveCheckout: (id: string, body: Record<string, unknown>) => apiClient.patch(`/stores/${id}/checkout`, body).then((r) => unwrap<unknown>(r)),
  showInStock: (id: string) => apiClient.post(`/stores/${id}/products/bulk`, { action: 'show_in_stock' }).then((r) => unwrap<{ updated: number }>(r)),
};
