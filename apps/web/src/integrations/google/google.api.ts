import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export interface GoogleSettings {
  channelId: string | null; defaultBrand: string; includeOutOfStock: boolean;
  storeCodes: Record<string, string>; placeId: string; reviewOnBill: boolean;
}
export interface GoogleOverview {
  settings: GoogleSettings;
  enabled: boolean;
  productFeedUrl: string | null;
  localInventoryUrl: string | null;
  reviewUrl: string | null;
  channels: { id: string; name: string; type: string; hasForm: boolean; siteUrl: string | null }[];
  shops: { id: string; name: string; address: string | null }[];
  stats: { items: number; warnings: { code: string; count: number; message: string }[] } | null;
}

export const googleApi = {
  overview: () => apiClient.get('/google').then((r) => unwrap<GoogleOverview>(r)),
  update: (b: Partial<GoogleSettings> & { enable?: boolean; rotate?: boolean }) => apiClient.patch('/google', b).then((r) => unwrap<GoogleOverview>(r)),
  review: () => apiClient.get('/google/review').then((r) => unwrap<{ reviewUrl: string | null }>(r)),
};

/** Bill chhapte waqt (sync) — review QR ka link */
let reviewCache: string | null = null;
export const billReviewUrl = () => reviewCache;

export function useGoogleReviewLink() {
  useQuery({
    queryKey: ['google-review'],
    queryFn: async () => { const r = await googleApi.review(); reviewCache = r.reviewUrl; return r; },
    staleTime: 30 * 60_000,
    retry: false,
  });
}
