/**
 * Booker endpoints under /api/distribution/booker. The transport is passed
 * in (axios apiClient in the app, fetch in the verification script); it
 * must return the unwrapped `data` of the `{ success, data }` envelope.
 */

import type {
  BootCustomer, BootProduct, CollectionPayload, DaySummary, Manifest, OrderPayload, Page, PriceListPage,
  SyncResponse, VisitPayload,
} from './types';

export interface Http {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

/** Thrown by transports for HTTP answers; `status` 0 means no network. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const isOffline = (e: unknown) => e instanceof HttpError && e.status === 0;

const BASE = '/distribution/booker';

export const bookerApi = (http: Http) => ({
  manifest: () => http.get<Manifest>(`${BASE}/bootstrap`),
  customers: (q: { updatedSince?: string; cursor?: string; limit?: number }) =>
    http.get<Page<BootCustomer>>(`${BASE}/bootstrap`, { entity: 'customers', ...q }),
  products: (q: { updatedSince?: string; cursor?: string; limit?: number }) =>
    http.get<Page<BootProduct>>(`${BASE}/bootstrap`, { entity: 'products', ...q }),
  priceListItems: (q: { priceListId: string; cursor?: string; limit?: number }) =>
    http.get<PriceListPage>(`${BASE}/bootstrap`, { entity: 'priceListItems', ...q }),
  sync: (body: { orders?: OrderPayload[]; visits?: VisitPayload[]; collections?: CollectionPayload[] }) =>
    http.post<SyncResponse>(`${BASE}/sync`, body),
  summary: (date?: string) => http.get<DaySummary>(`${BASE}/summary`, date ? { date } : undefined),
});
