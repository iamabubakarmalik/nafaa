/**
 * Settings calls (API-CONTRACT 8.7).
 */
import type { LlmsPreviewResponse, PutSettingResponse, SettingKey, SettingsBundle } from '../contract/cms-contract';
import { CMS_BASE, cmsHttp, unwrap } from '../dashboard/shared/cms-http';

export const settingsApi = {
  all: (locale = 'en') => cmsHttp.get(`${CMS_BASE}/settings`, { params: { locale } }).then((r) => unwrap<SettingsBundle>(r)),
  put: (key: SettingKey, value: unknown, locale = 'en') => cmsHttp.put(`${CMS_BASE}/settings/${key}`, { locale, value }).then((r) => unwrap<PutSettingResponse>(r)),
  llmsPreview: () => cmsHttp.get(`${CMS_BASE}/settings/preview/llms`).then((r) => unwrap<LlmsPreviewResponse>(r)),
};
