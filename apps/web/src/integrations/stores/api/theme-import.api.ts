/**
 * Theme files API client: Shopify theme zip import, Nafaa theme file
 * export/import, and publish/discard of the imported draft
 * (apps/api/src/integrations/stores/store-theme-import.controller.ts).
 */

import { apiClient } from '@core/api/client';
import { unwrap } from '@integrations/online-orders/api/online-orders.api';
import type { ThemeDoc, ThemeId, ThemeVersionFull } from './stores.api';

export type SkipCode =
  | 'unknown_section' | 'app_section' | 'custom_code' | 'image_missing' | 'collection_missing' | 'product_ref'
  | 'cart_type' | 'menu_links' | 'file_broken' | 'too_many' | 'block_unknown' | 'template_other' | 'video_host';

export interface ThemeImportReport {
  id: string;
  source: 'shopify' | 'nafaa';
  status: 'draft' | 'published' | 'discarded';
  /** Status checked against the theme history (published from the editor counts too). */
  state: 'draft' | 'published' | 'discarded';
  fileName: string | null;
  themeName: string;
  themeVersion: string | null;
  basePreset: ThemeId;
  importedAt: string;
  imported: {
    sections: Array<{ template: string; from: string; to: string }>;
    images: number;
    colours: Array<{ token: string; value: string }>;
    fonts: Array<{ from: string; to: string; exact: boolean; role: 'heading' | 'body' }>;
  };
  skipped: Array<{ code: SkipCode; what: string; why: string }>;
  pending: { logo: boolean; favicon: boolean; social: string[] };
  settingsApplied: boolean;
  draftVersionId: string;
}

export interface ThemeImportState {
  last: ThemeImportReport | null;
  shopify: { connected: boolean; shop: string | null };
  limits: { shopifyZipMb: number; nafaaFileMb: number };
}

export interface NafaaThemeExport { fileName: string; which: 'live' | 'draft'; file: { format: 'nafaa-theme'; doc: ThemeDoc } & Record<string, unknown> }

const base = (id: string) => `/stores/${encodeURIComponent(id)}/theme`;

function upload<T>(url: string, file: File, fields: Record<string, string>, onProgress?: (pct: number) => void) {
  const form = new FormData();
  form.append('file', file, file.name);
  for (const [k, v] of Object.entries(fields)) if (v) form.append(k, v);
  return apiClient.post(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180_000,
    onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)); },
  }).then((r) => unwrap<T>(r));
}

export const themeImportApi = {
  state: (id: string) => apiClient.get(`${base(id)}/import`).then((r) => unwrap<ThemeImportState>(r)),
  shopify: (id: string, file: File, shopUrl: string, onProgress?: (pct: number) => void) =>
    upload<{ report: ThemeImportReport; draft: ThemeVersionFull }>(`${base(id)}/import/shopify`, file, { shopUrl }, onProgress),
  nafaa: (id: string, file: File, onProgress?: (pct: number) => void) =>
    upload<{ report: ThemeImportReport; draft: ThemeVersionFull }>(`${base(id)}/import/nafaa`, file, {}, onProgress),
  publish: (id: string) => apiClient.post(`${base(id)}/import/publish`, {}).then((r) => unwrap<{ report: ThemeImportReport }>(r)),
  discard: (id: string) => apiClient.post(`${base(id)}/import/discard`, {}).then((r) => unwrap<{ report: ThemeImportReport; draft: ThemeVersionFull }>(r)),
  exportFile: (id: string, which: 'live' | 'draft') => apiClient.get(`${base(id)}/export`, { params: { which } }).then((r) => unwrap<NafaaThemeExport>(r)),
};
