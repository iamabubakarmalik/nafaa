/**
 * Salon endpoints (same paths and shapes as apps/web/src/industries/salon/api).
 * They need the server; screens show the last saved data offline.
 */

import { http } from '../_shared/serviceKit';

export type AppointmentStatus = 'DRAFT' | 'CONFIRMED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';
export type CommissionType = 'NONE' | 'PERCENTAGE' | 'FIXED_PER_SERVICE' | 'TIERED' | 'HYBRID';

export interface SalonService {
  id: string; name: string; code?: string; category: string; description?: string; price: number; discountPrice?: number | null; costPrice?: number | null; durationMinutes: number;
  bufferBefore: number; bufferAfter: number; forMen: boolean; forWomen: boolean; forKids: boolean; commissionPct: number; commissionFixed: number;
  isPopular: boolean; isFeatured: boolean; isActive: boolean; totalBookings: number; totalRevenue: number; displayOrder: number;
}
export interface StaffProfile {
  id: string; staffId: string; role: string; specialization: string[]; experienceYears?: number; commissionType: CommissionType; commissionPct: number; commissionFixed: number;
  workingDays: number[]; workStartTime: string; workEndTime: string; isBookable: boolean; totalAppointments: number; totalRevenue: number; totalCommission: number; avgRating?: number; isActive: boolean;
  staff?: { id: string; fullName: string; phone?: string | null } | null;
  services?: Array<{ serviceId: string; customPrice?: number | null }>;
}
export interface AppointmentService {
  id?: string; serviceId: string; serviceName?: string; staffProfileId?: string; staffName?: string; price: number; discount: number; total: number; durationMinutes: number; commissionAmount?: number; notes?: string | null;
}
export interface Appointment {
  id: string; appointmentNumber: string; customerId?: string; customerName?: string; customerPhone?: string; status: AppointmentStatus; source: 'BOOKED' | 'WALK_IN' | 'COUNTER';
  scheduledStart: string; scheduledEnd: string; arrivedAt?: string; total: number; paidAmount: number; paymentStatus: string; subtotal: number; discount: number; tip: number;
  saleId?: string | null; services: AppointmentService[]; customer?: { id: string; name: string; phone?: string | null; balance?: number } | null;
  sale?: { id: string; saleNumber: string; status: string; total: number } | null; cancellationReason?: string; customerNotes?: string; internalNotes?: string;
}
export type AppointmentView = 'today' | 'queue' | 'upcoming' | 'done' | 'missed' | 'all';
export interface AppointmentPage { items: Appointment[]; total: number; page: number; pages: number; counts: Record<AppointmentView, number>; totals: { value: number; paid: number } }
export interface AppointmentSummary {
  today: { total: number; waiting: number; inChair: number; done: number; noShow: number; late: number; upcoming: number };
  period: { revenue: number; completed: number; commission: number; bookings: number; noShows: number; noShowRate: number; average: number };
  staff: Array<{ staffProfileId: string; name: string; services: number; revenue: number; commission: number }>;
  services: Array<{ serviceId: string; name: string; count: number; revenue: number }>;
}
export interface NewAppointment {
  customerId?: string; customerName?: string; customerPhone?: string; customerNotes?: string; scheduledStart: string; walkIn?: boolean; numberOfGuests?: number;
  services: Array<{ serviceId: string; staffProfileId?: string; price?: number; durationMinutes?: number; notes?: string }>;
}
export interface SalonBillInput {
  appointmentId?: string; customerId?: string; customerName?: string; customerPhone?: string;
  services: Array<{ serviceId: string; staffProfileId?: string; price?: number; notes?: string; packagePurchaseId?: string; used?: Array<{ productId: string; quantity: number }> }>;
  products?: Array<{ productId: string; quantity: number; price?: number }>; payments?: Array<{ method: string; amount: number }>;
  useMembership?: boolean; discount?: number; tip?: number; voucherCode?: string; voucherAmount?: number;
  paymentMethod: string; paidAmount: number; note?: string;
}
export interface SalonBill { id: string; saleNumber: string; total: number; paidAmount: number; changeAmount: number; creditAmount: number; appointment: { id: string; appointmentNumber: string } | null }
export interface SalonPerks {
  membership: { id: string; membershipNumber: string; planName: string; tier: string; discountPct: number; expiryDate: string } | null;
  packages: Array<{ id: string; purchaseNumber: string; packageName: string; sessionsRemaining: number; expiryDate: string; serviceIds: string[] }>;
}
export interface MembershipPlan { id: string; name: string; tier: string; price: number; durationDays: number; discountPct: number; priorityBooking: boolean; isActive: boolean; totalSubscribers: number; benefits: string[] }
export interface Membership { id: string; membershipNumber: string; status: string; startDate: string; expiryDate: string; amountPaid: number; totalSaved: number; plan?: MembershipPlan; customer?: { id: string; name: string; phone?: string | null } | null }
export interface Package { id: string; name: string; price: number; originalPrice?: number; services: string[]; totalSessions: number; validityDays: number; isFeatured: boolean; isActive: boolean; totalSold: number }
export interface PackagePurchase { id: string; purchaseNumber: string; status: string; expiryDate: string; amountPaid: number; sessionsUsed: number; sessionsRemaining: number; package?: Package; customer?: { id: string; name: string; phone?: string | null } | null }
export interface GiftVoucher { id: string; code: string; amount: number; balance: number; used: number; expiryDate?: string | null; status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED'; customer?: { id: string; name: string } | null; createdAt: string }
export interface VoucherLookup { id: string; code: string; amount: number; balance: number; status: string; customerName?: string | null; problem: string | null }
export interface CommissionStatement {
  from: string; to: string; lines?: CommissionLine[];
  staff: Array<{ staffProfileId: string; name: string; services: number; revenue: number; commission: number; returned: number; net: number; paid: number; unpaid: number; paidThenReturned?: number }>;
  totals: { services: number; revenue: number; net: number; paid: number; unpaid: number };
}
export interface CommissionLine { id: string; at: string; appointmentId: string; appointmentNumber: string; customerName?: string | null; saleNumber: string; serviceName: string; total: number; commission: number; returned: boolean; notes?: string | null; paidAt?: string | null; payoutRef?: string | null }
export interface CommissionPayout { ref: string; staffProfileId: string | null; staffName: string | null; paidAt: string | null; services: number; amount: number; expense: { expenseNumber: string; status: string; paymentMethod: string; amount: number } | null }
export interface PayoutSlip {
  ref: string; staffProfileId: string | null; staffName: string | null; paidAt: string | null; amount: number;
  expense: { expenseNumber: string; title: string; amount: number; paymentMethod: string; status: string; expenseDate: string; paidBy: string | null } | null;
  lines: Array<{ id: string; at: string | null; appointmentNumber: string; customerName?: string | null; saleNumber: string | null; serviceName: string; total: number; commission: number }>;
}
export interface ProfileRow { customer: { id: string; name: string; phone?: string | null; balance: number }; profile: { totalVisits: number; totalSpent: number; lastVisitAt?: string; allergies: string[]; hairType?: string; skinType?: string; notes?: string } | null }

export const salonApi = {
  appointments: {
    page: (p: { view?: AppointmentView; from?: string; to?: string; staffProfileId?: string; search?: string; page?: number; limit?: number }) => http.get<AppointmentPage>('/salon/appointments/page', p),
    calendar: (from: string, to: string, staffProfileId?: string) => http.get<Appointment[]>('/salon/appointments/calendar', { from, to, staffProfileId }),
    summary: (p?: { from?: string; to?: string }) => http.get<AppointmentSummary>('/salon/appointments/summary', p),
    getOne: (id: string) => http.get<Appointment>(`/salon/appointments/${id}`),
    create: (d: NewAppointment) => http.post<Appointment>('/salon/appointments', d),
    status: (id: string, status: string, cancellationReason?: string) => http.patch<Appointment>(`/salon/appointments/${id}/status`, { status, cancellationReason }),
    reschedule: (id: string, d: { scheduledStart: string; scheduledEnd: string; reason?: string }) => http.post<Appointment>(`/salon/appointments/${id}/reschedule`, d),
    pay: (id: string, d: { amount: number; paymentMethod: string }) => http.post<Appointment>(`/salon/appointments/${id}/payments`, d),
  },
  bills: { create: (d: SalonBillInput) => http.post<SalonBill>('/salon/bills', d), perks: (customerId: string) => http.get<SalonPerks>('/salon/bills/perks', { customerId }) },
  services: {
    list: (p?: { active?: boolean }) => http.get<SalonService[]>('/salon/services', p),
    getOne: (id: string) => http.get<SalonService>(`/salon/services/${id}`),
    create: (d: Partial<SalonService>) => http.post<SalonService>('/salon/services', d),
    update: (id: string, d: Partial<SalonService>) => http.patch<SalonService>(`/salon/services/${id}`, d),
    remove: (id: string) => http.del(`/salon/services/${id}`),
  },
  staff: {
    list: (p?: { bookable?: boolean }) => http.get<StaffProfile[]>('/salon/staff-profiles', p),
    upsert: (d: Record<string, unknown>) => http.post<StaffProfile>('/salon/staff-profiles', d),
    remove: (id: string) => http.del(`/salon/staff-profiles/${id}`),
    commission: (p: { from?: string; to?: string; staffProfileId?: string }) => http.get<CommissionStatement>('/salon/staff-profiles/commission', p),
    payout: (d: { staffProfileId: string; from: string; to: string; lineIds?: string[]; paymentMethod?: string; note?: string }) => http.post<PayoutSlip>('/salon/commission/payouts', d),
    payouts: (staffProfileId?: string) => http.get<CommissionPayout[]>('/salon/commission/payouts', { staffProfileId }),
    slip: (ref: string) => http.get<PayoutSlip>(`/salon/commission/payouts/${encodeURIComponent(ref)}`),
  },
  memberships: {
    plans: () => http.get<MembershipPlan[]>('/salon/memberships/plans'),
    createPlan: (d: Partial<MembershipPlan>) => http.post<MembershipPlan>('/salon/memberships/plans', d),
    updatePlan: (id: string, d: Partial<MembershipPlan>) => http.patch<MembershipPlan>(`/salon/memberships/plans/${id}`, d),
    list: (p?: { status?: string }) => http.get<Membership[]>('/salon/memberships', p),
    subscribe: (d: { planId: string; customerId: string; amountPaid: number; paymentMethod?: string }) => http.post<Membership>('/salon/memberships/subscribe', d),
    cancel: (id: string, reason?: string) => http.post<Membership>(`/salon/memberships/${id}/cancel`, { reason }),
  },
  packages: {
    list: () => http.get<Package[]>('/salon/packages'),
    create: (d: Partial<Package>) => http.post<Package>('/salon/packages', d),
    update: (id: string, d: Partial<Package>) => http.patch<Package>(`/salon/packages/${id}`, d),
    purchase: (d: { packageId: string; customerId: string; amountPaid: number; paymentMethod?: string }) => http.post<PackagePurchase>('/salon/packages/purchase', d),
    purchases: (p?: { status?: string }) => http.get<PackagePurchase[]>('/salon/packages/purchases/list', p),
    cancel: (id: string, reason?: string) => http.post<PackagePurchase>(`/salon/packages/purchases/${id}/cancel`, { reason }),
  },
  vouchers: {
    list: (p?: { status?: string }) => http.get<{ items: GiftVoucher[]; totals: { active: number; balance: number; sold: number } }>('/salon/gift-vouchers', p),
    sell: (d: { amount: number; customerId?: string; expiryDate?: string; paymentMethod: string }) => http.post<GiftVoucher>('/salon/gift-vouchers', d),
    lookup: (code: string) => http.get<VoucherLookup>('/salon/gift-vouchers/lookup', { code }),
    cancel: (id: string) => http.post<GiftVoucher>(`/salon/gift-vouchers/${id}/cancel`),
  },
  customers: { page: (p: { view?: string; search?: string; page?: number; limit?: number }) => http.get<{ items: ProfileRow[]; total: number }>('/salon/customer-profiles/page', p) },
};
