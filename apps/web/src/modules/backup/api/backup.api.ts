import { apiClient } from '@core/api/client';

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
  };
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const backupApi = {
  summary: () => apiClient.get<{ data: BackupSummary }>('/backup/summary').then(unwrap),

  /**
   * Export full backup as JSON file (client downloads directly)
   */
  exportJson: async () => {
    const response = await apiClient.get('/backup/export', {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  /**
   * Restore from uploaded backup file
   */
  restore: (file: File) => {
    const formData = new FormData();
    formData.append('backup', file);
    return apiClient.post<{ data: { success: boolean; message: string } }>(
      '/backup/restore',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(unwrap);
  },
};
