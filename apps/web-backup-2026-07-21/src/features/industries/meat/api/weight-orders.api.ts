import { apiClient } from '@/api/client';

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PROCESSING' | 'CUTTING' | 'PACKED'
  | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface WeightOrderItem {
  id?: string;
  productId?: string;
  productName: string;
  cutCategory?: string;
  requestedKg: number;
  actualKg?: number;
  pricePerKg: number;
  total: number;
  cuttingInstructions?: string;
  packagingNotes?: string;
}

export interface WeightOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  orderDate: string;
  neededBy?: string;
  scheduledDelivery?: string;
  status: OrderStatus;
  isDelivery: boolean;
  deliveryAddress?: string;
  deliveryCharges: number;
  deliveryPersonId?: string;
  deliveredAt?: string;
  occasion?: string;
  specialInstructions?: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  cuttingStyle?: string;
  packagingPref?: string;
  numberOfPackets?: number;
  cancelledAt?: string;
  cancellationReason?: string;
  items: WeightOrderItem[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const weightOrdersApi = {
  create: (data: any) => apiClient.post('/meat/weight-orders', data).then(unwrap<WeightOrder>),
  list: (params?: any) => apiClient.get('/meat/weight-orders', { params }).then(unwrap<WeightOrder[]>),
  getOne: (id: string) => apiClient.get('/meat/weight-orders/' + id).then(unwrap<WeightOrder>),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    apiClient.patch('/meat/weight-orders/' + id + '/status', { status, cancellationReason }).then(unwrap<WeightOrder>),
  updateActualWeights: (id: string, items: { itemId: string; actualKg: number }[]) =>
    apiClient.patch('/meat/weight-orders/' + id + '/actual-weights', { items }).then(unwrap<WeightOrder>),
  addPayment: (id: string, amount: number) =>
    apiClient.post('/meat/weight-orders/' + id + '/payment', { amount }).then(unwrap<WeightOrder>),
};
