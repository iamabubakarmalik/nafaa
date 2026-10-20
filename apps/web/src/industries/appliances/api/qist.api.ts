/**
 * Installment (qist) plans on a credit bill, through the shared plan API
 * (/emi-plans). The bill's udhaar already sits on the khata; a plan only
 * splits it into monthly due dates. The guarantor is kept on the plan
 * through the appliance endpoint.
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

/** The guarantor (zamin) who stands for the plan. */
export interface QistGuarantor { guarantorName: string; guarantorPhone?: string; guarantorCnic: string; guarantorAddress?: string }

export const qistApi = {
  create: (data: QistPlanInput) => apiClient.post('/emi-plans', data).then(unwrap<{ id: string; planNumber: string }>),
  setGuarantor: (planId: string, data: QistGuarantor) =>
    apiClient.put(`/appliances/qist-plans/${planId}/guarantor`, data).then(unwrap<QistGuarantor & { id: string; planNumber: string }>),
};
