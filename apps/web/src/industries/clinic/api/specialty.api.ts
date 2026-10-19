import { apiClient } from '@core/api/client';

export interface DentalRecord {
  id: string; patientId: string; doctorId?: string | null; appointmentId?: string | null;
  toothNumber: string; toothSystem: string; surface?: string | null; condition: string; treatment?: string | null; procedureCode?: string | null;
  notes?: string | null; performedAt: string; isActive: boolean;
}

export interface AncVisit {
  id: string; patientId: string; visitNumber: number; gestationWeeks?: number | null; gestationDays?: number | null;
  weightKg?: number | null; bpSystolic?: number | null; bpDiastolic?: number | null; fundalHeightCm?: number | null; fetalHeartRate?: number | null;
  fetalPosition?: string | null; fetalMovements?: string | null; urineProtein?: string | null; urineSugar?: string | null; edema?: string | null;
  ultrasoundNotes?: string | null; advice?: string | null; nextVisitDate?: string | null; visitDate: string;
}

export interface PhysioSession {
  id: string; patientId: string; therapistId: string; sessionNumber: number; totalSessionsPrescribed?: number | null;
  diagnosis?: string | null; chiefComplaint?: string | null; painScore?: number | null; romNotes?: string | null;
  exercisesPerformed?: string[] | null; modalitiesUsed: string[]; durationMin?: number | null;
  progressNotes?: string | null; homeExercises?: string | null; nextSessionDate?: string | null; sessionDate: string;
}

const unwrap = <T,>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const specialtyApi = {
  dental: (patientId: string) => apiClient.get('/clinic/specialty/dental/patient/' + patientId).then(unwrap<DentalRecord[]>),
  addDental: (data: Partial<DentalRecord> & { patientId: string }) => apiClient.post('/clinic/specialty/dental', data).then(unwrap<DentalRecord>),
  /** Switches the entry off; it stays in the record. */
  removeDental: (id: string) => apiClient.delete('/clinic/specialty/dental/' + id).then(unwrap<DentalRecord>),
  anc: (patientId: string) => apiClient.get('/clinic/specialty/anc/patient/' + patientId).then(unwrap<AncVisit[]>),
  addAnc: (data: Record<string, unknown> & { patientId: string }) => apiClient.post('/clinic/specialty/anc', data).then(unwrap<AncVisit>),
  physio: (patientId: string) => apiClient.get('/clinic/specialty/physio/patient/' + patientId).then(unwrap<PhysioSession[]>),
  addPhysio: (data: Record<string, unknown> & { patientId: string; therapistId: string }) => apiClient.post('/clinic/specialty/physio', data).then(unwrap<PhysioSession>),
};
