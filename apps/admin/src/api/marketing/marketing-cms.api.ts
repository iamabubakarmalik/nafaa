/**
 * Admin client for the marketing CMS (API-CONTRACT section 8).
 * Every call unwraps the global `{ success, data }` envelope. Shapes come from
 * the generated contract copy, so the admin and the API agree on them.
 */
import type { AxiosError } from 'axios';
import { apiClient } from '../client';
import type {
  AdminCustomer,
  AdminEntry,
  AdminEntryListItem,
  AdminFaq,
  AdminMedia,
  AdminMenu,
  AdminMenuDetail,
  AdminRedirect,
  AdminTestimonial,
  ArchiveEntryBody,
  BulkEntriesBody,
  BulkEntriesResponse,
  CmsConfig,
  CmsDashboard,
  CmsEntryType,
  CmsHealthReport,
  CmsStatus,
  CreateCustomerBody,
  CreateEntryBody,
  CreateFaqBody,
  CreateRedirectBody,
  CreateTestimonialBody,
  CustomerConsentBody,
  EntryLookupItem,
  EntryResponse,
  FaqMutationResponse,
  FaqTopic,
  InboundLinksResponse,
  Issue,
  LinkSuggestion,
  LlmsPreviewResponse,
  MediaUsage,
  Paginated,
  PatchCustomerBody,
  PatchEntryBody,
  PatchEntryResponse,
  PatchFaqBody,
  PatchMediaBody,
  PatchRedirectBody,
  PatchTestimonialBody,
  PreviewLinkResponse,
  PublishEntryBody,
  PublishEntryResponse,
  PutMenuBody,
  PutSettingResponse,
  RedirectImportBody,
  RedirectImportResult,
  RedirectTestResult,
  RevalidationResult,
  RevisionDetail,
  RevisionDiff,
  RevisionListItem,
  ScheduleEntryBody,
  ScheduleEntryResponse,
  SettingKey,
  SettingsBundle,
  UnpublishEntryBody,
  UnpublishEntryResponse,
} from '../../features/marketing/cms/contract/cms-contract';

const BASE = '/admin/marketing/cms';

type Envelope<T> = { data: T };
const unwrap = <T>(r: { data: Envelope<T> }): T => r.data.data;

type Query = Record<string, string | number | boolean | undefined | null>;
function clean(params: Query = {}): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

// ─── Error helpers ───

interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  issues?: Issue[];
  current?: AdminEntry;
  duplicateOf?: AdminMedia;
}

export function apiErrorBody(err: unknown): ApiErrorBody | null {
  const res = (err as AxiosError<ApiErrorBody>)?.response;
  return res?.data ?? null;
}
export function apiErrorStatus(err: unknown): number | null {
  return (err as AxiosError)?.response?.status ?? null;
}
/** A readable message for toasts; the API already writes Roman Urdu messages. */
export function apiErrorMessage(err: unknown, fallback = 'Kuch ghalat ho gaya. Dobara try karein.'): string {
  const body = apiErrorBody(err);
  if (body?.message) return Array.isArray(body.message) ? body.message.join(', ') : body.message;
  if (apiErrorStatus(err) === null) return 'API se rabta nahi ho saka';
  return fallback;
}

// ─── Query params ───

export interface EntriesListParams {
  type?: CmsEntryType;
  status?: CmsStatus;
  locale?: string;
  q?: string;
  tag?: string;
  group?: string;
  gate?: 'below' | 'passed';
  sort?: 'updated' | 'title' | 'score';
  page?: number;
  limit?: number;
}

export const cmsApi = {
  // Config and dashboard
  config: () => apiClient.get<Envelope<CmsConfig>>(`${BASE}/config`).then(unwrap),
  dashboard: () => apiClient.get<Envelope<CmsDashboard>>(`${BASE}/dashboard`).then(unwrap),
  health: () => apiClient.get<Envelope<CmsHealthReport>>(`${BASE}/dashboard/health`).then(unwrap),
  revalidateAll: () => apiClient.post<Envelope<RevalidationResult>>(`${BASE}/revalidate-all`).then(unwrap),

  // Entries (8.1)
  entries: (params: EntriesListParams = {}) =>
    apiClient.get<Envelope<Paginated<AdminEntryListItem>>>(`${BASE}/entries`, { params: clean({ ...params }) }).then(unwrap),
  lookup: (params: { q: string; types?: CmsEntryType[]; limit?: number; locale?: string }) =>
    apiClient
      .get<Envelope<EntryLookupItem[]>>(`${BASE}/entries/lookup`, {
        params: clean({ q: params.q, types: params.types?.join(','), limit: params.limit, locale: params.locale }),
      })
      .then(unwrap),
  entry: (id: string) => apiClient.get<Envelope<AdminEntry>>(`${BASE}/entries/${id}`).then(unwrap),
  createEntry: (body: CreateEntryBody) => apiClient.post<Envelope<AdminEntry>>(`${BASE}/entries`, body).then(unwrap),
  patchEntry: (id: string, body: PatchEntryBody) =>
    apiClient.patch<Envelope<PatchEntryResponse>>(`${BASE}/entries/${id}`, body).then(unwrap),
  validate: (id: string) =>
    apiClient.post<Envelope<{ seo: PatchEntryResponse['seo']; canPublish: boolean }>>(`${BASE}/entries/${id}/validate`).then(unwrap),
  publish: (id: string, body: PublishEntryBody) =>
    apiClient.post<Envelope<PublishEntryResponse>>(`${BASE}/entries/${id}/publish`, body).then(unwrap),
  schedule: (id: string, body: ScheduleEntryBody) =>
    apiClient.post<Envelope<ScheduleEntryResponse>>(`${BASE}/entries/${id}/schedule`, body).then(unwrap),
  cancelSchedule: (id: string) => apiClient.post<Envelope<EntryResponse>>(`${BASE}/entries/${id}/cancel-schedule`).then(unwrap),
  unpublish: (id: string, body: UnpublishEntryBody) =>
    apiClient.post<Envelope<UnpublishEntryResponse>>(`${BASE}/entries/${id}/unpublish`, body).then(unwrap),
  archive: (id: string, body: ArchiveEntryBody) =>
    apiClient.post<Envelope<EntryResponse>>(`${BASE}/entries/${id}/archive`, body).then(unwrap),
  restoreArchive: (id: string) => apiClient.post<Envelope<EntryResponse>>(`${BASE}/entries/${id}/restore-archive`).then(unwrap),
  deleteEntry: (id: string) => apiClient.delete(`${BASE}/entries/${id}`).then(() => undefined),
  duplicate: (id: string, body: { title?: string; slug?: string } = {}) =>
    apiClient.post<Envelope<AdminEntry>>(`${BASE}/entries/${id}/duplicate`, body).then(unwrap),
  translate: (id: string, locale: string) =>
    apiClient.post<Envelope<AdminEntry>>(`${BASE}/entries/${id}/translations`, { locale }).then(unwrap),
  previewLink: (id: string, expiresInHours?: number) =>
    apiClient.post<Envelope<PreviewLinkResponse>>(`${BASE}/entries/${id}/preview-link`, clean({ expiresInHours })).then(unwrap),
  factCheck: (id: string, note?: string) =>
    apiClient.post<Envelope<EntryResponse>>(`${BASE}/entries/${id}/fact-check`, clean({ note })).then(unwrap),
  inbound: (id: string) => apiClient.get<Envelope<InboundLinksResponse>>(`${BASE}/entries/${id}/inbound`).then(unwrap),
  suggestions: (id: string) => apiClient.get<Envelope<LinkSuggestion[]>>(`${BASE}/entries/${id}/suggestions`).then(unwrap),
  bulk: (body: BulkEntriesBody) => apiClient.post<Envelope<BulkEntriesResponse>>(`${BASE}/entries/bulk`, body).then(unwrap),

  // Revisions (8.2)
  revisions: (entryId: string) =>
    apiClient.get<Envelope<RevisionListItem[]>>(`${BASE}/entries/${entryId}/revisions`).then(unwrap),
  revision: (revisionId: string) => apiClient.get<Envelope<RevisionDetail>>(`${BASE}/revisions/${revisionId}`).then(unwrap),
  revisionDiff: (entryId: string, revisionId: string) =>
    apiClient.get<Envelope<RevisionDiff>>(`${BASE}/entries/${entryId}/revisions/${revisionId}/diff`).then(unwrap),
  restoreRevision: (entryId: string, revisionId: string) =>
    apiClient.post<Envelope<EntryResponse>>(`${BASE}/entries/${entryId}/revisions/${revisionId}/restore`).then(unwrap),
  history: (subject: 'MENU' | 'SETTING' | 'FAQ', key: string) =>
    apiClient.get<Envelope<RevisionListItem[]>>(`${BASE}/history`, { params: { subject, key } }).then(unwrap),

  // FAQs (8.3)
  faqs: (params: { locale?: string; topic?: string; status?: CmsStatus; q?: string; page?: number; limit?: number } = {}) =>
    apiClient.get<Envelope<Paginated<AdminFaq>>>(`${BASE}/faqs`, { params: clean(params) }).then(unwrap),
  createFaq: (body: CreateFaqBody) => apiClient.post<Envelope<AdminFaq>>(`${BASE}/faqs`, body).then(unwrap),
  patchFaq: (id: string, body: PatchFaqBody) => apiClient.patch<Envelope<AdminFaq>>(`${BASE}/faqs/${id}`, body).then(unwrap),
  publishFaq: (id: string) => apiClient.post<Envelope<FaqMutationResponse>>(`${BASE}/faqs/${id}/publish`).then(unwrap),
  unpublishFaq: (id: string) => apiClient.post<Envelope<FaqMutationResponse>>(`${BASE}/faqs/${id}/unpublish`).then(unwrap),
  deleteFaq: (id: string) => apiClient.delete(`${BASE}/faqs/${id}`).then(() => undefined),
  faqTopics: () => apiClient.get<Envelope<FaqTopic[]>>(`${BASE}/faqs/topics`).then(unwrap),

  // Media (8.4)
  media: (params: { kind?: string; tag?: string; q?: string; unused?: boolean; page?: number; limit?: number } = {}) =>
    apiClient.get<Envelope<Paginated<AdminMedia>>>(`${BASE}/media`, { params: clean(params) }).then(unwrap),
  uploadMedia: (form: FormData) =>
    apiClient
      .post<Envelope<AdminMedia>>(`${BASE}/media`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(unwrap),
  patchMedia: (id: string, body: PatchMediaBody) => apiClient.patch<Envelope<AdminMedia>>(`${BASE}/media/${id}`, body).then(unwrap),
  replaceMedia: (id: string, form: FormData) =>
    apiClient
      .post<Envelope<AdminMedia>>(`${BASE}/media/${id}/replace`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(unwrap),
  mediaUsage: (id: string) => apiClient.get<Envelope<MediaUsage>>(`${BASE}/media/${id}/usage`).then(unwrap),
  deleteMedia: (id: string) => apiClient.delete(`${BASE}/media/${id}`).then(() => undefined),

  // Redirects (8.5)
  redirects: (params: { q?: string; source?: string; active?: boolean; pattern?: boolean; page?: number; limit?: number } = {}) =>
    apiClient.get<Envelope<Paginated<AdminRedirect>>>(`${BASE}/redirects`, { params: clean(params) }).then(unwrap),
  createRedirect: (body: CreateRedirectBody) => apiClient.post<Envelope<AdminRedirect>>(`${BASE}/redirects`, body).then(unwrap),
  patchRedirect: (id: string, body: PatchRedirectBody) =>
    apiClient.patch<Envelope<AdminRedirect>>(`${BASE}/redirects/${id}`, body).then(unwrap),
  deleteRedirect: (id: string) => apiClient.delete(`${BASE}/redirects/${id}`).then(() => undefined),
  importRedirects: (body: RedirectImportBody) =>
    apiClient.post<Envelope<RedirectImportResult>>(`${BASE}/redirects/import`, body).then(unwrap),
  exportRedirectsUrl: () => `${BASE}/redirects/export`,
  testRedirect: (path: string) =>
    apiClient.get<Envelope<RedirectTestResult>>(`${BASE}/redirects/test`, { params: { path } }).then(unwrap),

  // Menus (8.6)
  menus: (locale?: string) => apiClient.get<Envelope<AdminMenu[]>>(`${BASE}/menus`, { params: clean({ locale }) }).then(unwrap),
  menu: (key: string, locale?: string) =>
    apiClient.get<Envelope<AdminMenuDetail>>(`${BASE}/menus/${key}`, { params: clean({ locale }) }).then(unwrap),
  putMenu: (key: string, body: PutMenuBody) => apiClient.put<Envelope<AdminMenu>>(`${BASE}/menus/${key}`, body).then(unwrap),

  // Settings (8.7)
  settings: (locale?: string) =>
    apiClient.get<Envelope<SettingsBundle>>(`${BASE}/settings`, { params: clean({ locale }) }).then(unwrap),
  putSetting: (key: SettingKey, value: unknown, locale?: string) =>
    apiClient.put<Envelope<PutSettingResponse>>(`${BASE}/settings/${key}`, { value, ...clean({ locale }) }).then(unwrap),
  llmsPreview: () => apiClient.get<Envelope<LlmsPreviewResponse>>(`${BASE}/settings/preview/llms`).then(unwrap),

  // Customers and testimonials (8.8)
  customers: (params: { q?: string; public?: boolean; page?: number; limit?: number } = {}) =>
    apiClient.get<Envelope<Paginated<AdminCustomer>>>(`${BASE}/customers`, { params: clean(params) }).then(unwrap),
  createCustomer: (body: CreateCustomerBody) => apiClient.post<Envelope<AdminCustomer>>(`${BASE}/customers`, body).then(unwrap),
  patchCustomer: (id: string, body: PatchCustomerBody) =>
    apiClient.patch<Envelope<AdminCustomer>>(`${BASE}/customers/${id}`, body).then(unwrap),
  customerConsent: (id: string, body: CustomerConsentBody) =>
    apiClient.post<Envelope<AdminCustomer>>(`${BASE}/customers/${id}/consent`, body).then(unwrap),
  customerVisibility: (id: string, isPublic: boolean) =>
    apiClient.post<Envelope<AdminCustomer>>(`${BASE}/customers/${id}/visibility`, { isPublic }).then(unwrap),
  deleteCustomer: (id: string) => apiClient.delete(`${BASE}/customers/${id}`).then(() => undefined),
  testimonials: (params: { customerId?: string; status?: CmsStatus; page?: number; limit?: number } = {}) =>
    apiClient.get<Envelope<Paginated<AdminTestimonial>>>(`${BASE}/testimonials`, { params: clean(params) }).then(unwrap),
  createTestimonial: (body: CreateTestimonialBody) =>
    apiClient.post<Envelope<AdminTestimonial>>(`${BASE}/testimonials`, body).then(unwrap),
  patchTestimonial: (id: string, body: PatchTestimonialBody) =>
    apiClient.patch<Envelope<AdminTestimonial>>(`${BASE}/testimonials/${id}`, body).then(unwrap),
  publishTestimonial: (id: string) =>
    apiClient.post<Envelope<AdminTestimonial>>(`${BASE}/testimonials/${id}/publish`).then(unwrap),
  unpublishTestimonial: (id: string) =>
    apiClient.post<Envelope<AdminTestimonial>>(`${BASE}/testimonials/${id}/unpublish`).then(unwrap),
  deleteTestimonial: (id: string) => apiClient.delete(`${BASE}/testimonials/${id}`).then(() => undefined),
};

/** Shared React Query keys for the CMS screens. */
export const cmsKeys = {
  config: ['cms', 'config'] as const,
  entries: (params: EntriesListParams) => ['cms', 'entries', params] as const,
  entriesAll: ['cms', 'entries'] as const,
  entry: (id: string) => ['cms', 'entry', id] as const,
  revisions: (id: string) => ['cms', 'revisions', id] as const,
  inbound: (id: string) => ['cms', 'inbound', id] as const,
  suggestions: (id: string) => ['cms', 'suggestions', id] as const,
  lookup: (q: string, types?: string) => ['cms', 'lookup', q, types ?? ''] as const,
  faqs: (params: object) => ['cms', 'faqs', params] as const,
  media: (params: object) => ['cms', 'media', params] as const,
};
