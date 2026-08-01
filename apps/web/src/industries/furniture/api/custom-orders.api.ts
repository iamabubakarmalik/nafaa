import { apiClient } from '@core/api/client';

export type FurnitureOrderStatus =
  | 'QUOTATION' | 'DEPOSIT_PAID' | 'IN_PRODUCTION' | 'READY_FOR_DELIVERY'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'ASSEMBLED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export interface FurnitureCustomOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerCnic?: string;
  productType: string;
  description: string;
  categoryType?: string;
  material?: string;
  woodType?: string;
  colorRequested?: string;
  polishRequested?: string;
  upholsteryFabric?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  customDimensions?: string;
  sketchUrls: string[];
  referenceImages: string[];
  designNotes?: string;
  quotedPrice: number;
  finalPrice?: number;
  depositAmount: number;
  depositPaid: boolean;
  balanceAmount: number;
  totalPaid: number;
  estimatedDays: number;
  quotationDate: string;
  approvedDate?: string;
  productionStartDate?: string;
  productionEndDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: FurnitureOrderStatus;
  carpenterId?: string;
  carpenterName?: string;
  workshopLocation?: string;
  progressPct: number;
  progressPhotos: string[];
  progressUpdates?: any;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryArea?: string;
  requiresInstallation: boolean;
  installationCharge?: number;
  warrantyMonths: number;
  cancellationReason?: string;
  cancelledAt?: string;
  refundAmount: number;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const customOrdersApi = {
  create: (data: Partial<FurnitureCustomOrder>) =>
    apiClient.post('/furniture/custom-orders', data).then(unwrap<FurnitureCustomOrder>),

  list: (params?: { status?: string; customerId?: string; carpenterId?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/furniture/custom-orders', { params }).then(unwrap<FurnitureCustomOrder[]>),

  summary: () => apiClient.get('/furniture/custom-orders/summary').then(unwrap<any>),
  overdue: () => apiClient.get('/furniture/custom-orders/overdue').then(unwrap<FurnitureCustomOrder[]>),

  getOne: (id: string) => apiClient.get('/furniture/custom-orders/' + id).then(unwrap<FurnitureCustomOrder>),

  approve: (id: string, finalPrice?: number) =>
    apiClient.post('/furniture/custom-orders/' + id + '/approve', { finalPrice }).then(unwrap<FurnitureCustomOrder>),

  recordPayment: (id: string, data: { amount: number; paymentMethod?: string; isDeposit?: boolean; reference?: string }) =>
    apiClient.post('/furniture/custom-orders/' + id + '/payment', data).then(unwrap<FurnitureCustomOrder>),

  assignCarpenter: (id: string, carpenterId: string, workshopLocation?: string) =>
    apiClient.post('/furniture/custom-orders/' + id + '/assign-carpenter', { carpenterId, workshopLocation }).then(unwrap<FurnitureCustomOrder>),

  updateProgress: (id: string, data: { progressPct: number; progressPhotos?: string[]; updateNote?: string }) =>
    apiClient.post('/furniture/custom-orders/' + id + '/progress', data).then(unwrap<FurnitureCustomOrder>),

  updateStatus: (id: string, data: { status: FurnitureOrderStatus; cancellationReason?: string; refundAmount?: number; notes?: string }) =>
    apiClient.patch('/furniture/custom-orders/' + id + '/status', data).then(unwrap<FurnitureCustomOrder>),

  remove: (id: string) => apiClient.delete('/furniture/custom-orders/' + id).then(unwrap),
};
