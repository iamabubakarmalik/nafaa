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
  progressUpdates?: Array<{ at: string; pct: number; note?: string }> | null;
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
  /** Bill made when the furniture left the shop. */
  sale?: { id: string; saleNumber: string; total: number; creditAmount: number } | null;
}

export interface OrderSummary {
  quotation: number; deposit: number; production: number; ready: number; delivered: number; completed: number; cancelled: number; late: number;
  totalReceivable: number; totalCollected: number;
}
export interface OrderPage { items: FurnitureCustomOrder[]; total: number; page: number; limit: number }
export type OrderInput = Partial<Pick<FurnitureCustomOrder,
  'customerId' | 'customerName' | 'customerPhone' | 'customerAddress' | 'customerCnic' | 'productType' | 'description' | 'categoryType' | 'material'
  | 'woodType' | 'colorRequested' | 'polishRequested' | 'upholsteryFabric' | 'lengthCm' | 'widthCm' | 'heightCm' | 'customDimensions'
  | 'sketchUrls' | 'referenceImages' | 'designNotes' | 'quotedPrice' | 'depositAmount' | 'estimatedDays' | 'carpenterId' | 'workshopLocation'
  | 'deliveryAddress' | 'deliveryCity' | 'deliveryArea' | 'requiresInstallation' | 'installationCharge' | 'warrantyMonths' | 'notes'>>;

const unwrap = <T,>(res: { data?: { data?: unknown } }): T => (res.data?.data ?? res.data) as T;

export const customOrdersApi = {
  create: (data: OrderInput) =>
    apiClient.post('/furniture/custom-orders', data).then(unwrap<FurnitureCustomOrder>),

  page: (params: { status?: string; carpenterId?: string; from?: string; to?: string; search?: string; page: number; limit: number }) =>
    apiClient.get('/furniture/custom-orders', { params }).then(unwrap<OrderPage>),

  summary: () => apiClient.get('/furniture/custom-orders/summary').then(unwrap<OrderSummary>),

  getOne: (id: string) => apiClient.get('/furniture/custom-orders/' + id).then(unwrap<FurnitureCustomOrder>),

  approve: (id: string, finalPrice?: number) =>
    apiClient.post('/furniture/custom-orders/' + id + '/approve', { finalPrice }).then(unwrap<FurnitureCustomOrder>),

  recordPayment: (id: string, data: { amount: number; paymentMethod?: string; isDeposit?: boolean; reference?: string }) =>
    apiClient.post('/furniture/custom-orders/' + id + '/payment', data).then(unwrap<FurnitureCustomOrder>),

  assignCarpenter: (id: string, carpenterId: string, workshopLocation?: string) =>
    apiClient.post('/furniture/custom-orders/' + id + '/assign-carpenter', { carpenterId, workshopLocation }).then(unwrap<FurnitureCustomOrder>),

  update: (id: string, data: OrderInput) =>
    apiClient.patch('/furniture/custom-orders/' + id, data).then(unwrap<FurnitureCustomOrder>),
  updateProgress: (id: string, data: { progressPct: number; progressPhotos?: string[]; updateNote?: string }) =>
    apiClient.post('/furniture/custom-orders/' + id + '/progress', data).then(unwrap<FurnitureCustomOrder>),

  updateStatus: (id: string, data: { status: FurnitureOrderStatus; cancellationReason?: string; notes?: string }) =>
    apiClient.patch('/furniture/custom-orders/' + id + '/status', data).then(unwrap<FurnitureCustomOrder>),
};
