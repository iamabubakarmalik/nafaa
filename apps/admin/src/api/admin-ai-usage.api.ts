import { apiClient } from './client';

export interface AiUsageSummary {
  range: { days: number; from: string; to: string };
  totals: { messages: number; tokens: number; costUsd: number; shops: number };
  previous: { messages: number; tokens: number; costUsd: number };
  daily: Array<{ date: string; messages: number; tokens: number; costUsd: number }>;
  topShops: Array<{ tenantId: string; name: string; slug: string | null; messages: number; tokens: number; costUsd: number }>;
  tiers: Array<{ tier: string; messages: number; inputTokens: number; outputTokens: number; cachedTokens: number; costUsd: number }>;
}

export const adminAiUsageApi = {
  summary: (days: number) => apiClient.get<{ data: AiUsageSummary }>('/admin/ai-usage', { params: { days } }).then((r) => r.data.data),
};
