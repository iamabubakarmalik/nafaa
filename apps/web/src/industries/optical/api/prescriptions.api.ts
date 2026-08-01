import { apiClient } from '@core/api/client';

export type OpticalPrescriptionType = 'DISTANCE' | 'READING' | 'BIFOCAL' | 'PROGRESSIVE' | 'CONTACT_LENS' | 'OTHER';

export interface OpticalPrescription {
  id: string;
  prescriptionNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAge?: number;
  customerGender?: string;
  prescribedBy?: string;
  doctorName?: string;
  clinicName?: string;
  prescriptionDate: string;
  expiryDate?: string;
  prescriptionType?: OpticalPrescriptionType;
  rightSph?: number; rightCyl?: number; rightAxis?: number; rightAdd?: number; rightPd?: number; rightVa?: string; rightPrism?: number;
  leftSph?: number; leftCyl?: number; leftAxis?: number; leftAdd?: number; leftPd?: number; leftVa?: string; leftPrism?: number;
  pupilDistance?: number;
  segHeight?: number;
  clRightBaseCurve?: string; clLeftBaseCurve?: string;
  clRightDiameter?: string; clLeftDiameter?: string;
  notes?: string;
  imageUrls: string[];
  documentUrls: string[];
  isActive: boolean;
  timesUsed: number;
  computed?: {
    daysToExpiry: number | null;
    isExpired: boolean;
    isExpiringSoon: boolean;
    rightEyeSummary: string | null;
    leftEyeSummary: string | null;
  };
  lensOrders?: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const prescriptionsApi = {
  create: (data: Partial<OpticalPrescription>) =>
    apiClient.post('/optical/prescriptions', data).then(unwrap<OpticalPrescription>),

  list: (params?: {
    customerId?: string; active?: boolean; expiringSoon?: boolean; expired?: boolean;
    prescriptionType?: string; from?: string; to?: string; search?: string;
  }) => apiClient.get('/optical/prescriptions', { params }).then(unwrap<OpticalPrescription[]>),

  summary: () => apiClient.get('/optical/prescriptions/summary').then(unwrap<any>),

  expiringSoon: (days = 60) =>
    apiClient.get('/optical/prescriptions/expiring-soon', { params: { days } }).then(unwrap<OpticalPrescription[]>),

  byCustomer: (customerId: string) =>
    apiClient.get('/optical/prescriptions/by-customer/' + customerId).then(unwrap<OpticalPrescription[]>),

  getOne: (id: string) =>
    apiClient.get('/optical/prescriptions/' + id).then(unwrap<OpticalPrescription>),

  update: (id: string, data: Partial<OpticalPrescription>) =>
    apiClient.patch('/optical/prescriptions/' + id, data).then(unwrap<OpticalPrescription>),

  renew: (id: string, overrides?: Partial<OpticalPrescription>) =>
    apiClient.post('/optical/prescriptions/' + id + '/renew', overrides || {}).then(unwrap<OpticalPrescription>),

  deactivate: (id: string) =>
    apiClient.post('/optical/prescriptions/' + id + '/deactivate').then(unwrap<OpticalPrescription>),

  remove: (id: string) =>
    apiClient.delete('/optical/prescriptions/' + id).then(unwrap),
};
