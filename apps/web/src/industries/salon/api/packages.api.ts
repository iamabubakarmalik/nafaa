import { apiClient } from '@core/api/client';

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  /** Service ids the sessions can be used on; empty means any service. */
  services: string[];
  totalSessions: number;
  validityDays: number;
  imageUrl?: string;
  isFeatured: boolean;
  isActive: boolean;
  totalSold: number;
  createdAt: string;
  updatedAt: string;
}

export interface PackagePurchase {
  id: string;
  packageId: string;
  customerId: string;
  purchaseNumber: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  purchaseDate: string;
  expiryDate: string;
  amountPaid: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  usageLog?: Array<{ appointmentNumber?: string; serviceName?: string; staffName?: string | null; usedAt: string; voided?: boolean }> | null;
  notes?: string;
  package?: Package;
  customer?: { id: string; name: string; phone?: string | null; balance?: number } | null;
  sale?: { saleNumber: string; status: string; total: number; creditAmount: number } | null;
  createdAt: string;
  updatedAt: string;
}

export type PackageInput = Pick<Package, 'name' | 'price' | 'services' | 'totalSessions' | 'validityDays' | 'isFeatured' | 'isActive'>
  & { description?: string; originalPrice?: number | null };

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const packagesApi = {
  create: (data: PackageInput) => apiClient.post('/salon/packages', data).then(unwrap<Package>),
  list: (params?: { active?: boolean; featured?: boolean }) => apiClient.get('/salon/packages', { params }).then(unwrap<Package[]>),
  update: (id: string, data: Partial<PackageInput>) => apiClient.patch('/salon/packages/' + id, data).then(unwrap<Package>),

  purchase: (data: { packageId: string; customerId: string; amountPaid: number; paymentMethod?: string; notes?: string }) =>
    apiClient.post('/salon/packages/purchase', data).then(unwrap<PackagePurchase>),
  purchases: (params?: { status?: string; customerId?: string; search?: string }) =>
    apiClient.get('/salon/packages/purchases/list', { params }).then(unwrap<PackagePurchase[]>),
  cancelPurchase: (id: string, reason?: string) =>
    apiClient.post('/salon/packages/purchases/' + id + '/cancel', { reason }).then(unwrap<PackagePurchase>),
};
