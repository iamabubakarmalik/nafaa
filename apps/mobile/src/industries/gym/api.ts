/** Gym endpoints (same paths and shapes as apps/web/src/industries/gym/api). They need the server; screens show the last saved data offline. */

import { http } from '../_shared/serviceKit';

export type MemberState = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'FROZEN' | 'UPCOMING' | 'PENDING' | 'NONE';
export type MemberView = 'all' | 'running' | 'expiring' | 'expired' | 'dues' | 'frozen' | 'none' | 'left';
export type MembershipView = 'all' | 'running' | 'expiring' | 'expired' | 'frozen' | 'dues' | 'cancelled' | 'upcoming';

export interface MembershipPlan {
  id: string; name: string; planType: string; price: number; registrationFee: number; securityDeposit: number; durationDays: number; isUnlimited: boolean; visitLimit?: number;
  includesPersonalTraining: boolean; includesClasses: boolean; allowFreeze: boolean; maxFreezeDays: number; freezeFee: number; isFeatured: boolean; isActive: boolean; totalSubscribers: number; description?: string;
}
export interface Membership {
  id: string; memberId: string; planId: string; membershipNumber: string; status: string; startDate: string; endDate: string; totalPrice: number; paidAmount: number; balanceDue: number;
  isFrozen: boolean; frozenUntil?: string; totalFrozenDays: number; renewalReminded?: boolean; plan?: MembershipPlan;
  member?: { id: string; memberNumber: string; customer?: { id: string; name: string; phone?: string | null; balance?: number } | null };
}
export interface GymMember {
  id: string; memberNumber: string; customerId: string; status: string; joinedAt: string; lastVisitAt?: string; totalVisits: number; currentStreak: number; primaryGoal: string; gender?: string;
  emergencyContactName?: string; emergencyContactPhone?: string; medicalConditions?: string; notes?: string; photoUrl?: string;
  customer?: { id: string; name: string; phone?: string | null; cnic?: string | null; balance: number } | null;
  current?: Membership | null; due?: number; state?: MemberState;
}
export interface MemberDetail extends GymMember { photoUrl?: string; measurements?: Measurement[]; memberships?: Membership[]; lockers: Array<{ id: string; number: string; endDate: string | null }> }
export interface MemberPage { items: GymMember[]; total: number; counts: Record<MemberView, number> }
export interface MemberSummary { total: number; active: number; running: number; expiring: number; expired: number; duesAmount: number; duesCount: number; joinedThisMonth: number }
export interface Attendance {
  id: string; memberId: string; checkInAt: string; checkOutAt?: string; durationMinutes?: number; isGuest: boolean; guestName?: string;
  member?: { id: string; memberNumber: string; customer?: { id: string; name: string; phone?: string | null } | null };
}
export interface CheckInResult extends Attendance { membership: { planName: string; endDate: string; visitsRemaining: number | null } | null; due: number; warnings: string[] }
export interface DeskLookup {
  member: { id: string; memberNumber: string; status: string; customer?: { id: string; name: string; phone?: string | null; balance: number } | null };
  membership: Membership | null; block: string | null; message: string | null; due: number; inside: { id: string; checkInAt: string } | null; warnings: string[];
}
export interface Trainer {
  id: string; trainerNumber: string; role: string; specializations: string[]; hourlyRate: number; perSessionRate: number; commissionPct: number; commissionFixed: number;
  workStartTime: string; workEndTime: string; isAvailable: boolean; activeClients: number; totalSessions: number; totalRevenue: number; totalCommission: number; avgRating?: number; isActive: boolean;
  staff?: { id: string; fullName: string; phone?: string | null } | null;
}
export interface TrainerCommission { earned: number; sessions: number; paid: number; owed: number }
export interface GymClass {
  id: string; name: string; classType: string; scheduledStart: string; scheduledEnd: string; maxParticipants: number; currentEnrolled: number; isFree: boolean; memberPrice: number; dropInPrice: number;
  status: string; roomName?: string; trainer?: Trainer | null;
  bookings?: Array<{ id: string; bookingNumber: string; status: string; attended: boolean; member?: { memberNumber: string; customer?: { name: string } | null } }>;
}
export interface GymLocker { id: string; number: string; memberId: string | null; monthlyRent: number; endDate: string | null; status: string; due: boolean; daysLeft: number | null; member: { memberNumber: string; customer: { name: string } | null } | null }
export interface Equipment { id: string; equipmentNumber: string; name: string; category: string; brand?: string; status: string; nextMaintenanceDate?: string; usageCount: number; location?: string }
export interface PTSession {
  id: string; sessionNumber: string; scheduledStart: string; scheduledEnd: string; status: string; price: number; paidAmount: number; isFromPackage: boolean; focusArea?: string;
  trainer?: { id: string; trainerNumber: string; staff?: { fullName: string } | null }; member?: { memberNumber: string; customer?: { name: string } | null } | null;
}
export interface PtPackage { id: string; packageNumber: string; sessionsTotal: number; sessionsUsed: number; sessionsLeft: number; price: number; status: string; member: { memberNumber: string; customer: { name: string } | null } | null; trainer: { name: string | null } | null }
export interface GymOverview {
  totals: { totalMembers: number; activeMembers: number; totalTrainers: number; activeMemberships: number };
  today: { checkIns: number; currentlyInside: number; classes: number; classBookings: number; revenue: number; udhaar: number };
  monthly: { revenue: number; collected: number };
  alerts: { expiringMemberships: number; duesCount: number; duesAmount: number };
}

export interface Measurement { id: string; measurementDate: string; weightKg?: number; heightCm?: number; bmi?: number; bodyFatPct?: number; muscleMassPct?: number; chestCm?: number; waistCm?: number; hipsCm?: number; bicepsCm?: number; thighsCm?: number; notes?: string }
export interface Workout { id: string; sessionDate: string; durationMinutes?: number; caloriesBurned?: number; workoutType?: string; focusArea?: string; intensity?: string; exercises?: Array<{ name?: string; sets?: Array<{ reps?: number; weight?: number }> }>; totalSets: number; notes?: string }
export interface DietPlan { id: string; planName: string; planType?: string; goal: string; startDate: string; endDate?: string; targetCalories?: number; proteinGrams?: number; carbsGrams?: number; fatsGrams?: number; meals?: Array<{ meal?: string; items?: string }> | null; restrictions: string[]; supplements: string[]; notes?: string; isActive: boolean }

export const gymApi = {
  measurements: {
    create: (d: Record<string, unknown>) => http.post<Measurement>('/gym/measurements', d),
    void: (id: string) => http.del(`/gym/measurements/${id}`),
  },
  workouts: {
    list: (memberId: string) => http.get<Workout[]>(`/gym/workouts/by-member/${memberId}`),
    create: (d: Record<string, unknown>) => http.post<Workout>('/gym/workouts', d),
    remove: (id: string) => http.del(`/gym/workouts/${id}`),
  },
  dietPlans: {
    list: (memberId: string) => http.get<DietPlan[]>('/gym/diet-plans', { memberId }),
    create: (d: Record<string, unknown>) => http.post<DietPlan>('/gym/diet-plans', d),
    update: (id: string, d: Record<string, unknown>) => http.patch<DietPlan>(`/gym/diet-plans/${id}`, d),
    remove: (id: string) => http.del(`/gym/diet-plans/${id}`),
  },
  overview: () => http.get<GymOverview>('/gym/dashboard/overview'),
  members: {
    page: (p: { view: MemberView; search?: string; page: number; limit?: number }) => http.get<MemberPage>('/gym/members', p),
    list: (p?: { search?: string; customerId?: string; view?: MemberView }) => http.get<GymMember[]>('/gym/members', p),
    summary: () => http.get<MemberSummary>('/gym/members/summary'),
    getOne: (id: string) => http.get<MemberDetail>(`/gym/members/${id}`),
    create: (d: Record<string, unknown>) => http.post<GymMember>('/gym/members', d),
    update: (id: string, d: Record<string, unknown>) => http.patch<GymMember>(`/gym/members/${id}`, d),
  },
  plans: {
    list: (p?: { active?: boolean }) => http.get<MembershipPlan[]>('/gym/membership-plans', p),
    create: (d: Partial<MembershipPlan>) => http.post<MembershipPlan>('/gym/membership-plans', d),
    update: (id: string, d: Partial<MembershipPlan>) => http.patch<MembershipPlan>(`/gym/membership-plans/${id}`, d),
  },
  memberships: {
    page: (p: { view: MembershipView; search?: string; page: number; limit?: number }) => http.get<{ items: Membership[]; total: number; counts: Record<MembershipView, number>; totals: { due: number } }>('/gym/memberships', p),
    subscribe: (d: { memberId: string; planId: string; startDate?: string; paidAmount?: number; totalPrice?: number; paymentMethod?: string; waiveAdmission?: boolean }) => http.post<Membership & { sale?: { saleNumber: string } | null }>('/gym/memberships/subscribe', d),
    renew: (id: string, d: { paidAmount?: number; paymentMethod?: string; planId?: string; totalPrice?: number }) => http.post<Membership>(`/gym/memberships/${id}/renew`, d),
    payment: (id: string, amount: number, paymentMethod?: string) => http.post<Membership>(`/gym/memberships/${id}/payment`, { amount, paymentMethod }),
    freeze: (id: string, d: { days: number; reason?: string; paidAmount?: number; paymentMethod?: string }) => http.post<Membership>(`/gym/memberships/${id}/freeze`, d),
    unfreeze: (id: string) => http.post<Membership>(`/gym/memberships/${id}/unfreeze`),
    cancel: (id: string, reason?: string) => http.post<Membership>(`/gym/memberships/${id}/cancel`, { reason }),
    reminded: (id: string) => http.post<Membership>(`/gym/memberships/${id}/reminded`),
  },
  attendance: {
    checkIn: (d: { memberId?: string; code?: string; isGuest?: boolean; guestName?: string; allowExpired?: boolean }) => http.post<CheckInResult>('/gym/attendance/check-in', d),
    checkOut: (id: string) => http.post<Attendance>(`/gym/attendance/${id}/check-out`),
    lookup: (code: string) => http.get<DeskLookup>('/gym/attendance/lookup', { code }),
    inside: () => http.get<Attendance[]>('/gym/attendance/currently-inside'),
    today: (from: string, to: string) => http.get<{ items: Attendance[]; total: number }>('/gym/attendance', { from, to, page: 1, limit: 50 }),
  },
  trainers: {
    list: () => http.get<Trainer[]>('/gym/trainers'),
    create: (d: Record<string, unknown>) => http.post<Trainer>('/gym/trainers', d),
    update: (id: string, d: Record<string, unknown>) => http.patch<Trainer>(`/gym/trainers/${id}`, d),
    commission: (id: string, from?: string, to?: string) => http.get<TrainerCommission>(`/gym/trainers/${id}/commission`, { from, to }),
    pay: (id: string, d: { amount: number; paymentMethod?: string }) => http.post(`/gym/trainers/${id}/payout`, d),
  },
  classes: {
    calendar: (from: string, to: string) => http.get<GymClass[]>('/gym/classes/calendar', { from, to }),
    list: (p?: { from?: string; to?: string }) => http.get<GymClass[]>('/gym/classes', p),
    getOne: (id: string) => http.get<GymClass>(`/gym/classes/${id}`),
    create: (d: Record<string, unknown>) => http.post('/gym/classes', d),
    status: (id: string, status: string, cancelledReason?: string) => http.post<GymClass>(`/gym/classes/${id}/status`, { status, cancelledReason }),
    book: (id: string, d: { memberId: string; paidAmount?: number; paymentMethod?: string }) => http.post(`/gym/classes/${id}/book`, d),
    checkIn: (bookingId: string) => http.post(`/gym/classes/bookings/${bookingId}/checkin`),
    cancelBooking: (bookingId: string) => http.post(`/gym/classes/bookings/${bookingId}/cancel`, {}),
  },
  lockers: {
    list: (p?: { view?: string; search?: string }) => http.get<{ items: GymLocker[]; counts: Record<string, number>; totals: { monthlyRent: number } }>('/gym/lockers', p),
    create: (d: { number: string; monthlyRent: number; count?: number }) => http.post('/gym/lockers', d),
    assign: (id: string, d: { memberId: string; months: number; paidAmount?: number; paymentMethod?: string }) => http.post(`/gym/lockers/${id}/assign`, d),
    rent: (id: string, d: { months: number; paidAmount?: number; paymentMethod?: string }) => http.post(`/gym/lockers/${id}/rent`, d),
    release: (id: string) => http.post(`/gym/lockers/${id}/release`, {}),
    billDue: () => http.post<{ billed: number }>('/gym/lockers/bill-due'),
  },
  equipment: {
    list: () => http.get<Equipment[]>('/gym/equipment'),
    create: (d: Record<string, unknown>) => http.post<Equipment>('/gym/equipment', d),
    update: (id: string, d: Record<string, unknown>) => http.patch<Equipment>(`/gym/equipment/${id}`, d),
    maintenance: (id: string, d: { cost: number; notes?: string; paid?: boolean; paymentMethod?: string }) => http.post<Equipment>(`/gym/equipment/${id}/maintenance`, d),
  },
  pt: {
    list: (p?: { status?: string }) => http.get<PTSession[]>('/gym/personal-training', p),
    create: (d: { memberId: string; trainerId: string; scheduledStart: string; durationMinutes?: number; price?: number; isFromPackage?: boolean; packageId?: string; focusArea?: string }) => http.post('/gym/personal-training', d),
    status: (id: string, d: { status: string; cancellationReason?: string; paidAmount?: number; paymentMethod?: string }) => http.post<PTSession>(`/gym/personal-training/${id}/status`, d),
    packages: (p?: { status?: string }) => http.get<{ items: PtPackage[]; total: number }>('/gym/pt-packages', p),
    sellPackage: (d: { memberId: string; trainerId?: string; sessions: number; price: number; paidAmount?: number; paymentMethod?: string }) => http.post('/gym/pt-packages', d),
  },
};
