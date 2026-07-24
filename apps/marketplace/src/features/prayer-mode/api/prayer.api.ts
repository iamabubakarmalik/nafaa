import { marketplaceClient, unwrap } from '@/api/client';

export const prayerApi = {
  times: (city: string, date?: string) =>
    marketplaceClient
      .get(`/prayer-ramzan/times/${city}`, { params: { date } })
      .then(unwrap<any>),

  calculateZakat: (data: {
    cashAmount?: number;
    goldGrams?: number;
    silverGrams?: number;
    investments?: number;
    business?: number;
    otherAssets?: number;
    liabilities?: number;
    goldRatePerGram: number;
  }) => marketplaceClient.post('/prayer-ramzan/zakat/calculate', data).then(unwrap<any>),

  zakatHistory: () =>
    marketplaceClient.get('/prayer-ramzan/zakat/history').then(unwrap<any[]>),
};
