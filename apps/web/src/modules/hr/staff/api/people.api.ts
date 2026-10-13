/**
 * Staff directory and the login actions of the Staff pages. HR record
 * create/update stays on `staffApi`; permissions, branch and on/off of a
 * login stay on `teamApi`. This file adds the joined directory, the profile,
 * analytics and the newer login endpoints.
 */

import { apiClient } from '@core/api/client';
import type { SalaryType, StaffDocument, StaffStatus } from '@modules/organization/staff/api/staff.api';
import type { UserRole } from '@modules/organization/team/api/team.api';

export type PersonStatus = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE' | 'LEFT';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';

interface Person {
  /** Staff id when there is an HR record, else the user id. Used in /staff/:id. */
  id: string;
  userId: string | null;
  staffId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole | null;
  designation: string | null;
  department: string | null;
  staffNumber: string | null;
  staffStatus: StaffStatus | null;
  joinDate: string | null;
  endDate: string | null;
  shop: { id: string; name: string } | null;
  status: PersonStatus;
  hasLogin: boolean;
  /** Only for viewers with "View Team". */
  login: { isActive: boolean; lastLoginAt: string | null; permissionsCount: number; neverLoggedIn: boolean } | null;
}

export interface DirectoryPerson extends Person {
  onDuty: { via: 'SHIFT' | 'ATTENDANCE'; since: string; label: string | null } | null;
  todayAttendance: AttendanceStatus | null;
  /** Only for viewers with "View Sales". */
  today: { sales: number; bills: number } | null;
}

interface StaffRecord {
  id: string;
  staffNumber: string;
  fullName: string;
  fatherName: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth: string | null;
  cnic: string | null;
  phone: string;
  altPhone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  designation: string;
  department: string | null;
  joinDate: string;
  endDate: string | null;
  status: StaffStatus;
  salaryType: SalaryType;
  baseSalary: number;
  workingHoursPerDay: number;
  workingDaysPerMonth: number;
  bankName: string | null;
  accountNumber: string | null;
  iban: string | null;
  avatarUrl: string | null;
  cnicFrontUrl: string | null;
  cnicBackUrl: string | null;
  shopId: string | null;
  notes: string | null;
  userId: string | null;
  documents: StaffDocument[];
}

export interface Profile {
  person: Person;
  viewer: { team: boolean; sales: boolean; activity: boolean; commission: boolean; owner: boolean; self: boolean; manage: boolean };
  onDuty: { via: 'SHIFT' | 'ATTENDANCE'; since: string; label: string } | null;
  staff: StaffRecord | null;
  login: {
    id: string; email: string; phone: string | null; role: UserRole; isActive: boolean; permissions: string[];
    lastLoginAt: string | null; createdAt: string; shop: { id: string; name: string } | null;
  } | null;
  sessions: Array<{ id: string; deviceName: string | null; userAgent: string | null; ipAddress: string | null; location: string | null; lastUsedAt: string; createdAt: string }>;
  logins: Array<{ id: string; success: boolean; failureReason: string | null; deviceName: string | null; ipAddress: string | null; location: string | null; isNewDevice: boolean; createdAt: string }>;
  attendance: {
    month: string; present: number; late: number; halfDay: number; absent: number; leave: number;
    hours: number; overtime: number; lateMinutes: number;
    days: Array<{ date: string; status: AttendanceStatus; checkIn: string | null; checkOut: string | null; workedHours: number }>;
    leaves: Array<{ id: string; type: string; startDate: string; endDate: string; days: number; status: string; reason: string | null }>;
  } | null;
  salary: {
    salaryType: SalaryType; baseSalary: number; workingHoursPerDay: number; workingDaysPerMonth: number;
    unpaid: number; lastPaidAt: string | null;
    payments: Array<{ id: string; paymentNumber: string; periodStart: string; periodEnd: string; netAmount: number; paidAmount: number; balanceAmount: number; status: string; paidAt: string | null }>;
  } | null;
  commission: { enrolled: boolean; since: string | null; payouts: Array<{ period: string; amount: number; paidAt: string; note: string | null }> } | null;
  sales: {
    today: { sales: number; bills: number };
    month: { sales: number; bills: number };
    avgBill: number;
    daily: Array<{ day: string; sales: number }>;
    branches: Array<{ shopId: string | null; name: string; sales: number; bills: number }>;
  } | null;
  activity: Array<{ id: string; action: string; entityType: string | null; description: string; createdAt: string }>;
  history: { sales: number; returns: number; expenses: number; shifts: number; purchases: number; any: boolean } | null;
}

interface PeopleAnalytics {
  period: { from: string; to: string };
  headcount: {
    total: number;
    byRole: Array<{ key: string; count: number }>;
    byBranch: Array<{ key: string; count: number }>;
    byStatus: Array<{ key: string; count: number }>;
    tenure: { under3m: number; under1y: number; under3y: number; over3y: number };
  };
  months: Array<{ key: string; joined: number; left: number }>;
  sellers: Array<{ userId: string; name: string; sales: number; bills: number; avgBill: number }> | null;
  attendance: Array<{ name: string; present: number; late: number; absent: number; leave: number; hours: number; lateMinutes: number }>;
  logins: {
    daily: Array<{ day: string; ok: number; failed: number }>;
    failed: number;
    people: Array<{ userId: string; name: string; count: number }>;
    neverLoggedIn: Array<{ id: string; name: string }>;
  } | null;
}

interface InvitePayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: Exclude<UserRole, 'OWNER' | 'SUPER_ADMIN'>;
  shopId?: string;
  permissions: string[];
  staffId?: string;
  designation?: string;
  salaryType?: SalaryType;
  baseSalary?: number;
  joinDate?: string;
  sendEmail?: boolean;
}

interface InviteResult {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  shopId: string | null;
  staffId: string;
  linked: 'existing' | 'matched' | 'new';
  emailSent: boolean;
}

interface UpdateLoginPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  shopId?: string | null;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const peopleApi = {
  list: () => apiClient.get<{ data: DirectoryPerson[] }>('/staff/people/all').then(unwrap),
  profile: (id: string) => apiClient.get<{ data: Profile }>(`/staff/people/${id}/profile`).then(unwrap),
  analytics: (p: { from?: string; to?: string }) =>
    apiClient.get<{ data: PeopleAnalytics }>('/staff/people/analytics', { params: p }).then(unwrap),
  setStatus: (staffId: string, status: StaffStatus, endDate?: string) =>
    apiClient.post<{ data: { id: string; status: StaffStatus } }>(`/staff/people/${staffId}/status`, { status, endDate }).then(unwrap),

  invite: (p: InvitePayload) => apiClient.post<{ data: InviteResult }>('/team/invite', p).then(unwrap),
  updateLogin: (userId: string, p: UpdateLoginPayload) => apiClient.patch<{ data: unknown }>(`/team/${userId}`, p).then(unwrap),
  /** Sets the login on or off; repeating the call changes nothing. */
  setActive: (userId: string, isActive: boolean) =>
    apiClient.patch<{ data: { id: string; isActive: boolean } }>(`/team/${userId}/toggle`, { isActive }).then(unwrap),
  resetPassword: (userId: string, password: string) =>
    apiClient.post<{ data: { ok: boolean; sessionsClosed: number } }>(`/team/${userId}/reset-password`, { password }).then(unwrap),
  signOut: (userId: string, sessionId?: string) =>
    apiClient.delete<{ data: { ok: boolean; sessionsClosed: number } }>(sessionId ? `/team/${userId}/sessions/${sessionId}` : `/team/${userId}/sessions`).then(unwrap),
};
