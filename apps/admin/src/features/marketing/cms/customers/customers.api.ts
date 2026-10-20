/**
 * Customer and testimonial calls (API-CONTRACT 8.8).
 */
import type {
  AdminCustomer, AdminTestimonial, CmsStatus, CreateCustomerBody, CreateTestimonialBody, CustomerConsentBody, Paginated, PatchCustomerBody, PatchTestimonialBody,
} from '../contract/cms-contract';
import { CMS_BASE, cleanParams, cmsHttp, unwrap } from '../dashboard/shared/cms-http';

export const customersApi = {
  list: (params: { q?: string; public?: 'true' | 'false' | ''; page?: number; limit?: number }) =>
    cmsHttp.get(`${CMS_BASE}/customers`, { params: cleanParams({ ...params }) }).then((r) => unwrap<Paginated<AdminCustomer>>(r)),
  create: (body: CreateCustomerBody) => cmsHttp.post(`${CMS_BASE}/customers`, body).then((r) => unwrap<AdminCustomer>(r)),
  update: (id: string, body: PatchCustomerBody) => cmsHttp.patch(`${CMS_BASE}/customers/${id}`, body).then((r) => unwrap<AdminCustomer>(r)),
  consent: (id: string, body: CustomerConsentBody) => cmsHttp.post(`${CMS_BASE}/customers/${id}/consent`, body).then((r) => unwrap<AdminCustomer>(r)),
  visibility: (id: string, isPublic: boolean) => cmsHttp.post(`${CMS_BASE}/customers/${id}/visibility`, { isPublic }).then((r) => unwrap<AdminCustomer>(r)),
  remove: (id: string) => cmsHttp.delete(`${CMS_BASE}/customers/${id}`).then(() => undefined),
};

export const testimonialsApi = {
  list: (params: { customerId?: string; status?: CmsStatus | ''; page?: number; limit?: number }) =>
    cmsHttp.get(`${CMS_BASE}/testimonials`, { params: cleanParams({ ...params }) }).then((r) => unwrap<Paginated<AdminTestimonial>>(r)),
  create: (body: CreateTestimonialBody) => cmsHttp.post(`${CMS_BASE}/testimonials`, body).then((r) => unwrap<AdminTestimonial>(r)),
  update: (id: string, body: PatchTestimonialBody) => cmsHttp.patch(`${CMS_BASE}/testimonials/${id}`, body).then((r) => unwrap<AdminTestimonial>(r)),
  publish: (id: string) => cmsHttp.post(`${CMS_BASE}/testimonials/${id}/publish`).then((r) => unwrap<AdminTestimonial>(r)),
  unpublish: (id: string) => cmsHttp.post(`${CMS_BASE}/testimonials/${id}/unpublish`).then((r) => unwrap<AdminTestimonial>(r)),
  remove: (id: string) => cmsHttp.delete(`${CMS_BASE}/testimonials/${id}`).then(() => undefined),
};
