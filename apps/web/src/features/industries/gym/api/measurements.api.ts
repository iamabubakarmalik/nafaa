import { apiClient } from '@/api/client';

export interface BodyMeasurement {
  id: string;
  memberId: string;
  measurementDate: string;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  bodyFatPct?: number;
  muscleMassPct?: number;
  visceralFat?: number;
  waterPct?: number;
  boneMassKg?: number;
  metabolicAge?: number;
  bmr?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  bicepsCm?: number;
  thighsCm?: number;
  calvesCm?: number;
  neckCm?: number;
  shouldersCm?: number;
  forearmsCm?: number;
  bloodPressure?: string;
  restingHeartRate?: number;
  frontPhotoUrl?: string;
  sidePhotoUrl?: string;
  backPhotoUrl?: string;
  notes?: string;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const measurementsApi = {
  create: (data: Partial<BodyMeasurement> & { memberId: string }) => apiClient.post('/gym/measurements', data).then(unwrap<BodyMeasurement>),
  byMember: (memberId: string) => apiClient.get('/gym/measurements/by-member/' + memberId).then(unwrap<BodyMeasurement[]>),
  progress: (memberId: string) => apiClient.get('/gym/measurements/progress/' + memberId).then(unwrap<any>),
  remove: (id: string) => apiClient.delete('/gym/measurements/' + id).then(unwrap),
};
