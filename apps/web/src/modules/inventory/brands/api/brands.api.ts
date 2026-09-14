import { apiClient } from '@core/api/client';

export interface Brand {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  isActive: boolean;

  /* ── Dealer / after-sales ──────────────────────────────────
     Pehle ye electronics ke apne brand table par the. Ab global
     Brand par hain — har industry (electronics, appliances,
     mobile) inhe use kar sakti hai.                            */
  countryOfOrigin?: string | null;
  authorizedDealer?: boolean;
  dealerCode?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
  warrantyPolicy?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;

  /* ── Appliances ────────────────────────────────────────────
     ApplianceBrand ko yahin mila diya gaya (2026-09-14). AC aur
     geyser wale brand ke liye ye teen baatein matter karti hain. */
  serviceCenter?: string | null;
  installationIncluded?: boolean;
  demoIncluded?: boolean;

  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface UpsertBrandPayload {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  isActive?: boolean;

  countryOfOrigin?: string;
  authorizedDealer?: boolean;
  dealerCode?: string;
  supportPhone?: string;
  supportEmail?: string;
  warrantyPolicy?: string;
  isFeatured?: boolean;
  displayOrder?: number;
  serviceCenter?: string;
  installationIncluded?: boolean;
  demoIncluded?: boolean;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const brandsApi = {
  list: (search?: string) =>
    apiClient.get<{ data: Brand[] }>('/brands', { params: { search } }).then(unwrap),
  getOne: (id: string) =>
    apiClient.get<{ data: Brand }>(`/brands/${id}`).then(unwrap),
  create: (payload: UpsertBrandPayload) =>
    apiClient.post<{ data: Brand }>('/brands', payload).then(unwrap),
  update: (id: string, payload: UpsertBrandPayload) =>
    apiClient.patch<{ data: Brand }>(`/brands/${id}`, payload).then(unwrap),
  remove: (id: string) =>
    apiClient.delete<{ data: any }>(`/brands/${id}`).then(unwrap),
};
