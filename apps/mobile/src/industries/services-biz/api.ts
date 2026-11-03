/** Services endpoints (same paths and shapes as apps/web/src/industries/services-biz/api). They need the server; screens show the last saved data offline. */

import { http } from '../_shared/serviceKit';

export type JobView = 'open' | 'booked' | 'working' | 'waiting' | 'ready' | 'late' | 'unpaid' | 'closed' | 'all';
export interface JobPart { id: string; partName: string; quantity: number; unitPrice: number; total: number; isCustomerSupplied: boolean; isUnderWarranty: boolean }
export interface ServiceJob {
  id: string; jobNumber: string; customerId?: string | null; customerName?: string | null; customerPhone?: string | null; serviceName: string; category: string; priority: string; status: string; problemDescription: string;
  brand?: string | null; modelNumber?: string | null; locationType: string; serviceAddress?: string | null; scheduledStart?: string | null; primaryTechnicianId?: string | null;
  visitCharge: number; labourCharge: number; partsCharge: number; transportCharge: number; emergencyCharge: number; discountAmount: number; taxAmount: number; totalCharge: number; paidAmount: number; advanceAmount: number;
  paymentStatus: string; jobWarrantyDays: number; area?: string | null; city?: string | null; customerRating?: number | null; jobWarrantyExpiryDate?: string | null; assistantTechnicianIds?: string[]; parts: JobPart[]; technicianName?: string | null; due?: number; isLate?: boolean; createdAt: string; technicianNotes?: string | null;
}
export interface JobDetail extends ServiceJob {
  statusHistory: Array<{ id: string; toStatus: string; changedAt: string; reason?: string | null }>;
  customer: { id: string; name: string; phone?: string | null; balance: number } | null;
  technician: { staff: { fullName: string; phone?: string | null } } | null;
  billSale: { id: string; saleNumber: string; total: number; paidAmount: number; creditAmount: number } | null;
  returned: number; due: number; advanceOnKhata: number;
}
export interface JobPage { items: ServiceJob[]; total: number; totals: { bill: number; paid: number; due: number } }
export interface JobStats { open: number; booked: number; unassigned: number; working: number; waiting: number; ready: number; late: number; urgent: number; readyDue: number; todayIn: number; todayDone: number; monthDone: number; monthRevenue: number; unpaidJobs: number; unpaidDue: number }
export interface JobCreate {
  customerId?: string; customerName?: string; customerPhone?: string; serviceId?: string; serviceName?: string; category?: string; priority?: string; problemDescription?: string; brand?: string; modelNumber?: string;
  locationType?: string; serviceAddress?: string; scheduledStart?: string; visitCharge?: number; labourCharge?: number; transportCharge?: number; emergencyCharge?: number; discountAmount?: number;
  primaryTechnicianId?: string; advancePaid?: number; advanceMethod?: string; parts?: Array<{ partName: string; quantity?: number; unitPrice?: number }>;
}
export interface Technician { id: string; staffId: string; level: string; status: string; primarySkill?: string | null; commissionType: string; commissionPct: number; fixedPerJob: number; openJobs?: number; totalJobs: number; completedJobs: number; avgRating?: number | null; isActive: boolean; staff?: { id: string; fullName: string; phone?: string | null } | null }
export interface Suggestion extends Technician { matchScore: number; distanceKm: number | null }
export interface CatalogItem { id: string; name: string; category: string; chargeType: string; baseCharge: number; visitCharge: number; hourlyRate: number; estimatedDurationMin: number; warrantyDays: number; isActive: boolean; totalJobs: number }
export interface QuoteLine { kind: string; description: string; quantity: number; unitPrice: number; total?: number }
export interface Quote { id: string; quoteNumber: string; customerName: string; customerPhone: string; serviceName: string; status: string; totalAmount: number; lines: QuoteLine[]; validUntil?: string | null; convertedJobId?: string | null; isExpired: boolean; problemDescription: string }
export interface AmcVisit { id: string; visitNumber: number; scheduledDate: string; completedAt?: string | null; technicianId?: string | null; serviceJobId?: string | null; status: string; visitType: string; workDone?: string | null }
export interface AmcDetail extends AmcContract { visits: AmcVisit[]; due: number; coveredItems?: string[] | null }
export interface AmcContract { id: string; amcNumber: string; customerName: string; customerPhone: string; type: string; status: string; numberOfVisits: number; visitsUsed: number; visitsRemaining: number; contractValue: number; amountPaid: number; startDate: string; endDate: string; serviceAddress: string }
export interface WarrantyClaim { id: string; claimNumber: string; customerName: string; customerPhone: string; issueDescription: string; claimDate: string; status: string; resolutionType?: string | null; originalJob: { jobNumber: string; serviceName: string } | null }
export interface WarrantyJob { id: string; jobNumber: string; serviceName: string; customerName?: string | null; jobWarrantyExpiryDate: string; jobWarrantyDays: number }
export interface CommissionStatement { technicians: Array<{ technicianId: string; name: string; jobs: number; work: number; commission: number; paid: number; unpaid: number }>; totals: { jobs: number; commission: number; paid: number; unpaid: number } }

export const servicesApi = {
  overview: () => http.get<Record<string, any>>('/services-biz/dashboard/overview'),
  jobs: {
    page: (p: { view?: JobView; search?: string; page?: number; limit?: number; sort?: string }) => http.get<JobPage>('/services-biz/jobs', { page: 1, ...p }),
    stats: () => http.get<JobStats>('/services-biz/jobs/stats'),
    getOne: (id: string) => http.get<JobDetail>(`/services-biz/jobs/${id}`),
    create: (d: JobCreate) => http.post<JobDetail>('/services-biz/jobs', d),
    status: (id: string, status: string, reason?: string) => http.patch<JobDetail>(`/services-biz/jobs/${id}/status`, { status, reason }),
    assign: (id: string, primaryTechnicianId: string, assistantTechnicianIds?: string[]) => http.post<JobDetail>(`/services-biz/jobs/${id}/assign`, { primaryTechnicianId, ...(assistantTechnicianIds ? { assistantTechnicianIds } : {}) }),
    update: (id: string, d: Record<string, unknown>) => http.patch<JobDetail>(`/services-biz/jobs/${id}`, d),
    addPart: (id: string, d: { partName: string; quantity?: number; unitPrice?: number; costPrice?: number; isCustomerSupplied?: boolean; isUnderWarranty?: boolean }) => http.post<JobDetail>(`/services-biz/jobs/${id}/parts`, d),
    removePart: (id: string, partId: string) => http.patch<JobDetail>(`/services-biz/jobs/${id}/parts/${partId}/remove`),
    addPayment: (id: string, amount: number, paymentMethod: string) => http.post<JobDetail>(`/services-biz/jobs/${id}/payments`, { amount, paymentMethod }),
    rate: (id: string, d: { rating: number; feedback?: string }) => http.post<JobDetail>(`/services-biz/jobs/${id}/rating`, d),
    returnVisit: (id: string, d: { returnVisitDate: string; reason: string }) => http.post<JobDetail>(`/services-biz/jobs/${id}/return-visit`, d),
    bill: (id: string, d: { paidAmount?: number; paymentMethod?: string; jobWarrantyDays?: number }) => http.post<JobDetail & { sale: { id: string; saleNumber: string } | null; change: number }>(`/services-biz/jobs/${id}/bill`, d),
    cancel: (id: string, reason: string) => http.post<JobDetail>(`/services-biz/jobs/${id}/cancel`, { reason }),
  },
  dispatch: { suggest: (jobId: string) => http.get<Suggestion[]>(`/services-biz/dispatch/suggest/${jobId}`) },
  technicians: {
    list: () => http.get<Technician[]>('/services-biz/technicians'),
    upsert: (d: Record<string, unknown>) => http.post<Technician>('/services-biz/technicians', d),
    status: (id: string, status: string) => http.patch<Technician>(`/services-biz/technicians/${id}/status`, { status }),
    commission: (from: string, to: string, technicianId?: string) => http.get<CommissionStatement>('/services-biz/technicians/commission', { from, to, technicianId }),
    pay: (d: { technicianId: string; from: string; to: string; paymentMethod?: string }) => http.post<{ ref: string; amount: number }>('/services-biz/technicians/commission/pay', d),
  },
  catalog: {
    list: () => http.get<CatalogItem[]>('/services-biz/catalog'),
    create: (d: Record<string, unknown>) => http.post<CatalogItem>('/services-biz/catalog', d),
    update: (id: string, d: Record<string, unknown>) => http.patch<CatalogItem>(`/services-biz/catalog/${id}`, d),
  },
  quotes: {
    list: (p?: { view?: string }) => http.get<Quote[]>('/services-biz/quotes', p),
    create: (d: Record<string, unknown>) => http.post<Quote>('/services-biz/quotes', d),
    send: (id: string) => http.post<Quote>(`/services-biz/quotes/${id}/send`),
    accept: (id: string) => http.post<Quote>(`/services-biz/quotes/${id}/accept`),
    reject: (id: string, reason?: string) => http.post<Quote>(`/services-biz/quotes/${id}/reject`, { reason }),
    convert: (id: string, d: { scheduledStart?: string; primaryTechnicianId?: string } = {}) => http.post<ServiceJob>(`/services-biz/quotes/${id}/convert`, d),
  },
  amc: {
    list: (p?: { status?: string }) => http.get<AmcContract[]>('/services-biz/amc', p),
    getOne: (id: string) => http.get<AmcDetail>(`/services-biz/amc/${id}`),
    scheduleVisit: (id: string, d: { scheduledDate: string; technicianId?: string }) => http.post<AmcDetail>(`/services-biz/amc/${id}/visits/schedule`, d),
    visitJob: (id: string, visitId: string, d: { primaryTechnicianId?: string } = {}) => http.post<ServiceJob>(`/services-biz/amc/${id}/visits/${visitId}/job`, d),
    completeVisit: (id: string, visitId: string, d: { workDone?: string; technicianId?: string }) => http.post<AmcDetail>(`/services-biz/amc/${id}/visits/${visitId}/complete`, d),
    create: (d: Record<string, unknown>) => http.post<AmcContract>('/services-biz/amc', d),
    pay: (id: string, amount: number, paymentMethod: string) => http.post<AmcContract>(`/services-biz/amc/${id}/payments`, { amount, paymentMethod }),
    renew: (id: string, d: { contractValue?: number; amountPaid?: number; paymentMode?: string }) => http.post<AmcContract>(`/services-biz/amc/${id}/renew`, d),
    cancel: (id: string, reason: string) => http.post<AmcContract>(`/services-biz/amc/${id}/cancel`, { reason }),
  },
  warranty: {
    register: (search?: string) => http.get<WarrantyJob[]>('/services-biz/warranty/register', { search }),
    claims: (p?: { status?: string }) => http.get<WarrantyClaim[]>('/services-biz/warranty/claims', p),
    create: (d: { originalJobId?: string; customerName?: string; customerPhone?: string; issueDescription: string }) => http.post<WarrantyClaim>('/services-biz/warranty/claims', d),
    approve: (id: string, resolutionType: string, notes?: string) => http.post<WarrantyClaim>(`/services-biz/warranty/claims/${id}/approve`, { resolutionType, notes }),
    reject: (id: string, reason: string) => http.post<WarrantyClaim>(`/services-biz/warranty/claims/${id}/reject`, { reason }),
  },
};
