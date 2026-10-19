import { apiClient } from '@core/api/client';

export interface BundleItem {
  productId: string;
  quantity: number;
  /** Normal price of one piece. */
  unitPrice: number;
  /** Stock of the product in the branch in view. */
  stock?: number;
  /** Serial/IMEI product: sold from a bundle without a serial on the bill. */
  serial?: boolean;
  warrantyMonths?: number;
  product?: {
    id: string; name: string; sku?: string | null; unit?: string;
    price?: number; costPrice?: number; stock?: number; isActive?: boolean; imageUrl?: string | null;
  } | null;
}

export interface ElectronicsBundle {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  items: BundleItem[];
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  savingsPct: number;
  isFeatured: boolean;
  isActive: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  /** Live figures from the server. */
  cost?: number;
  profit?: number;
  canMake?: number;
  soldBills?: number;
  expired?: boolean;
  upcoming?: boolean;
  broken?: boolean;
  sellable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BundlePayload {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
  bundlePrice: number;
  isFeatured?: boolean;
  isActive?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const electronicsBundlesApi = {
  create: (data: BundlePayload) =>
    apiClient.post('/electronics/bundles', data).then(unwrap<ElectronicsBundle>),

  list: (params?: { active?: boolean; featured?: boolean; search?: string }) =>
    apiClient.get('/electronics/bundles', { params }).then(unwrap<ElectronicsBundle[]>),

  getOne: (id: string) =>
    apiClient.get('/electronics/bundles/' + id).then(unwrap<ElectronicsBundle>),

  update: (id: string, data: Partial<BundlePayload>) =>
    apiClient.patch('/electronics/bundles/' + id, data).then(unwrap<ElectronicsBundle>),

  /** A sold bundle is switched off instead of removed (`archived`). */
  remove: (id: string) =>
    apiClient.delete('/electronics/bundles/' + id).then(unwrap<{ id: string; archived: boolean }>),
};
