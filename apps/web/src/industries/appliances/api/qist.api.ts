/**
 * Installment (qist) plans on a credit bill, through the shared plan API
 * (/emi-plans). The bill's udhaar already sits on the khata; a plan only
 * splits it into monthly due dates.
 */
import { apiClient } from '@core/api/client';

export interface QistPlanInput {
  saleId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  downPayment: number;
  installmentCount: number;
  /** First due date, yyyy-MM-dd in shop time. */
  startDate: string;
  notes?: string;
}

const unwrap = <T,>(res: { data?: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const qistApi = {
  create: (data: QistPlanInput) => apiClient.post('/emi-plans', data).then(unwrap<{ id: string; planNumber: string }>),
};
