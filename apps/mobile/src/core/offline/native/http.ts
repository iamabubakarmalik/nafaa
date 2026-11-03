/**
 * Offline engine transport over the app's API client, so requests get the
 * same token refresh, branch header, language and server-message
 * translation as every screen. Adds the Idempotency-Key header and, for
 * queued work, the branch the work was done in.
 */

import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { addRequestHook, apiClient } from '@/core/api/client';
import { HttpError, type Http, type HttpRequest, type HttpResponse } from '../engine/types';

type OfflineConfig = InternalAxiosRequestConfig & { nafaaOffline?: { key?: string; shopId?: string | null } };

let hooked = false;

function installHook() {
  if (hooked) return;
  hooked = true;
  // Runs after the client set the active branch; queued work keeps the branch it was made in.
  addRequestHook((config) => {
    const extra = (config as OfflineConfig).nafaaOffline;
    if (!extra) return;
    if (extra.key) config.headers['Idempotency-Key'] = extra.key;
    if (extra.shopId) config.headers['x-shop-id'] = extra.shopId;
  });
}

export function axiosHttp(): Http {
  installHook();
  return {
    async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
      try {
        const res = await apiClient.request<T>({
          method: req.method,
          url: req.path,
          data: req.body,
          params: req.params,
          timeout: req.timeoutMs ?? (req.method === 'GET' ? 30_000 : 20_000),
          nafaaOffline: { key: req.idempotencyKey, shopId: req.shopId },
        } as Parameters<typeof apiClient.request>[0]);
        return { status: res.status, data: res.data, replayed: String(res.headers?.['idempotent-replayed']) === 'true' };
      } catch (e) {
        const err = e as AxiosError<{ message?: unknown }>;
        const status = err.response?.status ?? 0;
        const msg = err.response?.data?.message;
        throw new HttpError(status, Array.isArray(msg) ? String(msg[0]) : typeof msg === 'string' ? msg : err.message, err.response?.data);
      }
    },
  };
}
