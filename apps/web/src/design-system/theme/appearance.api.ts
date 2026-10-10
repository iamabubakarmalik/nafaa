/**
 * Appearance API: the stored platform, business and personal layers.
 * See apps/api/src/modules/appearance.
 */

import { apiClient } from '@core/api/client';
import type { AppearanceLayer } from './appearance';

export interface StoredAppearance {
  platform: AppearanceLayer | null;
  business: AppearanceLayer | null;
  personal: AppearanceLayer | null;
  canEditBusiness: boolean;
}

const unwrap = <T>(res: { data?: unknown }): T => {
  const body = res.data as { data?: T } | T | undefined;
  return (body && typeof body === 'object' && 'data' in body ? body.data : body) as T;
};

export const appearanceApi = {
  get: () => apiClient.get('/appearance').then((r) => unwrap<StoredAppearance>(r)),
  platform: () => apiClient.get('/appearance/platform').then((r) => unwrap<AppearanceLayer | null>(r)),
  savePersonal: (layer: AppearanceLayer) => apiClient.put('/appearance/personal', layer).then((r) => unwrap<AppearanceLayer>(r)),
  saveBusiness: (layer: AppearanceLayer) => apiClient.put('/appearance/business', layer).then((r) => unwrap<AppearanceLayer>(r)),
  savePlatform: (layer: AppearanceLayer) => apiClient.put('/admin/appearance/platform', layer).then((r) => unwrap<AppearanceLayer>(r)),
};

export const APPEARANCE_QUERY_KEY = ['appearance'] as const;
