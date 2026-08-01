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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gamingTournamentsApi = {
  create: (data: Partial<GamingTournament>) =>
    apiClient.post('/gaming/tournaments', data).then(unwrap<GamingTournament>),

  list: (params?: { status?: string; platform?: string; upcoming?: boolean; search?: string }) =>
    apiClient.get('/gaming/tournaments', { params }).then(unwrap<GamingTournament[]>),

  getOne: (id: string) => apiClient.get('/gaming/tournaments/' + id).then(unwrap<GamingTournament>),

  update: (id: string, data: Partial<GamingTournament>) =>
    apiClient.patch('/gaming/tournaments/' + id, data).then(unwrap<GamingTournament>),

  register: (id: string) => apiClient.post('/gaming/tournaments/' + id + '/register').then(unwrap<GamingTournament>),

  complete: (id: string, winnerName: string, runnerUpName?: string) =>
    apiClient.post('/gaming/tournaments/' + id + '/complete', { winnerName, runnerUpName }).then(unwrap<GamingTournament>),

  remove: (id: string) => apiClient.delete('/gaming/tournaments/' + id).then(unwrap),
};
