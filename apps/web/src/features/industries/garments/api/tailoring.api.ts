import { apiClient } from '@/api/client';

export type TailoringStatus = 'DRAFT' | 'QUOTED' | 'CONFIRMED' | 'FABRIC_PENDING'
  | 'CUTTING' | 'STITCHING' | 'EMBROIDERY' | 'QUALITY_CHECK' | 'READY'
  | 'DELIVERED' | 'CANCELLED' | 'ON_HOLD';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface TailoringOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  measurementProfileId?: string;
  customerName?: string;
  customerPhone?: string;
  customerNotes?: string;
  orderStatus: TailoringStatus;
  priority: Priority;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
  collectionId?: string;
  tailorId?: string;
  designerId?: string;
  orderDate: string;
  promisedDate?: string;
  readyDate?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  subtotal: number;
  stitchingCharges: number;
  embroideryCharges: number;
  alterationCharges: number;
  fabricCharges: number;
  accessoryCharges: number;
  discount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  designReferenceUrls: string[];
  designInstructions?: string;
  internalNotes?: string;
  items: any[];
  payments?: any[];
  customer?: any;
  measurementProfile?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const tailoringApi = {
  create: (data: any) =>
    apiClient.post('/garments/tailoring', data).then(unwrap<TailoringOrder>),
  list: (params?: any) =>
    apiClient.get('/garments/tailoring', { params }).then(unwrap<TailoringOrder[]>),
  summary: (params?: { from?: string; to?: string }) =>
    apiClient.get('/garments/tailoring/summary', { params }).then(unwrap<any>),
  getOne: (id: string) =>
    apiClient.get('/garments/tailoring/' + id).then(unwrap<TailoringOrder>),
  updateStatus: (id: string, status: string, opts?: { notes?: string; cancellationReason?: string }) =>
    apiClient.patch('/garments/tailoring/' + id + '/status', { status, ...opts }).then(unwrap<TailoringOrder>),
  addPayment: (id: string, data: { amount: number; paymentMethod: string; reference?: string; notes?: string }) =>
    apiClient.post('/garments/tailoring/' + id + '/payments', data).then(unwrap<TailoringOrder>),
};
