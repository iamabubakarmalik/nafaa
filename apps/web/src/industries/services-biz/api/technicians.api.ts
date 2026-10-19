import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type TechStatus = 'AVAILABLE' | 'ON_JOB' | 'ON_BREAK' | 'OFF_DUTY' | 'ON_LEAVE' | 'UNAVAILABLE';
export type TechLevel = 'APPRENTICE' | 'JUNIOR' | 'SENIOR' | 'EXPERT' | 'MASTER' | 'SUPERVISOR' | 'MANAGER';
export type CommissionType = 'PERCENTAGE' | 'FIXED' | 'BOTH' | 'NONE';

export interface Technician {
  id: string;
  staffId: string;
  employeeCode?: string | null;
  level: TechLevel;
  status: TechStatus;
  primarySkill?: string | null;
  secondarySkills: string[];
  experienceYears: number;
  cnicNumber?: string | null;
  vehicleNumber?: string | null;
  serviceAreas: string[];
  homeCity?: string | null;
  workingDays: number[];
  workStartTime: string;
  workEndTime: string;
  isAvailableForEmergency: boolean;
  commissionType: CommissionType;
  commissionPct: number;
  fixedPerJob: number;
  monthlySalary: number;
  maxOngoingJobs: number;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  totalRevenue: number;
  totalCommission: number;
  avgRating?: number | null;
  totalReviews: number;
  isActive: boolean;
  staff?: { id: string; fullName: string; phone?: string | null; staffNumber?: string | null } | null;
  openJobs?: number;
}

export type TechnicianInput = Partial<Pick<Technician, 'employeeCode' | 'level' | 'status' | 'primarySkill' | 'experienceYears' | 'cnicNumber' | 'vehicleNumber'
  | 'serviceAreas' | 'homeCity' | 'workingDays' | 'workStartTime' | 'workEndTime' | 'isAvailableForEmergency' | 'commissionType' | 'commissionPct'
  | 'fixedPerJob' | 'monthlySalary' | 'maxOngoingJobs' | 'isActive'>> & { staffId: string };

export interface CommissionLine {
  jobId: string; jobNumber: string; saleNumber: string; billedAt: string; customerName?: string | null; serviceName: string;
  technicianId: string; technicianName: string; bill: number; work: number; refunded: number; commission: number; paidRef: string | null;
}
export interface CommissionStatement {
  from: string; to: string;
  technicians: Array<{ technicianId: string; name: string; jobs: number; bill: number; work: number; commission: number; paid: number; unpaid: number }>;
  totals: { jobs: number; commission: number; paid: number; unpaid: number };
  lines: CommissionLine[];
}
export interface CommissionPayout {
  ref: string; technicianId: string | null; technicianName: string; paidAt: string; amount: number;
  expense: { expenseNumber: string; paymentMethod: string; status: string; expenseDate?: string } | null;
  jobs: Array<{ id: string; jobNumber: string; customerName?: string | null; serviceName: string; totalCharge: number; saleNumber: string | null }>;
}

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;
const base = '/services-biz/technicians';

export const techniciansApi = {
  upsert: (data: TechnicianInput) => apiClient.post(base, data).then(unwrap<Technician>),
  list: (params?: { status?: TechStatus; search?: string }) => apiClient.get(base, { params }).then(unwrap<Technician[]>),
  updateStatus: (id: string, status: TechStatus) => apiClient.patch(`${base}/${id}/status`, { status }).then(unwrap<Technician>),
  remove: (id: string) => apiClient.delete(`${base}/${id}`).then(unwrap<Technician>),
  commission: (from: string, to: string, technicianId?: string) => apiClient.get(`${base}/commission`, { params: { from, to, technicianId } }).then(unwrap<CommissionStatement>),
  payouts: (technicianId?: string) => apiClient.get(`${base}/commission/payouts`, { params: { technicianId } }).then(unwrap<Array<Omit<CommissionPayout, 'jobs'> & { jobs: number }>>),
  slip: (ref: string) => apiClient.get(`${base}/commission/payouts/${encodeURIComponent(ref)}`).then(unwrap<CommissionPayout>),
  pay: (data: { technicianId: string; from: string; to: string; jobIds?: string[]; paymentMethod?: PaymentMethod; note?: string }) =>
    apiClient.post(`${base}/commission/pay`, data).then(unwrap<CommissionPayout>),
};
