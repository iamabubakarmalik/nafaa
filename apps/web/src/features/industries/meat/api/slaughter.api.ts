import { apiClient } from '@/api/client';

export interface SlaughterLog {
  id: string;
  slaughterNumber: string;
  liveAnimalId?: string;
  animalType: string;
  animalTag?: string;
  slaughterDate: string;
  slaughterTime?: string;
  slaughterMethod: string;
  slaughteredBy?: string;
  slaughtererId?: string;
  slaughtererCertNumber?: string;
  witnessedBy?: string;
  liveWeightKg: number;
  dressedWeightKg?: number;
  yieldPct?: number;
  facilityName?: string;
  facilityLicense?: string;
  facilityAddress?: string;
  isHalal: boolean;
  halalCertNumber?: string;
  religiousAuthority?: string;
  vetInspection: boolean;
  vetInspectorName?: string;
  vetCertNumber?: string;
  postMortemNotes?: string;
  qualityGrade?: string;
  temperature?: number;
  storageLocation?: string;
  photoUrls: string[];
  documentUrls: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const slaughterApi = {
  create: (data: Partial<SlaughterLog>) => apiClient.post('/meat/slaughter', data).then(unwrap<SlaughterLog>),
  list: (params?: any) => apiClient.get('/meat/slaughter', { params }).then(unwrap<SlaughterLog[]>),
  halalCompliance: (from?: string, to?: string) => apiClient.get('/meat/slaughter/halal-compliance', { params: { from, to } }).then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/meat/slaughter/' + id).then(unwrap<SlaughterLog>),
  update: (id: string, data: Partial<SlaughterLog>) => apiClient.patch('/meat/slaughter/' + id, data).then(unwrap<SlaughterLog>),
};
