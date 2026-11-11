/**
 * Partner API calls, one function per endpoint.
 */

import { api } from './client';
import type {
  AuthResult, Dashboard, Earning, Kit, Lead, LeadInput, LeadStage, Me, Paged, Payout, Presign, Statement, TeamMember, Balances, VisitInput, VisitResult,
} from './types';

export interface ApplyInput {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  cnic?: string;
  city?: string;
  type: string;
  payoutMethod?: string;
  payoutAccount?: string;
  payoutTitle?: string;
  bankName?: string;
  managerCode?: string;
}

export interface LeadQuery { stage?: LeadStage | ''; search?: string; due?: boolean; page?: number; limit?: number }

export const partnerApi = {
  apply: (body: ApplyInput) => api.post<AuthResult>('/partner/auth/apply', body),
  login: (login: string, password: string) => api.post<AuthResult>('/partner/auth/login', { login, password }),
  logout: (refreshToken?: string | null) => api.post('/partner/auth/logout', { refreshToken }),
  me: () => api.get<Me>('/partner/auth/me'),
  changePassword: (current: string, next: string) => api.post('/partner/auth/password', { current, next }),

  dashboard: () => api.get<Dashboard>('/partner/dashboard'),

  leads: (q: LeadQuery) => api.get<Paged<Lead>>('/partner/leads', {
    stage: q.stage || undefined, search: q.search || undefined, due: q.due ? '1' : undefined, page: q.page, limit: q.limit,
  }),
  lead: (id: string) => api.get<Lead>(`/partner/leads/${id}`),
  createLead: (body: LeadInput) => api.post<Lead>('/partner/leads', body),
  updateLead: (id: string, body: LeadInput) => api.patch<Lead>(`/partner/leads/${id}`, body),

  createVisit: (body: VisitInput) => api.post<VisitResult>('/partner/visits', body),
  presign: (body: { fileName: string; contentType: string; fileSize: number }) => api.post<Presign>('/partner/uploads/presign', body),

  earnings: (q: { month?: string; status?: string; page?: number; limit?: number }) =>
    api.get<Paged<Earning> & { balances: Balances }>('/partner/earnings', { month: q.month || undefined, status: q.status || undefined, page: q.page, limit: q.limit }),
  payouts: () => api.get<Payout[]>('/partner/payouts'),
  requestPayout: () => api.post<Payout>('/partner/payouts'),
  statement: (month: string) => api.get<Statement>(`/partner/statement/${month}`),

  updateProfile: (body: Partial<Pick<Me, 'city' | 'email' | 'payoutMethod' | 'payoutAccount' | 'payoutTitle' | 'bankName'>>) => api.patch('/partner/profile', body),
  kit: () => api.get<Kit>('/partner/kit'),
  team: () => api.get<{ month?: string; members: TeamMember[] }>('/partner/team'),
};
