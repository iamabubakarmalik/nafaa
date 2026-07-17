import { apiClient } from '@/api/client';

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
  farmer?: any;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const farmerSuppliesApi = {
  create: (data: any) => apiClient.post('/dairy/farmer-supplies', data).then(unwrap<FarmerSupply>),
  list: (params?: any) => apiClient.get('/dairy/farmer-supplies', { params }).then(unwrap<FarmerSupply[]>),
  dailySummary: (date?: string) => apiClient.get('/dairy/farmer-supplies/daily-summary', { params: { date } }).then(unwrap<any>),
  byFarmer: (farmerId: string, params?: { from?: string; to?: string }) =>
    apiClient.get('/dairy/farmer-supplies/by-farmer/' + farmerId, { params }).then(unwrap<FarmerSupply[]>),
  markPaid: (id: string) => apiClient.post('/dairy/farmer-supplies/' + id + '/mark-paid').then(unwrap<FarmerSupply>),
  remove: (id: string) => apiClient.delete('/dairy/farmer-supplies/' + id).then(unwrap),
};
