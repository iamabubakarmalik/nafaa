import { apiClient } from '@core/api/client';
import type { ExportLogEntry } from '@modules/reports/exports/api/exports.api';

export interface BackupSummary {
  meta: {
    version: string;
    exportedAt: string;
    tenantId: string;
    tenantName?: string;
  };
  counts: {
    shops: number;
    categories: number;
    products: number;
    customers: number;
    suppliers: number;
    expenses: number;
    sales: number;
    purchases: number;
    stockMovements: number;
    cashRegisters: number;
    transfers: number;
    khataEntries?: number;
  };
  lastBackup?: { at: string; by: string | null } | null;
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const backupApi = {
  summary: () => apiClient.get<{ data: BackupSummary }>('/backup/summary').then(unwrap),

  /** Backups and file exports, newest first. */
  history: () => apiClient.get<{ data: ExportLogEntry[] }>('/backup/history').then(unwrap),

  /** Full backup as a JSON file; returns its size in bytes. */
  download: async () => {
    const res = await apiClient.get('/backup/download', { responseType: 'blob' });
    const blob = res.data as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nafaa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return blob.size;
  },
};
