/**
 * FAQ calls (API-CONTRACT 8.3).
 */
import type { AdminFaq, CmsStatus, CreateFaqBody, FaqMutationResponse, FaqTopic, Paginated, PatchFaqBody } from '../contract/cms-contract';
import { CMS_BASE, cleanParams, cmsHttp, unwrap } from '../dashboard/shared/cms-http';

export interface FaqListParams {
  locale?: string;
  topic?: string;
  status?: CmsStatus | '';
  q?: string;
  page?: number;
  limit?: number;
}

export const faqsApi = {
  list: (params: FaqListParams) => cmsHttp.get(`${CMS_BASE}/faqs`, { params: cleanParams({ ...params }) }).then((r) => unwrap<Paginated<AdminFaq>>(r)),
  topics: () => cmsHttp.get(`${CMS_BASE}/faqs/topics`).then((r) => unwrap<FaqTopic[]>(r)),
  create: (body: CreateFaqBody) => cmsHttp.post(`${CMS_BASE}/faqs`, body).then((r) => unwrap<AdminFaq>(r)),
  update: (id: string, body: PatchFaqBody) => cmsHttp.patch(`${CMS_BASE}/faqs/${id}`, body).then((r) => unwrap<AdminFaq>(r)),
  publish: (id: string) => cmsHttp.post(`${CMS_BASE}/faqs/${id}/publish`).then((r) => unwrap<FaqMutationResponse>(r)),
  unpublish: (id: string) => cmsHttp.post(`${CMS_BASE}/faqs/${id}/unpublish`).then((r) => unwrap<FaqMutationResponse>(r)),
  remove: (id: string) => cmsHttp.delete(`${CMS_BASE}/faqs/${id}`).then(() => undefined),
};
