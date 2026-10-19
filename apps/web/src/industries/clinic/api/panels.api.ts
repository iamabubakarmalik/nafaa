import { apiClient } from '@core/api/client';

/** A company that pays for its staff's visits; its bills sit on its own khata customer. */
export interface Panel {
  id: string;
  name: string;
  creditLimit: number;
  customerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PanelRow = Panel & { patients: number; balance: number };

export interface PanelBill {
  id: string; saleNumber: string; status: string; createdAt: string; total: number; paidAmount: number; creditAmount: number; returned: number; line: string | null;
  appointment: { id: string; appointmentNumber: string; tokenNumber: number | null; scheduledStart: string } | null;
  patient: { id: string; fullName: string; mrn: string; insuranceNumber?: string | null } | null;
  doctor: { id: string; fullName: string; title?: string | null } | null;
}

export interface PanelPayment {
  id: string; amount: number; balanceAfter: number; reference?: string | null; note?: string | null; paymentMethod?: string | null; createdAt: string;
  createdBy?: { fullName: string } | null;
}

export interface PanelStatement {
  panel: Panel;
  customer: { id: string; name: string; balance: number; creditLimit: number } | null;
  bills: PanelBill[];
  payments: PanelPayment[];
  totals: { billed: number; onKhata: number; received: number };
}

const unwrap = <T,>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const panelsApi = {
  list: (params?: { search?: string; status?: 'active' | 'inactive' | 'all' }) =>
    apiClient.get('/clinic/panels', { params }).then(unwrap<{ items: PanelRow[]; summary: { panels: number; due: number; overLimit: number } }>),
  create: (data: { name: string; creditLimit?: number }) => apiClient.post('/clinic/panels', data).then(unwrap<Panel>),
  update: (id: string, data: { name?: string; creditLimit?: number; isActive?: boolean }) => apiClient.patch('/clinic/panels/' + id, data).then(unwrap<Panel>),
  statement: (id: string, from?: string, to?: string) => apiClient.get('/clinic/panels/' + id + '/statement', { params: { from, to } }).then(unwrap<PanelStatement>),
};
