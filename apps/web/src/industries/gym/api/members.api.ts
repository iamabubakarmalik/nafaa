import { apiClient } from '@core/api/client';

export type Goal = 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'BODY_BUILDING' | 'STRENGTH' | 'ENDURANCE'
  | 'CARDIO' | 'FLEXIBILITY' | 'REHABILITATION' | 'GENERAL_FITNESS' | 'COMPETITION_PREP'
  | 'WEIGHT_GAIN' | 'TONING' | 'OTHER';

export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';

export interface GymMember {
  id: string;
  memberNumber: string;
  customerId: string;
  rfidCard?: string;
  biometricId?: string;
  qrCode?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  bodyFatPct?: number;
  muscleMassPct?: number;
  bmi?: number;
  primaryGoal: Goal;
  secondaryGoals: Goal[];
  fitnessLevel?: string;
  experienceYears?: number;
  medicalConditions?: string;
  injuries?: string;
  allergies: string[];
  medications?: string;
  doctorClearance: boolean;
  doctorClearanceUrl?: string;
  preferredWorkoutTime?: string;
  preferredTrainerId?: string;
  workoutDays: number[];
  dietaryPreferences: string[];
  photoUrl?: string;
  bio?: string;
  notes?: string;
  status: MemberStatus;
  joinedAt: string;
  lastVisitAt?: string;
  totalVisits: number;
  totalSpent: number;
  currentStreak: number;
  longestStreak: number;
  referralCode?: string;
  isActive: boolean;
  customer?: any;
  memberships?: any[];
  measurements?: any[];
  attendances?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gymMembersApi = {
  create: (data: Partial<GymMember>) => apiClient.post('/gym/members', data).then(unwrap<GymMember>),
  list: (params?: any) => apiClient.get('/gym/members', { params }).then(unwrap<GymMember[]>),
  summary: () => apiClient.get('/gym/members/summary').then(unwrap<any>),
  byQr: (qrCode: string) => apiClient.get('/gym/members/by-qr/' + qrCode).then(unwrap<GymMember>),
  byRfid: (rfidCard: string) => apiClient.get('/gym/members/by-rfid/' + rfidCard).then(unwrap<GymMember>),
  getOne: (id: string) => apiClient.get('/gym/members/' + id).then(unwrap<GymMember>),
  update: (id: string, data: Partial<GymMember>) => apiClient.patch('/gym/members/' + id, data).then(unwrap<GymMember>),
  remove: (id: string) => apiClient.delete('/gym/members/' + id).then(unwrap),
};
