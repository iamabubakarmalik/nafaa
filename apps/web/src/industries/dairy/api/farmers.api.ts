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
  /** Every payment, newest first (bank, JazzCash and drawer cash). */
  payments?: FarmerPaymentLine[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export interface FarmerInput {
  name: string; fatherName?: string; cnic?: string; phone?: string; address?: string; village?: string; city?: string;
  buffaloCount?: number; cowCount?: number; totalCapacityLiters?: number; ratePerLiter?: number; fatBonusRate?: number;
  paymentCycle?: BillingCycle; notes?: string; isActive?: boolean;
}
export interface FarmerPaymentLine {
  id: string; date: string; amount: number; method: string;
  /** Account the money left from; null for drawer cash. */
  accountName: string | null; reference: string | null; note: string | null;
  /** Cash paid before payments were recorded on their own. */
  legacy: boolean;
}
export interface FarmerPayInput { amount: number; paymentMethod: string; accountId?: string; reference?: string; notes?: string }
export interface PayAccount { id: string; name: string; kind: string; method: string | null; isDefault: boolean; shopName: string | null }
export interface FarmerStatement {
  farmer: { id: string; name: string; farmerNumber: string; phone?: string | null; village?: string | null; ratePerLiter: number };
  from: string; to: string; opening: number; unrecorded: number; liters: number; milkIn: number; paidOut: number; closing: number; currentBalance: number;
  lines: Array<{ date: string; kind: 'MILK' | 'PAYMENT'; text: string; quantity: number | null; fat: number | null; rate: number | null; milk: number; paid: number; balance: number }>;
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
  payment: (id: string, data: FarmerPayInput) => apiClient.post('/dairy/farmers/' + id + '/payments', data).then(unwrap<DairyFarmer>),
  statement: (id: string, params: { from: string; to: string }) => apiClient.get('/dairy/farmers/' + id + '/statement', { params }).then(unwrap<FarmerStatement>),
  payAccounts: () => apiClient.get('/dairy/farmers/pay-accounts').then(unwrap<PayAccount[]>),
  remove: (id: string) => apiClient.delete('/dairy/farmers/' + id).then(unwrap),
};
