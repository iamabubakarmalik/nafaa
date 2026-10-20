import { apiClient } from '@core/api/client';

export type OrderStatus = 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'READY'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';

export interface BulkOrderItem {
  id?: string;
  productId?: string;
  productName: string;
  category?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  discount: number;
  total: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface BulkOrder {
  id: string;
  orderNumber: string;
  /** Bill made when the order was marked delivered. */
  bill?: { id: string; saleNumber: string } | null;
  farmerId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  orderDate: string;
  deliveryDate?: string;
  status: OrderStatus;
  season?: string;
  cropTarget?: string;
  landAreaAcres?: number;
  isDelivery: boolean;
  deliveryAddress?: string;
  deliveryCharges: number;
  transportType?: string;
  vehicleNumber?: string;
  subtotal: number;
  bulkDiscount: number;
  taxAmount: number;
  otherCharges: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  isCredit: boolean;
  creditDueDate?: string;
  advisorNotes?: string;
  farmerNotes?: string;
  cancellationReason?: string;
  items: BulkOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BulkOrderPage {
  items: BulkOrder[];
  total: number;
  page: number;
  limit: number;
  counts: Partial<Record<OrderStatus, number>>;
  stats: { orders: number; value: number; advance: number; pending: number; openValue: number };
  analytics: { seasons: Array<{ season: string | null; orders: number; value: number }> };
}

export interface BulkOrderInput {
  farmerId?: string; customerId?: string; customerName?: string; customerPhone?: string;
  season?: string; cropTarget?: string; landAreaAcres?: number; deliveryDate?: string;
  isDelivery?: boolean; deliveryAddress?: string; deliveryCharges?: number; transportType?: string; vehicleNumber?: string;
  bulkDiscount?: number; otherCharges?: number; isCredit?: boolean; creditDueDate?: string; advisorNotes?: string; farmerNotes?: string;
  items: Array<{ productId?: string; productName: string; category?: string; quantity: number; unit: string; pricePerUnit: number; discount?: number }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- axios envelope
const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bulkOrdersApi = {
  create: (data: BulkOrderInput) => apiClient.post('/agri/bulk-orders', data).then(unwrap<BulkOrder>),
  page: (params: { status?: string; season?: string; farmerId?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }) => apiClient.get('/agri/bulk-orders/page', { params }).then(unwrap<BulkOrderPage>),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    apiClient.patch('/agri/bulk-orders/' + id + '/status', { status, cancellationReason }).then(unwrap<BulkOrder>),
  addPayment: (id: string, amount: number, paymentMethod: string) => apiClient.post('/agri/bulk-orders/' + id + '/payment', { amount, paymentMethod }).then(unwrap<BulkOrder>),
};
