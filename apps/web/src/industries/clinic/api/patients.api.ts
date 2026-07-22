import { apiClient } from '@core/api/client';

export type BloodGroup = 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'AB_POS' | 'AB_NEG' | 'O_POS' | 'O_NEG' | 'UNKNOWN';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_SAY';

export interface Patient {
  id: string;
  customerId: string;
  mrn: string;
  fullName: string;
  fatherOrHusbandName?: string;
  cnic?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  maritalStatus?: string;
  occupation?: string;
  religion?: string;
  nationality?: string;
  photoUrl?: string;
  phonePrimary?: string;
  phoneAlternate?: string;
  email?: string;
  address?: string;
  city?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  waistCm?: number;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  pastSurgeries?: string;
  familyHistory?: string;
  smokingStatus?: string;
  alcoholStatus?: string;
  isPregnant?: boolean;
  gravidaPara?: string;
  lmpDate?: string;
  edd?: string;
  menstrualCycle?: string;
  pediatricianId?: string;
  vaccinationStatus?: string;
  motherName?: string;
  birthWeight?: number;
  birthType?: string;
  hasInsurance: boolean;
  insuranceProvider?: string;
  insuranceNumber?: string;
  insuranceExpiry?: string;
  cardUrl?: string;
  preferredDoctorId?: string;
  preferredLanguage?: string;
  registeredAt: string;
  lastVisitAt?: string;
  totalVisits: number;
  totalSpent: number;
  outstandingBalance: number;
  notes?: string;
  photoUrls: string[];
  documentUrls: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const patientsApi = {
  create: (data: Partial<Patient>) => apiClient.post('/clinic/patients', data).then(unwrap<Patient>),
  list: (params?: any) => apiClient.get('/clinic/patients', { params }).then(unwrap<Patient[]>),
  byMrn: (mrn: string) => apiClient.get('/clinic/patients/by-mrn/' + mrn).then(unwrap<Patient | null>),
  getOne: (id: string) => apiClient.get('/clinic/patients/' + id).then(unwrap<Patient>),
  history: (id: string) => apiClient.get('/clinic/patients/' + id + '/history').then(unwrap<any>),
  update: (id: string, data: Partial<Patient>) => apiClient.patch('/clinic/patients/' + id, data).then(unwrap<Patient>),
  remove: (id: string) => apiClient.delete('/clinic/patients/' + id).then(unwrap),
};
