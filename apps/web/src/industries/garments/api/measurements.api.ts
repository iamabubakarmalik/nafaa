import { apiClient } from '@core/api/client';

/** Body measurement fields, in the order the form and slip show them. */
export const MEASURE_FIELDS = [
  'neck', 'shoulder', 'chest', 'bust', 'waist', 'hip', 'armhole', 'bicep', 'wrist', 'sleeveLength',
  'shirtLength', 'kurtaLength', 'daman', 'trouserLength', 'shalwarLength', 'shalwarBottom', 'inseam', 'thigh', 'knee', 'bottom',
] as const;
export type MeasureField = (typeof MEASURE_FIELDS)[number];

export type MeasurementProfile = { [K in MeasureField]?: number | null } & {
  id: string;
  customerId: string;
  profileName: string;
  gender?: string | null;
  unit: 'INCH' | 'CM';
  postureNotes?: string | null;
  fittingNotes?: string | null;
  imageUrls: string[];
  measuredAt: string;
  isDefault: boolean;
  customer?: { id: string; name: string; phone?: string | null } | null;
  updatedAt: string;
};

export type MeasurementInput = { [K in MeasureField]?: number } & {
  customerId: string;
  profileName?: string;
  gender?: string;
  unit?: 'INCH' | 'CM';
  postureNotes?: string;
  fittingNotes?: string;
  imageUrls?: string[];
  isDefault?: boolean;
};

interface MeasurementPage {
  items: MeasurementProfile[];
  total: number; page: number; pages: number;
  stats: { customers: number; recent: number };
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const measurementsApi = {
  create: (data: MeasurementInput) => apiClient.post('/garments/measurements', data).then(unwrap<MeasurementProfile>),
  page: (q: { page: number; limit?: number; search?: string; gender?: string }) =>
    apiClient.get('/garments/measurements', { params: q }).then(unwrap<MeasurementPage>),
  byCustomer: (customerId: string) => apiClient.get('/garments/measurements/by-customer/' + customerId).then(unwrap<MeasurementProfile[]>),
  update: (id: string, data: MeasurementInput) => apiClient.patch('/garments/measurements/' + id, data).then(unwrap<MeasurementProfile>),
  remove: (id: string) => apiClient.delete('/garments/measurements/' + id).then(unwrap<MeasurementProfile>),
};
