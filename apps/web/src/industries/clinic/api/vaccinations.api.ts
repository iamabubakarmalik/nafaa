import { apiClient } from '@core/api/client';

export interface Vaccination {
  id: string;
  patientId: string;
  vaccineName: string;
  vaccineCode?: string;
  scheduleName?: string;
  doseNumber?: number;
  dueDate: string;
  administeredAt?: string;
  administeredBy?: string;
  batchNumber?: string;
  manufacturer?: string;
  expiryDate?: string;
  siteAdministered?: string;
  routeAdministered?: string;
  status: 'DUE' | 'ADMINISTERED' | 'DELAYED' | 'SKIPPED' | 'CONTRAINDICATED';
  adverseReactions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type VaccinationRow = Vaccination & {
  patient: { id: string; fullName: string; mrn: string; phonePrimary?: string | null; dateOfBirth?: string | null; motherName?: string | null; gender?: string | null } | null;
};

const unwrap = <T,>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const vaccinationsApi = {
  schedule: (data: { patientId: string; vaccineName: string; dueDate: string; doseNumber?: number; notes?: string }) => apiClient.post('/clinic/vaccinations', data).then(unwrap<Vaccination>),
  /** Adds the EPI doses the child does not have yet. */
  bulkEpi: (patientId: string, birthDate?: string) => apiClient.post('/clinic/vaccinations/bulk-epi', { patientId, birthDate }).then(unwrap<{ added: number }>),
  administer: (id: string, data: { batchNumber?: string; manufacturer?: string; siteAdministered?: string; routeAdministered?: string; administeredBy?: string; expiryDate?: string; adverseReactions?: string }) =>
    apiClient.post('/clinic/vaccinations/' + id + '/administer', data).then(unwrap<Vaccination>),
  setStatus: (id: string, body: { status: Vaccination['status']; notes?: string; dueDate?: string }) => apiClient.patch('/clinic/vaccinations/' + id + '/status', body).then(unwrap<Vaccination>),
  list: (params?: Record<string, unknown>) => apiClient.get('/clinic/vaccinations', { params }).then(unwrap<VaccinationRow[]>),
  page: (params: Record<string, unknown>) => apiClient.get('/clinic/vaccinations', { params: { page: 1, ...params } })
    .then(unwrap<{ items: VaccinationRow[]; total: number; page: number; limit: number; summary: { overdue: number; thisWeek: number; givenThisMonth: number } }>),
};
