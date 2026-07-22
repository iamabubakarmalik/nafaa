import { apiClient } from '@core/api/client';

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  services: any;
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
  usageLog?: any;
  notes?: string;
  package?: Package;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const packagesApi = {
  create: (data: Partial<Package>) => apiClient.post('/salon/packages', data).then(unwrap<Package>),
  list: (params?: any) => apiClient.get('/salon/packages', { params }).then(unwrap<Package[]>),
  update: (id: string, data: Partial<Package>) => apiClient.patch('/salon/packages/' + id, data).then(unwrap<Package>),
  remove: (id: string) => apiClient.delete('/salon/packages/' + id).then(unwrap),

  purchase: (data: { packageId: string; customerId: string; amountPaid: number; notes?: string }) =>
    apiClient.post('/salon/packages/purchase', data).then(unwrap<PackagePurchase>),
  purchases: (params?: { status?: string; customerId?: string }) =>
    apiClient.get('/salon/packages/purchases/list', { params }).then(unwrap<PackagePurchase[]>),
  useSession: (id: string, appointmentId: string) =>
    apiClient.post('/salon/packages/purchases/' + id + '/use', { appointmentId }).then(unwrap<PackagePurchase>),
};
