import { apiClient } from '@core/api/client';

export interface SeasonalPlan {
  id: string;
  season: string;
  year: number;
  cropName: string;
  sowingStart: string;
  sowingEnd: string;
  harvestStart: string;
  harvestEnd: string;
  /** Products for the crop: [{ productId, name, perAcre, unit }] (older rows may differ). */
  recommendedProducts?: unknown;
  /** Spray / fertilizer calendar: [{ day, what }]. */
  applicationSchedule?: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanInput {
  season: string; year: number; cropName: string; sowingStart: string; sowingEnd: string; harvestStart: string; harvestEnd: string;
  recommendedProducts?: Array<{ productId?: string; name: string; perAcre: number; unit: string }>; applicationSchedule?: Array<{ day: number; what: string }>; isActive?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const seasonalPlansApi = {
  create: (data: PlanInput) => apiClient.post('/agri/seasonal-plans', data).then(unwrap<SeasonalPlan>),
  list: (params?: { season?: string; year?: number; active?: boolean }) => apiClient.get('/agri/seasonal-plans', { params }).then(unwrap<SeasonalPlan[]>),
  update: (id: string, data: Partial<PlanInput>) => apiClient.patch('/agri/seasonal-plans/' + id, data).then(unwrap<SeasonalPlan>),
  remove: (id: string) => apiClient.delete('/agri/seasonal-plans/' + id).then(unwrap),
};
