import { apiClient } from '@/api/client';

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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const bulkOrdersApi = {
  create: (data: any) => apiClient.post('/agri/bulk-orders', data).then(unwrap<BulkOrder>),
  list: (params?: any) => apiClient.get('/agri/bulk-orders', { params }).then(unwrap<BulkOrder[]>),
  getOne: (id: string) => apiClient.get('/agri/bulk-orders/' + id).then(unwrap<BulkOrder>),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    apiClient.patch('/agri/bulk-orders/' + id + '/status', { status, cancellationReason }).then(unwrap<BulkOrder>),
  addPayment: (id: string, amount: number) => apiClient.post('/agri/bulk-orders/' + id + '/payment', { amount }).then(unwrap<BulkOrder>),
};
