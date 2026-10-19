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

/** Patient row on the directory page, with what they owe on khata. */
export type PatientRow = Patient & { khataBalance: number };

export interface PatientPage {
  items: PatientRow[];
  total: number;
  page: number;
  limit: number;
  summary: { all: number; withAllergy: number; newThisMonth: number; withInsurance: number };
}

export interface PatientHistory {
  patient: Patient;
  appointments: Array<import('./appointments.api').Appointment & { encounter: import('./encounters.api').Encounter | null; vitals: import('./vitals.api').Vitals | null }>;
  prescriptions: import('./prescriptions.api').Prescription[];
  labOrders: import('./lab-orders.api').LabOrder[];
  vaccinations: import('./vaccinations.api').Vaccination[];
  vitalsHistory: import('./vitals.api').Vitals[];
  customer: { id: string; name: string; phone?: string | null; balance: number; totalSpent: number } | null;
  doctors: Array<{ id: string; fullName: string; title?: string | null }>;
}

/** Registration body: patient fields plus age in years when the birth date is not known. */
export type PatientInput = Partial<Omit<Patient, 'id' | 'mrn' | 'customerId'>> & { ageYears?: number | string; customerId?: string; allowDuplicate?: boolean };

const unwrap = <T,>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const patientsApi = {
  create: (data: PatientInput) => apiClient.post('/clinic/patients', data).then(unwrap<Patient>),
  /** Search for pickers: first 200, most recent visit first. */
  list: (params?: Record<string, unknown>) => apiClient.get('/clinic/patients', { params }).then(unwrap<Patient[]>),
  page: (params: Record<string, unknown>) => apiClient.get('/clinic/patients', { params: { page: 1, ...params } }).then(unwrap<PatientPage>),
  byMrn: (mrn: string) => apiClient.get('/clinic/patients/by-mrn/' + encodeURIComponent(mrn)).then(unwrap<Patient | null>),
  getOne: (id: string) => apiClient.get('/clinic/patients/' + id).then(unwrap<Patient>),
  history: (id: string) => apiClient.get('/clinic/patients/' + id + '/history').then(unwrap<PatientHistory>),
  update: (id: string, data: PatientInput & { isActive?: boolean }) => apiClient.patch('/clinic/patients/' + id, data).then(unwrap<Patient>),
  remove: (id: string) => apiClient.delete('/clinic/patients/' + id).then(unwrap<Patient>),
};
