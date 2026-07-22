import { apiClient } from '@core/api/client';

export interface Vitals {
  id: string;
  appointmentId: string;
  patientId: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  temperatureC?: number;
  temperatureF?: number;
  spo2?: number;
  bloodSugar?: number;
  bloodSugarType?: string;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  headCircumferenceCm?: number;
  waistCm?: number;
  painScore?: number;
  glasgowScore?: number;
  recordedAt: string;
  notes?: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const vitalsApi = {
  record: (appointmentId: string, data: Partial<Vitals>) => apiClient.post('/clinic/vitals/appointment/' + appointmentId, data).then(unwrap<Vitals>),
  byAppointment: (appointmentId: string) => apiClient.get('/clinic/vitals/appointment/' + appointmentId).then(unwrap<Vitals | null>),
  byPatient: (patientId: string) => apiClient.get('/clinic/vitals/patient/' + patientId).then(unwrap<Vitals[]>),
};
