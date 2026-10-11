/**
 * Per-user preferences stored on the server (GET/PUT /preferences/:key), so
 * a layout chosen on the shop PC is the same on the owner's phone.
 */

import { apiClient } from './client';

export type PreferenceKey = 'dashboard';

export const preferencesApi = {
  get: <T>(key: PreferenceKey) =>
    apiClient.get<{ data: T | null }>(`/preferences/${key}`).then((r) => r.data.data),
  save: <T>(key: PreferenceKey, value: T) =>
    apiClient.put<{ data: T }>(`/preferences/${key}`, value).then((r) => r.data.data),
};
