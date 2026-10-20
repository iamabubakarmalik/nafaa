/**
 * Menu calls (API-CONTRACT 8.6).
 */
import type { AdminMenu, AdminMenuDetail, MenuKey, PutMenuBody } from '../contract/cms-contract';
import { CMS_BASE, cmsHttp, unwrap } from '../dashboard/shared/cms-http';

export const menusApi = {
  list: (locale: string) => cmsHttp.get(`${CMS_BASE}/menus`, { params: { locale } }).then((r) => unwrap<AdminMenu[]>(r)),
  get: (key: MenuKey, locale: string) => cmsHttp.get(`${CMS_BASE}/menus/${key}`, { params: { locale } }).then((r) => unwrap<AdminMenuDetail>(r)),
  put: (key: MenuKey, body: PutMenuBody) => cmsHttp.put(`${CMS_BASE}/menus/${key}`, body).then((r) => unwrap<AdminMenu>(r)),
};
