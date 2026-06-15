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

function unwrap<T>(res: any): T {
  const body = res?.data;
  if (body?.data) return body.data as T;
  return body as T;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const staffApi = {
  list: (params?: { search?: string; status?: string }): Promise<Staff[]> =>
    apiClient.get('/staff', { params }).then((r) => unwrapArr<Staff>(r)),

  stats: (): Promise<StaffStats> =>
    apiClient.get('/staff/stats').then((r) => unwrap<StaffStats>(r)),

  getOne: (id: string): Promise<StaffDetail> =>
    apiClient.get(`/staff/${id}`).then((r) => unwrap<StaffDetail>(r)),

  create: (payload: CreateStaffPayload): Promise<Staff> =>
    apiClient.post('/staff', payload).then((r) => unwrap<Staff>(r)),

  update: (id: string, payload: Partial<CreateStaffPayload>): Promise<Staff> =>
    apiClient.patch(`/staff/${id}`, payload).then((r) => unwrap<Staff>(r)),

  remove: (id: string): Promise<any> =>
    apiClient.delete(`/staff/${id}`).then((r) => unwrap<any>(r)),

  // Attendance
  todayAttendance: (): Promise<Attendance[]> =>
    apiClient.get('/staff/attendance/today').then((r) => unwrapArr<Attendance>(r)),

  getAttendance: (staffId: string, month?: string): Promise<Attendance[]> =>
    apiClient
      .get(`/staff/attendance/${staffId}`, { params: { month } })
      .then((r) => unwrapArr<Attendance>(r)),

  markAttendance: (payload: MarkAttendancePayload): Promise<Attendance> =>
    apiClient.post('/staff/attendance', payload).then((r) => unwrap<Attendance>(r)),

  // Leaves
  createLeave: (payload: any): Promise<StaffLeave> =>
    apiClient.post('/staff/leaves', payload).then((r) => unwrap<StaffLeave>(r)),

  approveLeave: (id: string): Promise<StaffLeave> =>
    apiClient.post(`/staff/leaves/${id}/approve`).then((r) => unwrap<StaffLeave>(r)),

  rejectLeave: (id: string, reason?: string): Promise<StaffLeave> =>
    apiClient.post(`/staff/leaves/${id}/reject`, { reason }).then((r) => unwrap<StaffLeave>(r)),

  // Salaries
  getSalaries: (staffId?: string): Promise<SalaryPayment[]> =>
    apiClient.get('/staff/salaries', { params: { staffId } }).then((r) => unwrapArr<SalaryPayment>(r)),

  getSalary: (id: string): Promise<SalaryPayment> =>
    apiClient.get(`/staff/salaries/${id}`).then((r) => unwrap<SalaryPayment>(r)),

  processSalary: (payload: ProcessSalaryPayload): Promise<SalaryPayment> =>
    apiClient.post('/staff/salaries', payload).then((r) => unwrap<SalaryPayment>(r)),
};
