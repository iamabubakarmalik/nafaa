import { apiClient } from '@core/api/client';
import type { GamingStation } from './stations.api';

export type GamingCafeSessionStatus = 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED';

export interface GamingCafeSession {
  id: string;
  stationId: string;
  sessionNumber: string;
  status: GamingCafeSessionStatus;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  playerCount: number;
  gameSelected?: string;
  startedAt: string;
  pausedAt?: string;
  resumedAt?: string;
  endedAt?: string;
  totalPauseMinutes: number;
  actualMinutes?: number;
  billableMinutes?: number;
  ratePerHour: number;
  baseAmount: number;
  foodCharges: number;
  additionalCharges: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: string;
  isTournamentMatch: boolean;
  tournamentId?: string;
  notes?: string;
  station?: GamingStation | null;
  liveBilling?: { actualMinutes: number; billableMinutes: number; pauseMinutes?: number; currentAmount: number };
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: { data?: { data?: unknown } }): T => (res.data?.data ?? res.data) as T;

export interface SessionPage { items: GamingCafeSession[]; total: number; page: number; limit: number; totals: { ended: number; amount: number; minutes: number } }

export const gamingSessionsApi = {
  start: (data: {
    stationId: string; customerId?: string; customerName?: string;
    customerPhone?: string; playerCount?: number; gameSelected?: string; ratePerHour?: number; notes?: string;
  }) => apiClient.post('/gaming/cafe-sessions/start', data).then(unwrap<GamingCafeSession>),
  page: (params: { status?: string; stationId?: string; from?: string; to?: string; search?: string; page: number; limit: number }) =>
    apiClient.get('/gaming/cafe-sessions', { params }).then(unwrap<SessionPage>),
  active: () => apiClient.get('/gaming/cafe-sessions/active').then(unwrap<GamingCafeSession[]>),
  counter: () => apiClient.get('/gaming/cafe-sessions/counter').then(unwrap<{ timeProductId: string; sessions: GamingCafeSession[] }>),
  closeSale: (saleId: string, sessions: Array<{ id: string; amount: number; minutes: number }>) =>
    apiClient.post('/gaming/cafe-sessions/close-sale', { saleId, sessions }).then(unwrap<{ saleNumber: string; sessions: Array<{ id: string; sessionNumber: string; totalAmount: number }> }>),
  pause: (id: string) => apiClient.post('/gaming/cafe-sessions/' + id + '/pause').then(unwrap<GamingCafeSession>),
  resume: (id: string) => apiClient.post('/gaming/cafe-sessions/' + id + '/resume').then(unwrap<GamingCafeSession>),
  end: (id: string, data: {
    foodCharges?: number; additionalCharges?: number; discount?: number;
    paidAmount?: number; paymentMethod?: string; notes?: string;
  }) => apiClient.post('/gaming/cafe-sessions/' + id + '/end', data)
    .then(unwrap<GamingCafeSession & { saleId?: string | null; change?: number }>),
  cancel: (id: string, reason: string) =>
    apiClient.post('/gaming/cafe-sessions/' + id + '/cancel', { reason }).then(unwrap<GamingCafeSession>),
};
