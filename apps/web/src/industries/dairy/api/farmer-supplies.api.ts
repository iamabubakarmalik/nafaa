import { apiClient } from '@core/api/client';

export type DeliverySlot = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export interface FarmerSupply {
  id: string;
  farmerId: string;
  supplyDate: string;
  slot: DeliverySlot;
  quantity: number;
  unit: string;
  fatContent?: number;
  snfContent?: number;
  quality?: string;
  ratePerLiter: number;
  fatBonus: number;
  otherAdjustment: number;
  totalAmount: number;
  isPaid: boolean;
  paidAt?: string;
  notes?: string;
  farmer?: { id: string; name: string; farmerNumber: string; village?: string | null; phone?: string | null } | null;
  createdAt: string;
}

export interface SupplySummary {
  date: string; totalSupplies: number; totalLiters: number; totalAmount: number; averageRate: number; averageFat: number | null;
  morningLiters: number; eveningLiters: number; farmersCount: number;
}

/** Notes of a cancelled slip start with this. */
export const isCancelledSupply = (s: Pick<FarmerSupply, 'notes'>) => !!s.notes?.startsWith('CANCELLED:');

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const farmerSuppliesApi = {
  entries: (params: { from?: string; to?: string; slot?: string; farmerId?: string; quality?: string; search?: string }) =>
    apiClient.get('/dairy/farmer-supplies', { params }).then(unwrap<FarmerSupply[]>),
  summary: (date?: string) => apiClient.get('/dairy/farmer-supplies/daily-summary', { params: { date } }).then(unwrap<SupplySummary>),
  add: (data: { farmerId: string; supplyDate?: string; slot?: string; quantity: number; fatContent?: number; snfContent?: number; quality?: string; ratePerLiter?: number; otherAdjustment?: number; notes?: string }) =>
    apiClient.post('/dairy/farmer-supplies', data).then(unwrap<FarmerSupply & { stockProduct?: { id: string; name: string } | null }>),
  pay: (id: string, pay: { paymentMethod?: string; accountId?: string } = {}) => apiClient.post('/dairy/farmer-supplies/' + id + '/mark-paid', pay).then(unwrap<FarmerSupply>),
  cancel: (id: string, reason?: string) => apiClient.post('/dairy/farmer-supplies/' + id + '/cancel', { reason }).then(unwrap<FarmerSupply>),
  create: (data: any) => apiClient.post('/dairy/farmer-supplies', data).then(unwrap<FarmerSupply>),
  list: (params?: any) => apiClient.get('/dairy/farmer-supplies', { params }).then(unwrap<FarmerSupply[]>),
  byFarmer: (farmerId: string, params?: { from?: string; to?: string }) =>
    apiClient.get('/dairy/farmer-supplies/by-farmer/' + farmerId, { params }).then(unwrap<FarmerSupply[]>),
  remove: (id: string) => apiClient.delete('/dairy/farmer-supplies/' + id).then(unwrap),
};
