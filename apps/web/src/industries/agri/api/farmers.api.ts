import { apiClient } from '@core/api/client';

export type FarmerStatus = 'ACTIVE' | 'SUSPENDED' | 'DEFAULTED' | 'CLOSED' | 'PENDING_APPROVAL';

export interface Farmer {
  id: string;
  customerId?: string;
  farmerNumber: string;
  fullName: string;
  fatherName?: string;
  cnic?: string;
  phone: string;
  altPhone?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  province?: string;
  address?: string;
  landmark?: string;
  landAreaAcres?: number;
  landAreaKanals?: number;
  landOwnership?: string;
  soilType?: string;
  waterSource?: string;
  irrigationType?: string;
  farmingType: string[];
  primaryCrops: string[];
  livestock?: any;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  landDocUrl?: string;
  photoUrl?: string;
  creditLimit: number;
  currentBalance: number;
  creditDays: number;
  interestRate: number;
  currentSeason?: string;
  currentCrop?: string;
  totalOrders: number;
  totalPurchases: number;
  totalOutstanding: number;
  totalPaid: number;
  lastPurchaseAt?: string;
  status: FarmerStatus;
  registeredAt: string;
  suspendedAt?: string;
  suspensionReason?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const farmersApi = {
  create: (data: Partial<Farmer>) => apiClient.post('/agri/farmers', data).then(unwrap<Farmer>),
  list: (params?: any) => apiClient.get('/agri/farmers', { params }).then(unwrap<Farmer[]>),
  overdue: () => apiClient.get('/agri/farmers/overdue').then(unwrap<Farmer[]>),
  summary: () => apiClient.get('/agri/farmers/summary').then(unwrap<any>),
  byCustomer: (customerId: string) => apiClient.get('/agri/farmers/by-customer/' + customerId).then(unwrap<Farmer | null>),
  getOne: (id: string) => apiClient.get('/agri/farmers/' + id).then(unwrap<Farmer>),
  update: (id: string, data: Partial<Farmer>) => apiClient.patch('/agri/farmers/' + id, data).then(unwrap<Farmer>),
  suspend: (id: string, reason: string) => apiClient.post('/agri/farmers/' + id + '/suspend', { reason }).then(unwrap<Farmer>),
  reactivate: (id: string) => apiClient.post('/agri/farmers/' + id + '/reactivate').then(unwrap<Farmer>),
  purchase: (id: string, amount: number) => apiClient.post('/agri/farmers/' + id + '/purchase', { amount }).then(unwrap<Farmer>),
  payment: (id: string, amount: number) => apiClient.post('/agri/farmers/' + id + '/payment', { amount }).then(unwrap<Farmer>),
  remove: (id: string) => apiClient.delete('/agri/farmers/' + id).then(unwrap),
};
