import { apiClient } from '@core/api/client';

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
  station?: any;
  liveBilling?: { actualMinutes: number; billableMinutes: number; currentAmount: number };
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gamingSessionsApi = {
  start: (data: {
    stationId: string; customerId?: string; customerName?: string;
    customerPhone?: string; playerCount?: number; gameSelected?: string; ratePerHour?: number;
  }) => apiClient.post('/gaming/cafe-sessions/start', data).then(unwrap<GamingCafeSession>),

  list: (params?: { status?: string; stationId?: string; from?: string; to?: string }) =>
    apiClient.get('/gaming/cafe-sessions', { params }).then(unwrap<GamingCafeSession[]>),

  active: () => apiClient.get('/gaming/cafe-sessions/active').then(unwrap<GamingCafeSession[]>),

  getOne: (id: string) => apiClient.get('/gaming/cafe-sessions/' + id).then(unwrap<GamingCafeSession>),

  pause: (id: string) => apiClient.post('/gaming/cafe-sessions/' + id + '/pause').then(unwrap<GamingCafeSession>),

  resume: (id: string) => apiClient.post('/gaming/cafe-sessions/' + id + '/resume').then(unwrap<GamingCafeSession>),

  end: (id: string, data: {
    foodCharges?: number; additionalCharges?: number; discount?: number;
    paidAmount?: number; paymentMethod?: string; notes?: string;
  }) => apiClient.post('/gaming/cafe-sessions/' + id + '/end', data).then(unwrap<GamingCafeSession>),

  cancel: (id: string, reason?: string) =>
    apiClient.post('/gaming/cafe-sessions/' + id + '/cancel', { reason }).then(unwrap<GamingCafeSession>),
};
