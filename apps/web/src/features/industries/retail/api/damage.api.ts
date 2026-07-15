import { apiClient } from '@/api/client';

export type DamageStatus = 'REPORTED' | 'APPROVED' | 'REJECTED' | 'WRITTEN_OFF';
export type DamageReasonCode =
  | 'EXPIRY' | 'BREAKAGE' | 'SPOILAGE' | 'PEST_DAMAGE' | 'WATER_DAMAGE'
  | 'THEFT' | 'MISHANDLING' | 'MANUFACTURING_DEFECT' | 'OTHER';

export interface DamageLog {
  id: string;
  damageNumber: string;
  shopId?: string;
  productId: string;
  variantId?: string;
  batchId?: string;
  unitId?: string;
  reportedById: string;
  approvedById?: string;
  quantity: number;
  unitCost: number;
  costImpact: number;
  salvageValue: number;
  netLoss: number;
  reason: string;
  reasonCode: DamageReasonCode;
  photos: string[];
  notes?: string;
  supplierClaim: boolean;
  claimStatus?: string;
  claimAmount: number;
  status: DamageStatus;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  product?: any;
  variant?: any;
  batch?: any;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const damageApi = {
  create: (data: Partial<DamageLog>) =>
    apiClient.post('/retail/damage', data).then(unwrap<DamageLog>),

  list: (params?: {
    status?: string;
    shopId?: string;
    reasonCode?: string;
    from?: string;
    to?: string;
  }) => apiClient.get('/retail/damage', { params }).then(unwrap<DamageLog[]>),

  getOne: (id: string) =>
    apiClient.get('/retail/damage/' + id).then(unwrap<DamageLog>),

  approve: (id: string, notes?: string) =>
    apiClient.post('/retail/damage/' + id + '/approve', { notes }).then(unwrap<DamageLog>),

  reject: (id: string, reason?: string) =>
    apiClient.post('/retail/damage/' + id + '/reject', { reason }).then(unwrap<DamageLog>),

  summary: (params?: { from?: string; to?: string }) =>
    apiClient.get('/retail/damage/summary', { params }).then(unwrap<any>),
};
