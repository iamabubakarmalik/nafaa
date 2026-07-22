import { apiClient } from '@core/api/client';

export type MetalType = 'GOLD' | 'SILVER' | 'PLATINUM' | 'PALLADIUM' | 'ROSE_GOLD' | 'WHITE_GOLD' | 'IMITATION' | 'MIXED' | 'OTHER';

export type Purity = 'KARAT_24' | 'KARAT_22' | 'KARAT_21' | 'KARAT_18' | 'KARAT_14' | 'KARAT_10' | 'KARAT_9'
  | 'STERLING_925' | 'SILVER_999' | 'SILVER_925' | 'SILVER_800' | 'PLATINUM_950' | 'PLATINUM_900' | 'OTHER';

export interface MetalRate {
  id: string;
  metalType: MetalType;
  purity: Purity;
  ratePerGram: number;
  ratePerTola?: number;
  ratePerOunce?: number;
  buyRate?: number;
  sellRate?: number;
  effectiveDate: string;
  source?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const metalRatesApi = {
  create: (data: Partial<MetalRate>) => apiClient.post('/jewelry/metal-rates', data).then(unwrap<MetalRate>),
  current: () => apiClient.get('/jewelry/metal-rates/current').then(unwrap<MetalRate[]>),
  history: (params?: any) => apiClient.get('/jewelry/metal-rates/history', { params }).then(unwrap<MetalRate[]>),
  getCurrent: (metalType: string, purity: string) => apiClient.get('/jewelry/metal-rates/current/' + metalType + '/' + purity).then(unwrap<MetalRate | null>),
  movement: (metalType: string, purity: string, days?: number) => apiClient.get('/jewelry/metal-rates/movement/' + metalType + '/' + purity, { params: { days } }).then(unwrap<any>),
  update: (id: string, data: Partial<MetalRate>) => apiClient.patch('/jewelry/metal-rates/' + id, data).then(unwrap<MetalRate>),
  remove: (id: string) => apiClient.delete('/jewelry/metal-rates/' + id).then(unwrap),
};
