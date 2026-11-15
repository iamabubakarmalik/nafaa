/**
 * Live support REST calls (merchant side, SUPPORT_REST.merchant in the
 * contract). The merchant has one current conversation at a time; realtime
 * updates come over the socket (see ../lib/socket.ts).
 */

import { apiClient } from '@core/api/client';
import type {
  SupportAttachment, SupportConversation, SupportMessage, SupportPage, SupportRateBody, SupportSendBody, SupportStartBody, SupportStatusInfo,
} from './support.types';

export * from './support.types';

/** Most API bodies are wrapped as { success, data }. */
const unwrap = <T,>(res: { data: unknown }): T => {
  const body = res.data as Record<string, unknown> | null;
  return (body && typeof body === 'object' && 'data' in body && 'success' in body ? body.data : body) as T;
};

export interface UploadExtra {
  durationSec?: number;
  waveform?: number[];
  width?: number;
  height?: number;
}

export const supportApi = {
  /** Team presence, hours, welcome/away text, quick questions, ICE servers, limits and the unread badge. */
  status: async () => unwrap<SupportStatusInfo>(await apiClient.get('/support/status')),

  unread: async () => unwrap<{ unread: number }>(await apiClient.get('/support/unread')),

  /** Latest conversation that is not CLOSED, or null. */
  current: async () => unwrap<SupportConversation | null>(await apiClient.get('/support/conversations/current')),

  conversations: async (cursor?: string) =>
    unwrap<SupportPage<SupportConversation>>(await apiClient.get('/support/conversations', { params: { cursor } })),

  conversation: async (id: string) => unwrap<SupportConversation>(await apiClient.get(`/support/conversations/${id}`)),

  /** Newest first page, or older messages before a message id. */
  messages: async (id: string, before?: string, limit = 40) =>
    unwrap<SupportPage<SupportMessage>>(await apiClient.get(`/support/conversations/${id}/messages`, { params: { before, limit } })),

  start: async (body: SupportStartBody) =>
    unwrap<{ conversation: SupportConversation; messages: SupportMessage[] }>(await apiClient.post('/support/conversations', { source: 'web', ...body })),

  send: async (id: string, body: SupportSendBody) => unwrap<SupportMessage>(await apiClient.post(`/support/conversations/${id}/messages`, body)),

  /** "Talk to our team": hands the chat from Nafaa AI to the support team. */
  handover: async (id: string) => unwrap<SupportConversation>(await apiClient.post(`/support/conversations/${id}/handover`)),

  markRead: async (id: string) => unwrap<{ ok: boolean }>(await apiClient.post(`/support/conversations/${id}/read`)),

  rate: async (id: string, body: SupportRateBody) => unwrap<SupportConversation>(await apiClient.post(`/support/conversations/${id}/rate`, body)),

  /** The merchant says the issue is solved. */
  resolve: async (id: string) => unwrap<SupportConversation>(await apiClient.post(`/support/conversations/${id}/resolve`)),

  editMessage: async (id: string, text: string) => unwrap<SupportMessage>(await apiClient.patch(`/support/messages/${id}`, { text })),

  deleteMessage: async (id: string) => unwrap<SupportMessage>(await apiClient.delete(`/support/messages/${id}`)),

  /** Uploads a picture, file or voice note; returns what to attach to a message. */
  upload: async (file: Blob, name: string, extra?: UploadExtra, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file, name);
    if (extra?.durationSec != null) form.append('durationSec', String(extra.durationSec));
    if (extra?.waveform) form.append('waveform', JSON.stringify(extra.waveform));
    if (extra?.width) form.append('width', String(extra.width));
    if (extra?.height) form.append('height', String(extra.height));
    return unwrap<SupportAttachment>(await apiClient.post('/support/uploads', form, {
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)); },
    }));
  },
};
