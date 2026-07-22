import { apiClient } from '@core/api/client';

export interface ControlledLog {
  id: string;
  logNumber: string;
  logDate: string;
  logType: string;
  productId: string;
  batchId?: string;
  saleId?: string;
  prescriptionId?: string;
  quantity: number;
  unit: string;
  openingBalance: number;
  closingBalance: number;
  patientName?: string;
  patientCnic?: string;
  patientPhone?: string;
  patientAddress?: string;
  doctorName?: string;
  doctorRegNumber?: string;
  prescriptionNumber?: string;
  dispensedBy?: string;
  supervisedBy?: string;
  notes?: string;
  attachmentUrls: string[];
  isReversed: boolean;
  createdAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const controlledLogApi = {
  create: (data: any) => apiClient.post('/pharmacy/controlled-log', data).then(unwrap<ControlledLog>),
  list: (params?: { productId?: string; logType?: string; from?: string; to?: string }) =>
    apiClient.get('/pharmacy/controlled-log', { params }).then(unwrap<ControlledLog[]>),
  register: (productId: string, params?: { from?: string; to?: string }) =>
    apiClient.get('/pharmacy/controlled-log/register/' + productId, { params }).then(unwrap<ControlledLog[]>),
};
