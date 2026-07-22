import { apiClient } from '@/api/client';

export type AlterationStatus = 'RECEIVED' | 'MEASUREMENT_TAKEN' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface AlterationTicket {
  id: string;
  ticketNumber: string;
  customerId?: string;
  saleId?: string;
  productId?: string;
  variantId?: string;
  customerName?: string;
  customerPhone?: string;
  garmentDescription: string;
  alterationType: string;
  alterationDetails?: string;
  status: AlterationStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  receivedAt: string;
  promisedDate?: string;
  readyAt?: string;
  deliveredAt?: string;
  tailorId?: string;
  charges: number;
  paidAmount: number;
  paymentStatus: string;
  beforeImageUrls: string[];
  afterImageUrls: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const alterationsApi = {
  create: (data: Partial<AlterationTicket>) =>
    apiClient.post('/garments/alterations', data).then(unwrap<AlterationTicket>),
  list: (params?: any) =>
    apiClient.get('/garments/alterations', { params }).then(unwrap<AlterationTicket[]>),
  getOne: (id: string) =>
    apiClient.get('/garments/alterations/' + id).then(unwrap<AlterationTicket>),
  updateStatus: (id: string, status: string, afterImageUrls?: string[]) =>
    apiClient.post('/garments/alterations/' + id + '/status', { status, afterImageUrls }).then(unwrap<AlterationTicket>),
  payment: (id: string, amount: number) =>
    apiClient.post('/garments/alterations/' + id + '/payment', { amount }).then(unwrap<AlterationTicket>),
};
