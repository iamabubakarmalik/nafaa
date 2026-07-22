import { apiClient } from '@core/api/client';

export interface DentalRecord {
  id: string;
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  toothNumber: string;
  toothSystem: string;
  surface?: string;
  condition: string;
  treatment?: string;
  procedureCode?: string;
  color?: string;
  notes?: string;
  imageUrls: string[];
  performedAt: string;
}

export interface AntenatalVisit {
  id: string;
  patientId: string;
  visitNumber: number;
  gestationWeeks?: number;
  gestationDays?: number;
  weightKg?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  fundalHeightCm?: number;
  fetalHeartRate?: number;
  fetalPosition?: string;
  fetalMovements?: string;
  urineProtein?: string;
  urineSugar?: string;
  edema?: string;
  ultrasoundNotes?: string;
  ultrasoundUrls: string[];
  advice?: string;
  nextVisitDate?: string;
  visitDate: string;
}

export interface PhysioSession {
  id: string;
  patientId: string;
  therapistId: string;
  sessionNumber: number;
  totalSessionsPrescribed?: number;
  diagnosis?: string;
  chiefComplaint?: string;
  painScore?: number;
  romNotes?: string;
  exercisesPerformed?: any;
  modalitiesUsed: string[];
  durationMin?: number;
  progressNotes?: string;
  homeExercises?: string;
  nextSessionDate?: string;
  sessionDate: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const specialtyApi = {
  // Dental
  recordDental: (data: Partial<DentalRecord>) => apiClient.post('/clinic/specialty/dental', data).then(unwrap<DentalRecord>),
  dentalChart: (patientId: string) => apiClient.get('/clinic/specialty/dental/patient/' + patientId).then(unwrap<DentalRecord[]>),
  updateDental: (id: string, data: Partial<DentalRecord>) => apiClient.patch('/clinic/specialty/dental/' + id, data).then(unwrap<DentalRecord>),
  removeDental: (id: string) => apiClient.delete('/clinic/specialty/dental/' + id).then(unwrap),

  // ANC
  createAnc: (data: Partial<AntenatalVisit>) => apiClient.post('/clinic/specialty/anc', data).then(unwrap<AntenatalVisit>),
  ancHistory: (patientId: string) => apiClient.get('/clinic/specialty/anc/patient/' + patientId).then(unwrap<AntenatalVisit[]>),

  // Physio
  createPhysio: (data: Partial<PhysioSession>) => apiClient.post('/clinic/specialty/physio', data).then(unwrap<PhysioSession>),
  physioHistory: (patientId: string) => apiClient.get('/clinic/specialty/physio/patient/' + patientId).then(unwrap<PhysioSession[]>),
};
