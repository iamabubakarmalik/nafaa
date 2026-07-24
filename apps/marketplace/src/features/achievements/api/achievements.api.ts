import { marketplaceClient, unwrap } from '@/api/client';

export const achievementsApi = {
  list: () => marketplaceClient.get('/achievements').then(unwrap<any[]>),

  mine: () => marketplaceClient.get('/achievements/mine').then(unwrap<{
    earned: any[]; inProgress: any[]; locked: any[];
    totalPoints: number; level: number;
  }>),

  claim: (id: string) => marketplaceClient.post(`/achievements/${id}/claim`).then(unwrap<any>),
};
