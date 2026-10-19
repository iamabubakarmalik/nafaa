import { apiClient } from '@core/api/client';

export type Specialty = 'GENERAL_PRACTITIONER' | 'FAMILY_PHYSICIAN' | 'INTERNAL_MEDICINE'
  | 'PEDIATRICIAN' | 'GYNECOLOGIST' | 'OBSTETRICIAN' | 'DENTIST' | 'ORTHODONTIST'
  | 'DERMATOLOGIST' | 'CARDIOLOGIST' | 'NEUROLOGIST' | 'PSYCHIATRIST' | 'PSYCHOLOGIST'
  | 'ORTHOPEDIC' | 'ENT_SPECIALIST' | 'OPHTHALMOLOGIST' | 'UROLOGIST' | 'NEPHROLOGIST'
  | 'ENDOCRINOLOGIST' | 'GASTROENTEROLOGIST' | 'PULMONOLOGIST' | 'ONCOLOGIST'
  | 'RADIOLOGIST' | 'PATHOLOGIST' | 'ANESTHESIOLOGIST' | 'SURGEON' | 'PLASTIC_SURGEON'
  | 'PHYSIOTHERAPIST' | 'NUTRITIONIST' | 'DIETITIAN' | 'HOMEOPATH' | 'HAKEEM'
  | 'AYURVEDIC' | 'ACUPUNCTURIST' | 'VETERINARY' | 'MIDWIFE' | 'NURSE_PRACTITIONER' | 'OTHER';

export interface Doctor {
  id: string;
  staffId: string;
  title?: string;
  fullName: string;
  qualifications: string[];
  specialties: Specialty[];
  subSpecialty?: string;
  yearsOfExperience?: number;
  bio?: string;
  photoUrl?: string;
  signatureUrl?: string;
  pmcNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  registeredWith?: string;
  consultationFee: number;
  followUpFee: number;
  followUpDays: number;
  telemedicineFee?: number;
  homeVisitFee?: number;
  emergencyFee?: number;
  slotDurationMin: number;
  bufferMin: number;
  maxDailyPatients?: number;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  commissionPct: number;
  commissionType?: 'PERCENTAGE' | 'FIXED' | string;
  languages: string[];
  services: string[];
  proceduresOffered: string[];
  acceptsTelemedicine: boolean;
  acceptsHomeVisit: boolean;
  acceptsEmergency: boolean;
  totalPatients: number;
  totalAppointments: number;
  totalRevenue: number;
  avgRating?: number;
  totalReviews: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const doctorsApi = {
  /** Without `staffId`, `phone` makes a new staff record for the doctor. */
  upsert: (data: Partial<Doctor> & { phone?: string }) => apiClient.post('/clinic/doctors', data).then(unwrap<Doctor>),
  list: (params?: Record<string, unknown>) => apiClient.get('/clinic/doctors', { params }).then(unwrap<Doctor[]>),
  byStaff: (staffId: string) => apiClient.get('/clinic/doctors/by-staff/' + staffId).then(unwrap<Doctor | null>),
  getOne: (id: string) => apiClient.get('/clinic/doctors/' + id).then(unwrap<Doctor>),
  availability: (id: string, date: string) => apiClient.get('/clinic/doctors/' + id + '/availability', { params: { date } }).then(unwrap<{ available: boolean; reason?: string; workingHours?: { start: string; end: string }; slotDuration?: number; bookings?: Array<{ start: string; end: string; status: string }> }>),
  remove: (id: string) => apiClient.delete('/clinic/doctors/' + id).then(unwrap),
};
