/**
 * Facebook & Instagram (Meta) API: connection and chosen pages / accounts,
 * catalog sync, and the unified inbox (/online-store/inbox).
 */

import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type MetaAccessReason = 'paused' | 'not_configured' | 'soon' | null;
export interface MetaAccess { live: boolean; reason: MetaAccessReason; beta: boolean }

export interface MetaPage { id: string; name: string; picture: string | null; igId: string | null; igUsername: string | null; igPicture: string | null }
export interface MetaConnectionView {
  id: string;
  status: 'CONNECTED' | 'EXPIRED' | 'REVOKED' | 'ERROR' | 'DISCONNECTED';
  health: 'ok' | 'expiring' | 'expired';
  needsReconnect: boolean;
  metaUserName: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
  missingScopes: string[];
  pages: MetaPage[];
  adAccounts: Array<{ id: string; name: string; currency: string | null; status: number | null }>;
  businesses: Array<{ id: string; name: string }>;
  catalogs: Array<{ id: string; name: string; businessId?: string | null }>;
  selected: {
    pageId: string | null; pageName: string | null; pagePicture: string | null; igUserId: string | null; igUsername: string | null;
    adAccountId: string | null; businessId: string | null; catalogId: string | null; wabaId: string | null; waPhoneNumberId: string | null;
  };
  settings: { autoPublish: boolean; inboxEnabled: boolean; catalogSync: boolean };
  webhooksAt: string | null;
  catalogSyncedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  connectedAt: string;
}
export interface MetaStatus { access: MetaAccess; connection: MetaConnectionView | null }

export interface CatalogRun {
  id: string; trigger: 'CHANGE' | 'DAILY' | 'MANUAL'; status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED';
  sent: number; removed: number; failed: number; unchanged: number; message: string | null;
  errors: Array<{ id: string; message: string }>; startedAt: string; finishedAt: string | null;
}
export interface CatalogOverview { catalogId: string | null; enabled: boolean; items: number; lastSyncedAt: string | null; runs: CatalogRun[] }

export type InboxPlatform = 'MESSENGER' | 'INSTAGRAM' | 'FACEBOOK';
export interface InboxConversation {
  id: string; platform: 'MESSENGER' | 'INSTAGRAM'; participantName: string | null; participantUsername: string | null;
  lastText: string | null; lastMessageAt: string | null; unread: number; status: 'OPEN' | 'DONE';
  phone: string | null; customerId: string | null; channelOrderId: string | null; canReply: boolean; replyClosesAt: string | null;
}
export interface InboxComment {
  id: string; platform: 'FACEBOOK' | 'INSTAGRAM'; authorName: string | null; text: string | null; commentedAt: string; hidden: boolean;
  fromShop: boolean; repliedAt: string | null; read: boolean; objectId: string | null; socialPostId: string | null; phone: string | null;
  replies?: InboxComment[];
}
export interface InboxList {
  access: MetaAccess; connected: boolean; needsReconnect: boolean; webhooksAt: string | null;
  stats: { openThreads: number; unreadMessages: number; unreadComments: number; unanswered: number };
  conversations?: InboxConversation[];
  comments?: InboxComment[];
}
export interface PhoneLinks {
  phone: string | null;
  customers: Array<{ id: string; name: string; phone: string | null }>;
  orders: Array<{ id: string; number: string; customerName: string; total: number; status: string; createdAt: string }>;
}
export interface ConversationDetail {
  conversation: InboxConversation;
  messages: Array<{ id: string; direction: 'IN' | 'OUT'; text: string | null; attachments: Array<{ type: string; url: string | null }>; sentAt: string; status: string; error: string | null }>;
  links: PhoneLinks;
}

export interface StudioMetaStatus {
  live: boolean; reason: MetaAccessReason; connected: boolean; needsReconnect: boolean; autoPublish: boolean;
  platforms: { FACEBOOK: { name: string | null } | null; INSTAGRAM: { name: string | null } | null };
}
export interface PlatformPublishState {
  status: 'PUBLISHING' | 'WAITING' | 'PUBLISHED' | 'FAILED'; postId?: string | null; permalink?: string | null;
  error?: string | null; willRetry?: boolean; attempts: number; at: string; nextAt?: string | null;
}

export const metaApi = {
  status: () => apiClient.get('/integrations/meta/status').then((r) => unwrap<MetaStatus>(r)),
  connect: () => apiClient.post('/integrations/meta/connect', { returnOrigin: window.location.origin }).then((r) => unwrap<{ authUrl: string }>(r)),
  refresh: () => apiClient.post('/integrations/meta/refresh').then((r) => unwrap<MetaConnectionView>(r)),
  assets: (b: Partial<Record<'pageId' | 'adAccountId' | 'businessId' | 'catalogId', string | null>>) => apiClient.patch('/integrations/meta/assets', b).then((r) => unwrap<MetaConnectionView>(r)),
  settings: (b: Partial<MetaConnectionView['settings']>) => apiClient.patch('/integrations/meta/settings', b).then((r) => unwrap<MetaConnectionView>(r)),
  disconnect: () => apiClient.post('/integrations/meta/disconnect').then((r) => unwrap<{ ok: boolean }>(r)),
  catalog: () => apiClient.get('/integrations/meta/catalog').then((r) => unwrap<CatalogOverview>(r)),
  createCatalog: (name?: string) => apiClient.post('/integrations/meta/catalog', { name }).then((r) => unwrap<MetaConnectionView>(r)),
  syncCatalog: () => apiClient.post('/integrations/meta/catalog/sync').then((r) => unwrap<{ status: string; sent?: number; removed?: number; failed?: number; unchanged?: number }>(r)),

  inbox: (q: { tab: 'messages' | 'comments'; status?: string; search?: string; platform?: string }) => apiClient.get('/online-store/inbox', { params: q }).then((r) => unwrap<InboxList>(r)),
  pull: () => apiClient.post('/online-store/inbox/pull').then((r) => unwrap<{ messages: number; comments: number }>(r)),
  conversation: (id: string) => apiClient.get(`/online-store/inbox/conversations/${id}`).then((r) => unwrap<ConversationDetail>(r)),
  reply: (id: string, text: string) => apiClient.post(`/online-store/inbox/conversations/${id}/reply`, { text }).then((r) => unwrap<{ ok: boolean }>(r)),
  updateConversation: (id: string, b: Partial<Pick<InboxConversation, 'status' | 'phone' | 'customerId' | 'channelOrderId'>>) => apiClient.patch(`/online-store/inbox/conversations/${id}`, b).then((r) => unwrap<InboxConversation>(r)),
  lookup: (phone: string) => apiClient.get('/online-store/inbox/lookup', { params: { phone } }).then((r) => unwrap<PhoneLinks>(r)),
  replyComment: (id: string, text: string, isPrivate = false) => apiClient.post(`/online-store/inbox/comments/${id}/reply`, { text, private: isPrivate }).then((r) => unwrap<{ ok: boolean }>(r)),
  hideComment: (id: string, hidden: boolean) => apiClient.post(`/online-store/inbox/comments/${id}/hide`, { hidden }).then((r) => unwrap<{ ok: boolean }>(r)),
  deleteComment: (id: string) => apiClient.delete(`/online-store/inbox/comments/${id}`).then((r) => unwrap<{ ok: boolean }>(r)),
  readComments: (ids: string[]) => apiClient.post('/online-store/inbox/comments/read', { ids }).then((r) => unwrap<{ count: number }>(r)),

  studioStatus: () => apiClient.get('/online-store/social/meta/status').then((r) => unwrap<StudioMetaStatus>(r)),
  publishNow: (postId: string, platforms?: string[]) => apiClient.post(`/online-store/social/meta/publish/${postId}`, { platforms }).then((r) => unwrap<{ status: string; publishState: Record<string, PlatformPublishState>; postUrls: Record<string, string> }>(r)),
};
