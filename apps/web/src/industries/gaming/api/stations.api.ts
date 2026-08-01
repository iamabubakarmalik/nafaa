import { apiClient } from '@core/api/client';

export type GamingStationType =
  | 'PC_STATION' | 'PS5_STATION' | 'PS4_STATION' | 'XBOX_STATION'
  | 'SIMULATOR' | 'VR_STATION' | 'MULTIPLAYER_BOOTH' | 'PRIVATE_ROOM' | 'OTHER';

export interface GamingStation {
  id: string;
  stationNumber: string;
  name: string;
  stationType: GamingStationType;
  location?: string;
  platform?: string;
  specifications?: string;
  installedGames: string[];
  pricePerHour: number;
  pricePerHalfHour?: number;
  peakHourPrice?: number;
  offPeakPrice?: number;
  minimumMinutes: number;
  isActive: boolean;
  isUnderMaintenance: boolean;
  maintenanceNotes?: string;
  totalHoursUsed: number;
  totalRevenue: number;
  imageUrl?: string;
  notes?: string;
  currentSession?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gamingStationsApi = {
  create: (data: Partial<GamingStation>) =>
    apiClient.post('/gaming/stations', data).then(unwrap<GamingStation>),

  list: (params?: { type?: string; active?: boolean; available?: boolean }) =>
    apiClient.get('/gaming/stations', { params }).then(unwrap<GamingStation[]>),

  getOne: (id: string) => apiClient.get('/gaming/stations/' + id).then(unwrap<GamingStation>),

  update: (id: string, data: Partial<GamingStation>) =>
    apiClient.patch('/gaming/stations/' + id, data).then(unwrap<GamingStation>),

  toggleMaintenance: (id: string, notes?: string) =>
    apiClient.post('/gaming/stations/' + id + '/toggle-maintenance', { notes }).then(unwrap<GamingStation>),

  remove: (id: string) => apiClient.delete('/gaming/stations/' + id).then(unwrap),
};
