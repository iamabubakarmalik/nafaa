import { apiClient } from '@/api/client';

export type BulkJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
export type BulkJobType = 'PRODUCTS' | 'CUSTOMERS' | 'SUPPLIERS' | 'STOCK_ADJUSTMENT' | 'PRICE_UPDATE';

export interface BulkImportRow {
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  unit?: string;
  price?: number;
  costPrice?: number;
  wholesalePrice?: number;
  stock?: number;
  lowStockAlert?: number;
}

export interface BulkImportJob {
  id: string;
  jobType: BulkJobType;
  fileName: string;
  fileUrl?: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  skipCount: number;
  errors?: any;
  status: BulkJobStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bulkImportApi = {
  importProducts: (data: { jobType: BulkJobType; fileName: string; fileUrl?: string; rows: BulkImportRow[] }) =>
    apiClient.post('/retail/bulk-import/products', data).then(unwrap<BulkImportJob>),

  listJobs: () =>
    apiClient.get('/retail/bulk-import/jobs').then(unwrap<BulkImportJob[]>),

  getJob: (id: string) =>
    apiClient.get('/retail/bulk-import/jobs/' + id).then(unwrap<BulkImportJob>),
};
