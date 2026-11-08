/**
 * Channel page calls: order status mapping, "Sync now" and the activity log
 * (sync + webhook logs, paginated on the server).
 */

import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type InboundTarget = 'NONE' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'PAID';
export type OutboundBoard = 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED' | 'PAID';

export interface StatusMapView {
  channel: 'SHOPIFY' | 'WOOCOMMERCE' | 'DARAZ' | 'CUSTOM_WEBSITE' | null;
  targets: InboundTarget[];
  customInbound: boolean;
  freeOutbound: boolean;
  /** Nafaa can send statuses to the channel right now. */
  outboundLive: boolean;
  inbound: Array<{ key: string; target: InboundTarget; defaultTarget: InboundTarget; custom: boolean }>;
  outbound: Array<{ board: OutboundBoard; action: string; defaultAction: string; options: string[] }>;
}

export interface SyncNowResult {
  orders: { seen: number; created: number; updated: number } | null;
  catalog: { prices?: number; error?: string | null; stockOff?: boolean } | null;
  notes: string[];
}

export interface ChannelLogRow {
  id: string;
  source: 'SYNC' | 'WEBHOOK';
  code: string;
  kind: 'IN' | 'OUT';
  ok: boolean;
  error: string | null;
  at: string;
  done: number;
  failed: number;
  ref: string | null;
  action: string | null;
}

export type LogFilter = 'all' | 'err' | 'in' | 'out';

export const channelOpsApi = {
  statusMap: (id: string) => apiClient.get(`/online-store/channels/${id}/status-map`).then((r) => unwrap<StatusMapView>(r)),
  saveStatusMap: (id: string, body: { inbound?: Record<string, string>; outbound?: Record<string, string>; remove?: string[] }) =>
    apiClient.put(`/online-store/channels/${id}/status-map`, body).then((r) => unwrap<StatusMapView>(r)),
  syncNow: (id: string) => apiClient.post(`/online-store/channels/${id}/sync-now`, {}, { timeout: 240_000 }).then((r) => unwrap<SyncNowResult>(r)),
  logs: (id: string, page: number, filter: LogFilter) =>
    apiClient.get(`/online-store/channels/${id}/logs`, { params: { page, filter } })
      .then((r) => unwrap<{ page: number; pageSize: number; total: number; rows: ChannelLogRow[] }>(r)),
};
