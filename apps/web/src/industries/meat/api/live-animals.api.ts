import { apiClient } from '@core/api/client';

export interface LiveAnimal {
  id: string;
  tagNumber: string;
  animalType: string;
  breed?: string;
  color?: string;
  sex?: string;
  ageMonths?: number;
  weightKg: number;
  purchasePrice: number;
  purchaseDate: string;
  vendorId?: string;
  vendorName?: string;
  sourceName?: string;
  vaccinationStatus?: string;
  healthCertUrl?: string;
  isHealthy: boolean;
  healthNotes?: string;
  vetCheckedAt?: string;
  feedingType?: string;
  dailyFeedCost: number;
  daysHeld: number;
  totalFeedCost: number;
  isSlaughtered: boolean;
  slaughteredAt?: string;
  slaughterMethod?: string;
  slaughterCertBy?: string;
  slaughterWeightKg?: number;
  meatYieldKg?: number;
  yieldPct?: number;
  isSold: boolean;
  soldPrice?: number;
  soldAt?: string;
  soldToCustomer?: string;
  photoUrls: string[];
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const liveAnimalsApi = {
  create: (data: Partial<LiveAnimal>) => apiClient.post('/meat/live-animals', data).then(unwrap<LiveAnimal>),
  list: (params?: any) => apiClient.get('/meat/live-animals', { params }).then(unwrap<LiveAnimal[]>),
  summary: () => apiClient.get('/meat/live-animals/summary').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/meat/live-animals/' + id).then(unwrap<LiveAnimal>),
  update: (id: string, data: Partial<LiveAnimal>) => apiClient.patch('/meat/live-animals/' + id, data).then(unwrap<LiveAnimal>),
  addFeedCost: (id: string, days: number, costPerDay: number) =>
    apiClient.post('/meat/live-animals/' + id + '/feed-cost', { days, costPerDay }).then(unwrap<LiveAnimal>),
  remove: (id: string) => apiClient.delete('/meat/live-animals/' + id).then(unwrap),
};
