/**
 * Live support REST calls (merchant side, SUPPORT_REST.merchant in the
 * contract). Same endpoints as the web app. The merchant has one current
 * conversation at a time; realtime updates come over the socket
 * (../lib/socket.ts). The API client already unwraps `{ success, data }`.
 */

import { apiClient } from '@/core/api/client';
import type {
  SupportAttachment, SupportConversation, SupportMessage, SupportPage, SupportRateBody, SupportSendBody, SupportStartBody, SupportStatusInfo,
} from './support.types';

export * from './support.types';

/** A file on the phone, ready to upload (camera, gallery or document picker). */
export interface LocalFile {
  uri: string;
  name: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
}

export interface UploadExtra {
  durationSec?: number;
  waveform?: number[];
  width?: number;
  height?: number;
}

export const supportApi = {
  /** Team presence, hours, welcome/away text, quick questions, limits and the unread badge. */
  status: async () => (await apiClient.get<SupportStatusInfo>('/support/status')).data,

  unread: async () => (await apiClient.get<{ unread: number }>('/support/unread')).data,

  /** Latest conversation that is not CLOSED, or null. */
  current: async () => (await apiClient.get<SupportConversation | null>('/support/conversations/current')).data ?? null,

  /** Newest page first, or older messages before a message id. */
  messages: async (id: string, before?: string, limit = 40) =>
    (await apiClient.get<SupportPage<SupportMessage>>(`/support/conversations/${id}/messages`, { params: { before, limit } })).data,

  start: async (body: SupportStartBody) =>
    (await apiClient.post<{ conversation: SupportConversation; messages: SupportMessage[] }>('/support/conversations', { source: 'mobile', ...body })).data,

  send: async (id: string, body: SupportSendBody) => (await apiClient.post<SupportMessage>(`/support/conversations/${id}/messages`, body)).data,

  /** "Support team se baat karein": hands the chat from Nafaa AI to the support team. */
  handover: async (id: string) => (await apiClient.post<SupportConversation>(`/support/conversations/${id}/handover`)).data,

  markRead: async (id: string) => (await apiClient.post<{ ok: boolean }>(`/support/conversations/${id}/read`)).data,

  rate: async (id: string, body: SupportRateBody) => (await apiClient.post<SupportConversation>(`/support/conversations/${id}/rate`, body)).data,

  /** The merchant says the issue is solved. */
  resolve: async (id: string) => (await apiClient.post<SupportConversation>(`/support/conversations/${id}/resolve`)).data,

  editMessage: async (id: string, text: string) => (await apiClient.patch<SupportMessage>(`/support/messages/${id}`, { text })).data,

  deleteMessage: async (id: string) => (await apiClient.delete<SupportMessage>(`/support/messages/${id}`)).data,

  /** Uploads a picture, PDF or voice note from the phone; returns what to attach to a message. */
  upload: async (file: LocalFile, extra?: UploadExtra, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    // React Native's FormData takes { uri, name, type } for a file on disk.
    form.append('file', { uri: file.uri, name: file.name, type: file.mime } as unknown as Blob);
    if (extra?.durationSec != null) form.append('durationSec', String(extra.durationSec));
    if (extra?.waveform) form.append('waveform', JSON.stringify(extra.waveform));
    if (extra?.width) form.append('width', String(extra.width));
    if (extra?.height) form.append('height', String(extra.height));
    const res = await apiClient.post<SupportAttachment>('/support/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)); },
    });
    return res.data;
  },
};
