import { apiClient } from './client';

export type StaffStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED' | 'RESIGNED';
export type SalaryType = 'MONTHLY' | 'DAILY' | 'HOURLY' | 'PER_TASK' | 'COMMISSION' | 'HYBRID';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';
export type LeaveType = 'CASUAL' | 'SICK' | 'ANNUAL' | 'UNPAID' | 'EMERGENCY' | 'MATERNITY' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type SalaryPaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED';
export type StaffGender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Staff {
  id: string;
  staffNumber: string;
  fullName: string;
  fatherName?: string | null;
  gender?: StaffGender | null;
  dateOfBirth?: string | null;
  cnic?: string | null;
  phone: string;
  altPhone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  emergencyRelation?: string | null;
  designation: string;
  department?: string | null;
  joinDate: string;
  endDate?: string | null;
  status: StaffStatus;
  salaryType: SalaryType;
  baseSalary: number;
  workingHoursPerDay: number;
  workingDaysPerMonth: number;
  bankName?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  avatarUrl?: string | null;
  cnicFrontUrl?: string | null;
  cnicBackUrl?: string | null;
  shopId?: string | null;
  notes?: string | null;
  shop?: { id: string; name: string } | null;
  _count?: { attendances: number; leaves: number; salaryPayments: number };
  createdAt: string;
  updatedAt: string;
}

export interface StaffDetail extends Staff {
  documents: StaffDocument[];
  attendances: Attendance[];
  leaves: StaffLeave[];
  salaryPayments: SalaryPayment[];
}

export interface StaffDocument {
  id: string;
  staffId: string;
  type: string;
  title: string;
  fileUrl: string;
  fileName?: string | null;
  notes?: string | null;
  uploadedAt: string;
}

export interface Attendance {
  id: string;
  staffId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  checkInPhotoUrl?: string | null;
  checkOutPhotoUrl?: string | null;
  checkInLocation?: string | null;
  checkOutLocation?: string | null;
  status: AttendanceStatus;
  workedHours: number;
  overtimeHours: number;
  isLate: boolean;
  lateMinutes: number;
  notes?: string | null;
  staff?: { id: string; fullName: string; avatarUrl?: string | null; designation: string };
}

export interface StaffLeave {
  id: string;
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string | null;
  status: LeaveStatus;
  rejectedReason?: string | null;
  createdAt: string;
}

export interface SalaryPayment {
  id: string;
  staffId: string;
  paymentNumber: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  daysWorked: number;
  hoursWorked: number;
  overtimePay: number;
  commissionEarned: number;
  bonuses: number;
  advances: number;
  leaveDeduction: number;
  lateDeduction: number;
  otherDeductions: number;
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: string;
  status: SalaryPaymentStatus;
  paidAt?: string | null;
  notes?: string | null;
  staff?: { id: string; fullName: string; avatarUrl?: string | null; designation: string };
  createdAt: string;
}

export interface CreateStaffPayload {
  fullName: string;
  fatherName?: string;
  gender?: StaffGender;
  dateOfBirth?: string;
  cnic?: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  designation: string;
  department?: string;
  joinDate: string;
  status?: StaffStatus;
  salaryType: SalaryType;
  baseSalary: number;
  workingHoursPerDay?: number;
  workingDaysPerMonth?: number;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  avatarUrl?: string;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  shopId?: string;
  notes?: string;
}

export interface MarkAttendancePayload {
  staffId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status?: AttendanceStatus;
  checkInPhotoUrl?: string;
  checkOutPhotoUrl?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  notes?: string;
}

export interface CreateLeavePayload {
  staffId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ProcessSalaryPayload {
  staffId: string;
  periodStart: string;
  periodEnd: string;
  overtimePay?: number;
  commissionEarned?: number;
  bonuses?: number;
  advances?: number;
  otherDeductions?: number;
  paidAmount?: number;
  paymentMethod?: string;
  notes?: string;
}

export interface StaffStats {
  total: number;
  active: number;
  onLeave: number;
  presentToday: number;
  absentToday: number;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const staffApi = {
  list: (params?: { search?: string; status?: string }) =>
    apiClient.get<{ data: Staff[] }>('/staff', { params }).then(unwrap),

  stats: () =>
    apiClient.get<{ data: StaffStats }>('/staff/stats').then(unwrap),

  getOne: (id: string) =>
    apiClient.get<{ data: StaffDetail }>(`/staff/${id}`).then(unwrap),

  create: (payload: CreateStaffPayload) =>
    apiClient.post<{ data: Staff }>('/staff', payload).then(unwrap),

  update: (id: string, payload: Partial<CreateStaffPayload>) =>
    apiClient.patch<{ data: Staff }>(`/staff/${id}`, payload).then(unwrap),

  remove: (id: string) =>
    apiClient.delete<{ data: any }>(`/staff/${id}`).then(unwrap),

  // Attendance
  todayAttendance: () =>
    apiClient.get<{ data: Attendance[] }>('/staff/attendance/today').then(unwrap),

  getAttendance: (staffId: string, month?: string) =>
    apiClient
      .get<{ data: Attendance[] }>(`/staff/attendance/${staffId}`, { params: { month } })
      .then(unwrap),

  markAttendance: (payload: MarkAttendancePayload) =>
    apiClient.post<{ data: Attendance }>('/staff/attendance', payload).then(unwrap),

  // Leaves
  createLeave: (payload: CreateLeavePayload) =>
    apiClient.post<{ data: StaffLeave }>('/staff/leaves', payload).then(unwrap),

  approveLeave: (id: string) =>
    apiClient.post<{ data: StaffLeave }>(`/staff/leaves/${id}/approve`).then(unwrap),

  rejectLeave: (id: string, reason?: string) =>
    apiClient.post<{ data: StaffLeave }>(`/staff/leaves/${id}/reject`, { reason }).then(unwrap),

  // Salaries
  getSalaries: (staffId?: string) =>
    apiClient.get<{ data: SalaryPayment[] }>('/staff/salaries', { params: { staffId } }).then(unwrap),

  getSalary: (id: string) =>
    apiClient.get<{ data: SalaryPayment }>(`/staff/salaries/${id}`).then(unwrap),

  processSalary: (payload: ProcessSalaryPayload) =>
    apiClient.post<{ data: SalaryPayment }>('/staff/salaries', payload).then(unwrap),

  // Documents
  addDocument: (staffId: string, payload: { type: string; title: string; fileUrl: string; fileName?: string; notes?: string }) =>
    apiClient.post<{ data: StaffDocument }>(`/staff/${staffId}/documents`, payload).then(unwrap),

  removeDocument: (staffId: string, docId: string) =>
    apiClient.delete<{ data: any }>(`/staff/${staffId}/documents/${docId}`).then(unwrap),
};
