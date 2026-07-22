import { apiClient } from '@core/api/client';

export interface DrugInteraction {
  id: string;
  saltAId: string;
  saltBId: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
  description: string;
  clinicalEffect?: string;
  management?: string;
  isActive: boolean;
  saltA?: any;
  saltB?: any;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const interactionsApi = {
  create: (data: Partial<DrugInteraction>) =>
    apiClient.post('/pharmacy/drug-interactions', data).then(unwrap<DrugInteraction>),
  list: (params?: { severity?: string; saltId?: string }) =>
    apiClient.get('/pharmacy/drug-interactions', { params }).then(unwrap<DrugInteraction[]>),
  check: (saltIds: string[]) =>
    apiClient.post('/pharmacy/drug-interactions/check', { saltIds }).then(unwrap<{ interactions: DrugInteraction[]; hasWarnings: boolean; hasMajor: boolean }>),
  update: (id: string, data: Partial<DrugInteraction>) =>
    apiClient.patch('/pharmacy/drug-interactions/' + id, data).then(unwrap<DrugInteraction>),
  remove: (id: string) => apiClient.delete('/pharmacy/drug-interactions/' + id).then(unwrap),
};
