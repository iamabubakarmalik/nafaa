import { apiClient } from '../client';

export const chatbotApi = {
  list: (params: any = {}) =>
    apiClient
      .get('/admin/marketing/chatbot/conversations', { params })
      .then((r) => r.data.data),

  stats: () =>
    apiClient.get('/admin/marketing/chatbot/stats').then((r) => r.data.data),

  detail: (id: string) =>
    apiClient
      .get(`/admin/marketing/chatbot/conversations/${id}`)
      .then((r) => r.data.data),

  takeover: (id: string, greeting?: string) =>
    apiClient
      .post(`/admin/marketing/chatbot/conversations/${id}/takeover`, { greeting })
      .then((r) => r.data.data),

  sendMessage: (id: string, message: string, internal = false) =>
    apiClient
      .post(`/admin/marketing/chatbot/conversations/${id}/messages`, {
        message,
        internal,
      })
      .then((r) => r.data.data),

  resolve: (id: string, summary?: string) =>
    apiClient
      .post(`/admin/marketing/chatbot/conversations/${id}/resolve`, { summary })
      .then((r) => r.data.data),
};
