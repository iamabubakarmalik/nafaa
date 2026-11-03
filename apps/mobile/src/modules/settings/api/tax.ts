/** Tax authority (FBR / PRA / SRB / KPRA) connection status, read only (web modules/tax/api.ts). */

import { apiClient } from '@/core/api/client';

export interface TaxProfile { authority: string; enabled: boolean; env: string; businessName: string; terminals: Array<{ posId: string; ntn: string }> }
export interface TaxStatus {
  profiles: TaxProfile[];
  authorities: Record<string, { name: string; province: string }>;
  activity: Record<string, { success: number; failed: number; pending: number; lastSentAt: string | null } | undefined>;
}

export const taxStatusApi = { get: () => apiClient.get<TaxStatus>('/tax-authority').then((r) => r.data) };
