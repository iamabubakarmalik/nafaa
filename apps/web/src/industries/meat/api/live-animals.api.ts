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

export interface MandiInput {
  supplierId: string; productId: string; paymentMethod: string; paidAmount?: number; otherCharges?: number; notes?: string; purchasedAt?: string;
  /** Birds or loose live stock by weight. */
  kg?: number; ratePerKg?: number; birds?: number;
  /** Or tagged animals, one row each. */
  animals?: Array<{ tagNumber?: string; animalType: string; breed?: string; color?: string; sex?: string; ageMonths?: number; weightKg: number; price: number }>;
}

export interface LiveSummary {
  aliveCount: number;
  byType: Array<{ animalType: string; _count: { _all: number }; _sum: { weightKg: number | null } }>;
  totalCost: { _sum: { purchasePrice: number | null; totalFeedCost: number | null } };
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const liveAnimalsApi = {
  mandi: (data: MandiInput) => apiClient.post('/meat/live-animals/mandi', data).then(unwrap<{ purchaseId: string; purchaseNumber: string; total: number; paidAmount: number; animals: number }>),
  create: (data: Partial<LiveAnimal>) => apiClient.post('/meat/live-animals', data).then(unwrap<LiveAnimal>),
  list: (params?: Record<string, string | undefined>) => apiClient.get('/meat/live-animals', { params }).then(unwrap<LiveAnimal[]>),
  summary: () => apiClient.get('/meat/live-animals/summary').then(unwrap<LiveSummary>),
  update: (id: string, data: Partial<LiveAnimal>) => apiClient.patch('/meat/live-animals/' + id, data).then(unwrap<LiveAnimal>),
  addFeedCost: (id: string, days: number, costPerDay: number, paymentMethod: string) =>
    apiClient.post('/meat/live-animals/' + id + '/feed-cost', { days, costPerDay, paymentMethod }).then(unwrap<LiveAnimal>),
  remove: (id: string) => apiClient.delete('/meat/live-animals/' + id).then(unwrap),
};
