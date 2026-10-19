import { apiClient } from '@core/api/client';

export type BillingCycle = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface DairyFarmer {
  id: string;
  farmerNumber: string;
  name: string;
  fatherName?: string;
  cnic?: string;
  phone?: string;
  address?: string;
  village?: string;
  city?: string;
  cattleCount?: number;
  buffaloCount?: number;
  cowCount?: number;
  goatCount?: number;
  totalCapacityLiters?: number;
  ratePerLiter: number;
  fatBonusRate: number;
  paymentCycle: BillingCycle;
  currentBalance: number;
  totalSupplied: number;
  totalPaid: number;
  avgFatContent?: number;
  avgSnfContent?: number;
  qualityRating?: number;
  lastSupplyDate?: string;
  lastPaymentDate?: string;
  photoUrl?: string;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  notes?: string;
  isActive: boolean;
  recentSupplies?: import('./farmer-supplies.api').FarmerSupply[];
  cashPayments?: Array<{ id: string; amount: number; reason: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export interface FarmerInput {
  name: string; fatherName?: string; cnic?: string; phone?: string; address?: string; village?: string; city?: string;
  buffaloCount?: number; cowCount?: number; totalCapacityLiters?: number; ratePerLiter?: number; fatBonusRate?: number;
  paymentCycle?: BillingCycle; notes?: string; isActive?: boolean;
}
export interface FarmerSummary { totalFarmers: number; activeFarmers: number; totalPayable: number; lifetimeSupplied: number; lifetimePaid: number }

export const farmersApi = {
  all: (params: { search?: string; active?: boolean }) => apiClient.get('/dairy/farmers', { params }).then(unwrap<DairyFarmer[]>),
  totals: () => apiClient.get('/dairy/farmers/summary').then(unwrap<FarmerSummary>),
  save: (id: string | undefined, data: Partial<FarmerInput>) => (id
    ? apiClient.patch('/dairy/farmers/' + id, data) : apiClient.post('/dairy/farmers', data)).then(unwrap<DairyFarmer>),
  create: (data: Partial<DairyFarmer>) => apiClient.post('/dairy/farmers', data).then(unwrap<DairyFarmer>),
  list: (params?: any) => apiClient.get('/dairy/farmers', { params }).then(unwrap<DairyFarmer[]>),
  summary: () => apiClient.get('/dairy/farmers/summary').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/dairy/farmers/' + id).then(unwrap<DairyFarmer>),
  update: (id: string, data: Partial<DairyFarmer>) => apiClient.patch('/dairy/farmers/' + id, data).then(unwrap<DairyFarmer>),
  payment: (id: string, data: { amount: number; paymentMethod?: string; reference?: string; notes?: string }) =>
    apiClient.post('/dairy/farmers/' + id + '/payments', data).then(unwrap<DairyFarmer>),
  remove: (id: string) => apiClient.delete('/dairy/farmers/' + id).then(unwrap),
};
