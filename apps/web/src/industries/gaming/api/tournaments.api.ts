import { apiClient } from '@core/api/client';

export interface GamingTournament {
  id: string;
  tournamentNumber: string;
  name: string;
  description?: string;
  gameName: string;
  platform: string;
  format?: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  prizePool: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  scheduledDate: string;
  scheduledEndDate?: string;
  status: string;
  winnerName?: string;
  runnerUpName?: string;
  bannerUrl?: string;
  rules?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: { data?: { data?: unknown } }): T => (res.data?.data ?? res.data) as T;

export interface TournamentInput {
  name: string; gameName: string; platform: string; description?: string; format?: string; maxParticipants: number;
  entryFee?: number; prizePool?: number; firstPrize?: number; secondPrize?: number; thirdPrize?: number;
  scheduledDate: string; scheduledEndDate?: string; rules?: string; notes?: string;
}
export interface TournamentPlayer { saleId: string; saleNumber: string; voided: boolean; fee: number; paid: number; due: number; at: string; name: string; phone?: string | null; line?: string | null }
export interface TournamentPrize { id: string; expenseNumber: string; title: string; amount: number; createdAt: string }

export const gamingTournamentsApi = {
  create: (data: TournamentInput) => apiClient.post('/gaming/tournaments', data).then(unwrap<GamingTournament>),
  list: (params?: { status?: string; platform?: string; upcoming?: boolean; search?: string }) =>
    apiClient.get('/gaming/tournaments', { params }).then(unwrap<GamingTournament[]>),
  players: (id: string) => apiClient.get(`/gaming/tournaments/${id}/players`).then(unwrap<{ players: TournamentPlayer[]; prizes: TournamentPrize[] }>),
  update: (id: string, data: TournamentInput) => apiClient.patch('/gaming/tournaments/' + id, data).then(unwrap<GamingTournament>),
  register: (id: string, data: { name: string; phone?: string; customerId?: string; gamerTag?: string; paidAmount?: number; paymentMethod?: string }) =>
    apiClient.post(`/gaming/tournaments/${id}/register`, data).then(unwrap<{ tournament: GamingTournament; sale: { id: string; saleNumber: string } | null }>),
  prize: (id: string, data: { name: string; place: number; amount: number; paymentMethod: string }) =>
    apiClient.post(`/gaming/tournaments/${id}/prize`, data).then(unwrap<{ expense: { id: string; expenseNumber: string; amount: number } }>),
  start: (id: string) => apiClient.post(`/gaming/tournaments/${id}/start`).then(unwrap<GamingTournament>),
  complete: (id: string, winnerName: string, runnerUpName?: string) =>
    apiClient.post(`/gaming/tournaments/${id}/complete`, { winnerName, runnerUpName }).then(unwrap<GamingTournament>),
  cancel: (id: string, reason: string) => apiClient.post(`/gaming/tournaments/${id}/cancel`, { reason }).then(unwrap<GamingTournament>),
};
