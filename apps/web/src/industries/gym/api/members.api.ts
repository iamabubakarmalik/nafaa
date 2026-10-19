import { apiClient } from '@core/api/client';
import type { Attendance } from './attendance.api';
import type { BodyMeasurement } from './measurements.api';
import type { Membership } from './memberships.api';
import type { PTSession } from './personal-training.api';

export type Goal = 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'BODY_BUILDING' | 'STRENGTH' | 'ENDURANCE'
  | 'CARDIO' | 'FLEXIBILITY' | 'REHABILITATION' | 'GENERAL_FITNESS' | 'COMPETITION_PREP'
  | 'WEIGHT_GAIN' | 'TONING' | 'OTHER';

export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';

/** Where a member stands today, worked out by the API from the current membership. */
export type MemberState = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'FROZEN' | 'UPCOMING' | 'PENDING' | 'NONE';
export type MemberView = 'all' | 'running' | 'expiring' | 'expired' | 'dues' | 'frozen' | 'none' | 'left';

export interface MemberCustomer { id: string; name: string; phone?: string | null; cnic?: string | null; email?: string | null; address?: string | null; balance: number; avatarUrl?: string | null }

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
  customer?: MemberCustomer | null;
  memberships?: Membership[];
  measurements?: BodyMeasurement[];
  attendances?: Attendance[];
  /** List rows: the running (or latest) membership, total fees due and today's state. */
  current?: Membership | null;
  due?: number;
  state?: MemberState;
  createdAt: string;
  updatedAt: string;
}

export interface MemberDetail extends GymMember {
  ptSessions: PTSession[];
  bills: Array<{ id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number; status: string; paymentMethod: string; createdAt: string }>;
}

export interface MemberPage { items: GymMember[]; total: number; page: number; pages: number; counts: Record<MemberView, number> }

export interface MemberSummary {
  total: number; active: number; running: number; expiring: number; expired: number;
  duesAmount: number; duesCount: number; joinedThisMonth: number;
  byGoal: Array<{ primaryGoal: Goal; _count: { _all: number } }>;
  byGender: Array<{ gender: string; count: number }>;
  byPlan: Array<{ planId: string; name: string; count: number }>;
}

/** Fields the member form sends; name, phone and CNIC go to the member's khata (customer). */
export type MemberInput = Partial<Omit<GymMember, 'customer' | 'memberships' | 'measurements' | 'attendances' | 'current' | 'due' | 'state'>> & {
  name?: string; phone?: string; cnic?: string; email?: string; address?: string; customerId?: string;
};

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gymMembersApi = {
  create: (data: MemberInput) => apiClient.post('/gym/members', data).then(unwrap<GymMember>),
  /** Plain list (dashboard, pickers, offline cache). */
  list: (params?: { search?: string; status?: string; view?: MemberView; customerId?: string }) => apiClient.get('/gym/members', { params }).then(unwrap<GymMember[]>),
  page: (params: { view: MemberView; search?: string; page: number; limit?: number; planId?: string; goal?: string }) => apiClient.get('/gym/members', { params }).then(unwrap<MemberPage>),
  summary: () => apiClient.get('/gym/members/summary').then(unwrap<MemberSummary>),
  getOne: (id: string) => apiClient.get('/gym/members/' + id).then(unwrap<MemberDetail>),
  update: (id: string, data: MemberInput) => apiClient.patch('/gym/members/' + id, data).then(unwrap<GymMember>),
  remove: (id: string) => apiClient.delete('/gym/members/' + id).then(unwrap),
};
