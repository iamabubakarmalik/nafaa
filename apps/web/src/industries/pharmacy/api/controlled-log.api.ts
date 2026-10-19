import { apiClient } from '@core/api/client';

/** Patient and doctor found for a narcotic sale. */
export interface RxParty {
  logId?: string;
  patientName?: string;
  patientCnic?: string;
  patientPhone?: string;
  doctorName?: string;
  doctorRegNumber?: string;
  prescriptionNumber?: string;
}

export interface NarcoticOverviewRow {
  productId: string;
  name: string;
  unit: string;
  isActive: boolean;
  scheduleClass: string;
  dosageForm: string | null;
  stock: number;
  inQty: number;
  outQty: number;
  sales: number;
  missing: number;
}

export interface NarcoticOverview {
  items: NarcoticOverviewRow[];
  totals: { medicines: number; sales: number; missing: number; out: number };
}

export interface RegisterRow {
  no: number;
  id: string;
  at: string;
  type: string;
  label: string;
  reference: string | null;
  returnOf?: string;
  note: string | null;
  inQty: number;
  outQty: number;
  opening: number;
  closing: number;
  saleId?: string;
  saleVoided: boolean;
  party?: RxParty;
  missing: boolean;
}

export interface NarcoticRegister {
  medicine: { id: string; name: string; unit: string; isNarcotic: boolean; scheduleClass: string; registrationNumber: string | null; dosageForm: string | null };
  opening: number;
  closing: number;
  inQty: number;
  outQty: number;
  missing: number;
  rows: RegisterRow[];
}

export interface SaleDetailsPayload {
  saleId: string;
  productId: string;
  patientName: string;
  patientCnic?: string;
  patientPhone?: string;
  patientAddress?: string;
  doctorName: string;
  doctorRegNumber?: string;
  prescriptionNumber?: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

/** `from`/`to` are business days (YYYY-MM-DD). */
export const controlledLogApi = {
  overview: (params?: { from?: string; to?: string }) =>
    apiClient.get('/pharmacy/controlled-log/overview', { params }).then(unwrap<NarcoticOverview>),
  register: (productId: string, params?: { from?: string; to?: string }) =>
    apiClient.get('/pharmacy/controlled-log/register/' + productId, { params }).then(unwrap<NarcoticRegister>),
  /** Fills in (or corrects) the patient and doctor of a narcotic on a bill. */
  saleDetails: (data: SaleDetailsPayload) => apiClient.post('/pharmacy/controlled-log/sale-details', data).then(unwrap),
};
