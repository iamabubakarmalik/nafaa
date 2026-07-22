import { apiClient } from '@core/api/client';

export interface Encounter {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  historyOfIllness?: string;
  reviewOfSystems?: string;
  physicalExamination?: string;
  provisionalDiagnosis?: string;
  finalDiagnosis?: string;
  icd10Codes: string[];
  differentialDiagnosis?: string;
  advice?: string;
  dietaryAdvice?: string;
  activityAdvice?: string;
  warningSigns?: string;
  followUpAdvice?: string;
  followUpDate?: string;
  referredTo?: string;
  referralNotes?: string;
  attachmentUrls: string[];
  prescriptions?: any[];
  labOrders?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const encountersApi = {
  upsert: (appointmentId: string, data: Partial<Encounter>) =>
    apiClient.post('/clinic/encounters/appointment/' + appointmentId, data).then(unwrap<Encounter>),
  byAppointment: (appointmentId: string) => apiClient.get('/clinic/encounters/appointment/' + appointmentId).then(unwrap<Encounter | null>),
  byPatient: (patientId: string) => apiClient.get('/clinic/encounters/patient/' + patientId).then(unwrap<Encounter[]>),
};
