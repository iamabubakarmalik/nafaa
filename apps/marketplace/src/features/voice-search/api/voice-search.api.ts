import { marketplaceClient, unwrap } from '@/api/client';

export const voiceSearchApi = {
  search: (payload: {
    transcript: string;
    language?: string;
    audioUrl?: string;
    durationMs?: number;
  }) => marketplaceClient.post('/voice-search/search', payload).then(unwrap<{
    transcript: string;
    parsedQuery: string;
    quantity?: number;
    unit?: string;
    products: any[];
    count: number;
  }>),

  logClick: (logId: string, productId: string) =>
    marketplaceClient.post('/voice-search/click', { logId, productId }).then(unwrap),
};
