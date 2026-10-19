import { apiClient } from '@core/api/client';

export type StaffRole = 'STYLIST' | 'COLORIST' | 'BEAUTICIAN' | 'MAKEUP_ARTIST' | 'NAIL_TECH'
  | 'MASSAGE_THERAPIST' | 'MEHNDI_ARTIST' | 'APPRENTICE' | 'RECEPTIONIST' | 'MANAGER' | 'OTHER';

export type CommissionType = 'NONE' | 'PERCENTAGE' | 'FIXED_PER_SERVICE' | 'TIERED' | 'HYBRID';

export interface StaffProfile {
  id: string;
  staffId: string;
  role: StaffRole;
  specialization: string[];
  experienceYears?: number;
  bio?: string;
  photoUrl?: string;
  commissionType: CommissionType;
  commissionPct: number;
  commissionFixed: number;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  isBookable: boolean;
  maxDailyBookings?: number;
  bookingBuffer: number;
  totalAppointments: number;
  totalRevenue: number;
  totalCommission: number;
  avgRating?: number;
  totalReviews: number;
  isActive: boolean;
  staff?: { id: string; fullName: string; phone?: string | null; designation?: string | null; avatarUrl?: string | null; userId?: string | null } | null;
  services?: Array<{ serviceId: string; customPrice?: number | null; customDuration?: number | null; customCommissionPct?: number | null; isPrimary?: boolean }>;
  createdAt: string;
  updatedAt: string;
}

export type StaffProfileInput = Partial<Pick<StaffProfile, 'role' | 'specialization' | 'experienceYears' | 'bio' | 'commissionType' | 'commissionPct'
  | 'commissionFixed' | 'workingDays' | 'workStartTime' | 'workEndTime' | 'isBookable' | 'maxDailyBookings' | 'bookingBuffer' | 'isActive'>>
  & { staffId: string; breakStartTime?: string; breakEndTime?: string };

export interface CommissionStatement {
  from: string; to: string;
  staff: Array<{
    staffProfileId: string; name: string; services: number; revenue: number; commission: number; returned: number; net: number;
    /** Paid out already; still owed; paid but the service came back later. */
    paid: number; unpaid: number; paidThenReturned: number;
  }>;
  totals: { services: number; revenue: number; net: number; paid: number; unpaid: number };
  lines?: Array<{
    id: string; at: string; appointmentId: string; appointmentNumber: string; customerName?: string | null; saleNumber: string; serviceName: string;
    total: number; commission: number; returned: boolean; notes?: string | null; paidAt?: string | null; payoutRef?: string | null;
  }>;
}

export interface CommissionPayout {
  ref: string; staffProfileId: string | null; staffName: string | null; paidAt: string | null; services: number; amount: number;
  expense: { expenseNumber: string; status: string; paymentMethod: string; amount: number } | null;
}

export interface PayoutSlip {
  ref: string; staffProfileId: string | null; staffName: string | null; paidAt: string | null; amount: number;
  expense: { expenseNumber: string; title: string; amount: number; paymentMethod: string; status: string; expenseDate: string; paidBy: string | null } | null;
  lines: Array<{ id: string; at: string | null; appointmentNumber: string; customerName?: string | null; saleNumber: string | null; serviceName: string; total: number; commission: number }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const staffProfilesApi = {
  upsert: (data: StaffProfileInput) => apiClient.post('/salon/staff-profiles', data).then(unwrap<StaffProfile>),
  list: (params?: { bookable?: boolean; role?: string; search?: string }) => apiClient.get('/salon/staff-profiles', { params }).then(unwrap<StaffProfile[]>),
  commission: (params: { from?: string; to?: string; staffProfileId?: string }) =>
    apiClient.get('/salon/staff-profiles/commission', { params }).then(unwrap<CommissionStatement>),
  remove: (id: string) => apiClient.delete('/salon/staff-profiles/' + id).then(unwrap),
  pay: (data: { staffProfileId: string; from: string; to: string; lineIds?: string[]; paymentMethod?: string; note?: string }) =>
    apiClient.post('/salon/commission/payouts', data).then(unwrap<PayoutSlip>),
  payouts: (staffProfileId?: string) => apiClient.get('/salon/commission/payouts', { params: { staffProfileId } }).then(unwrap<CommissionPayout[]>),
  slip: (ref: string) => apiClient.get('/salon/commission/payouts/' + encodeURIComponent(ref)).then(unwrap<PayoutSlip>),
};
