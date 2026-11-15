import { apiClient } from './client';
import type {
  SupportAdminConversation,
  SupportAdminListCounts,
  SupportAdminUpdateBody,
  SupportAgentRef,
  SupportAttachment,
  SupportCannedReply,
  SupportIceServer,
  SupportMessage,
  SupportPage,
  SupportProactiveKey,
  SupportProactiveStats,
  SupportSendBody,
  SupportSettings,
} from '@/features/support/lib/support.types';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export interface SupportListParams {
  status?: string;
  view?: 'mine' | 'unassigned' | 'all';
  priority?: string;
  tag?: string;
  search?: string;
  tenantId?: string;
  /** Comma separated tenant ids (several shops). */
  tenantIds?: string;
  cursor?: string;
  limit?: number;
}

export interface SupportContext {
  tenant: {
    id: string; name: string; slug: string; phone: string | null; status: string; businessType: string | null; businessModels: string[];
    language: string; address: string | null; createdAt: string; lastActiveAt: string | null; paused: boolean; users: number; shops: number; lastSaleAt: string | null;
  };
  owner: { id: string; fullName: string; email: string; phone: string | null; lastSeenAt: string | null; lastSeenVia: string | null; lastLoginAt: string | null; language: string | null } | null;
  plan: { name: string | null; slug: string | null; status: string; interval: string; trialEndsAt: string | null; currentPeriodEnd: string } | null;
  merchantOnline: boolean;
  whatsappUrl: string | null;
  conversations: Array<{ id: string; status: string; subject: string | null; lastMessagePreview: string | null; lastMessageAt: string; rating: string | null }>;
  recentErrors: Array<{ kind: string; at: string; text: string }>;
}

export interface SupportReport {
  totals: { conversations: number; handedOver: number; answeredByAiOnly: number; resolved: number; open: number };
  perDay: Array<{ day: string; conversations: number; handedOver: number; resolved: number }>;
  firstResponse: { avgSec: number | null; medianSec: number | null; count: number };
  resolution: { avgSec: number | null; medianSec: number | null; count: number };
  rating: { up: number; down: number; score: number | null };
  agents: Array<{ id: string; name: string; replies: number; conversations: number; resolved: number; up: number; down: number }>;
}

export const adminSupportApi = {
  list: (params: SupportListParams) =>
    apiClient.get('/admin/support/conversations', { params }).then(unwrap<SupportPage<SupportAdminConversation> & { counts: SupportAdminListCounts }>),
  counts: () => apiClient.get('/admin/support/counts').then(unwrap<SupportAdminListCounts>),
  tags: () => apiClient.get('/admin/support/tags').then(unwrap<string[]>),
  get: (id: string) => apiClient.get(`/admin/support/conversations/${id}`).then(unwrap<SupportAdminConversation>),
  messages: (id: string, before?: string) =>
    apiClient.get(`/admin/support/conversations/${id}/messages`, { params: { before, limit: 50 } }).then(unwrap<SupportPage<SupportMessage>>),
  send: (id: string, body: SupportSendBody) => apiClient.post(`/admin/support/conversations/${id}/messages`, body).then(unwrap<SupportMessage>),
  update: (id: string, body: SupportAdminUpdateBody) => apiClient.patch(`/admin/support/conversations/${id}`, body).then(unwrap<SupportAdminConversation>),
  read: (id: string) => apiClient.post(`/admin/support/conversations/${id}/read`).then(unwrap<{ ok: boolean }>),
  suggest: (id: string) => apiClient.post(`/admin/support/conversations/${id}/suggest`).then(unwrap<{ drafts: string[] }>),
  start: (body: { tenantId: string; text?: string; subject?: string }) => apiClient.post('/admin/support/start', body).then(unwrap<SupportAdminConversation>),
  bulkStart: (body: { tenantIds: string[]; text: string; subject?: string }) =>
    apiClient.post('/admin/support/start/bulk', body).then(unwrap<{ sent: number; failed: number; results: Array<{ tenantId: string; conversationId: string | null; error: string | null }> }>),
  editMessage: (id: string, text: string) => apiClient.patch(`/admin/support/messages/${id}`, { text }).then(unwrap<SupportMessage>),
  deleteMessage: (id: string) => apiClient.delete(`/admin/support/messages/${id}`).then(unwrap<SupportMessage>),
  /** Super admin only: removes the content for good (a tombstone stays). */
  purgeMessage: (id: string) => apiClient.delete(`/admin/support/messages/${id}/permanent`).then(unwrap<SupportMessage>),
  /** A call or screen recording (or one part of a long one); the server adds it to the call line. */
  uploadRecording: (callId: string, file: Blob, extra: { conversationId: string; kind: 'call' | 'screen'; durationSec: number; startedAt: string; part: number }) => {
    const fd = new FormData();
    fd.append('file', file, `${extra.kind}-${extra.part}.${file.type.includes('mp4') ? 'mp4' : 'webm'}`);
    fd.append('conversationId', extra.conversationId);
    fd.append('kind', extra.kind);
    fd.append('durationSec', String(Math.round(extra.durationSec)));
    fd.append('startedAt', extra.startedAt);
    fd.append('part', String(extra.part));
    return apiClient.post(`/admin/support/calls/${encodeURIComponent(callId)}/recordings`, fd, { timeout: 10 * 60_000 })
      .then(unwrap<{ attachment: SupportAttachment; attached: boolean }>);
  },
  upload: (file: File | Blob, extra: { name?: string; durationSec?: number; waveform?: number[]; width?: number; height?: number } = {}) => {
    const fd = new FormData();
    fd.append('file', file, extra.name ?? (file instanceof File ? file.name : 'voice.webm'));
    if (extra.durationSec != null) fd.append('durationSec', String(extra.durationSec));
    if (extra.waveform) fd.append('waveform', JSON.stringify(extra.waveform));
    if (extra.width != null) fd.append('width', String(extra.width));
    if (extra.height != null) fd.append('height', String(extra.height));
    return apiClient.post('/admin/support/uploads', fd).then(unwrap<SupportAttachment>);
  },

  context: (tenantId: string) => apiClient.get(`/admin/support/tenants/${tenantId}/context`).then(unwrap<SupportContext>),
  notify: (tenantId: string, body: { title: string; message: string; link?: string }) =>
    apiClient.post(`/admin/support/tenants/${tenantId}/notify`, body).then(unwrap<{ ok: boolean }>),
  email: (tenantId: string, body: { subject: string; body: string; to?: string }) =>
    apiClient.post(`/admin/support/tenants/${tenantId}/email`, body).then(unwrap<{ ok: boolean; to: string }>),
  sms: (tenantId: string, body: { message: string; to?: string }) =>
    apiClient.post(`/admin/support/tenants/${tenantId}/sms`, body).then(unwrap<{ ok: boolean; to: string }>),

  agents: () => apiClient.get('/admin/support/agents').then(unwrap<SupportAgentRef[]>),
  ice: () => apiClient.get('/admin/support/ice').then(unwrap<SupportIceServer[]>),
  setPresence: (state: 'online' | 'away') => apiClient.put('/admin/support/presence', { state }).then(unwrap<{ ok: boolean; state: string }>),

  settings: () => apiClient.get('/admin/support/settings').then(unwrap<SupportSettings>),
  saveSettings: (body: Partial<SupportSettings>) => apiClient.put('/admin/support/settings', body).then(unwrap<SupportSettings>),
  canned: (search?: string) => apiClient.get('/admin/support/canned', { params: { search } }).then(unwrap<SupportCannedReply[]>),
  createCanned: (body: Partial<SupportCannedReply>) => apiClient.post('/admin/support/canned', body).then(unwrap<SupportCannedReply>),
  updateCanned: (id: string, body: Partial<SupportCannedReply>) => apiClient.patch(`/admin/support/canned/${id}`, body).then(unwrap<SupportCannedReply>),
  deleteCanned: (id: string) => apiClient.delete(`/admin/support/canned/${id}`).then(unwrap<{ ok: boolean }>),
  proactiveStats: () => apiClient.get('/admin/support/proactive/stats').then(unwrap<SupportProactiveStats[]>),
  proactivePreview: (body: { key: SupportProactiveKey; lang: 'en' | 'ur' | 'roman'; tenantId?: string }) =>
    apiClient.post('/admin/support/proactive/preview', body).then(unwrap<{ text: string; chips: string[]; agentName: string }>),
  proactiveRun: () => apiClient.post('/admin/support/proactive/run').then(unwrap<{ sent: number; checked: number }>),
  reports: (from?: string, to?: string) => apiClient.get('/admin/support/reports', { params: { from, to } }).then(unwrap<SupportReport>),
};
