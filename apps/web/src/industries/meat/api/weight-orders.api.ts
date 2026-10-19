import { apiClient } from '@core/api/client';

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

export type OrderTab = 'all' | 'open' | 'today' | 'ready' | 'delivery' | 'delivered' | 'cancelled';

export interface OrderPage {
  items: WeightOrder[]; total: number; page: number; limit: number;
  counts: Record<OrderTab, number>; openValue: number; advances: number;
}

/** Money of one order split by where it sits (see the API). */
export interface OrderMoney { khataPaid: number; legacyPaid: number }

export interface OrderInput {
  customerId?: string | null; customerName?: string; customerPhone?: string;
  neededBy?: string | null; isDelivery: boolean; deliveryAddress?: string; deliveryCharges?: number; discount?: number;
  occasion?: string; specialInstructions?: string; cuttingStyle?: string; packagingPref?: string; numberOfPackets?: number | null;
  advance?: number; paymentMethod?: string;
  items: Array<{ productId: string; requestedKg: number; pricePerKg: number; cuttingInstructions?: string }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

const base = '/meat/weight-orders/';

export const weightOrdersApi = {
  create: (data: OrderInput) => apiClient.post('/meat/weight-orders', data).then(unwrap<WeightOrder>),
  list: (params?: Record<string, string | undefined>) => apiClient.get('/meat/weight-orders', { params }).then(unwrap<WeightOrder[]>),
  page: (params: Record<string, string | number | undefined>) => apiClient.get(base + 'page', { params }).then(unwrap<OrderPage>),
  getOne: (id: string) => apiClient.get(base + id).then(unwrap<WeightOrder & OrderMoney>),
  update: (id: string, data: Partial<OrderInput>) => apiClient.patch(base + id, data).then(unwrap<WeightOrder & OrderMoney>),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    apiClient.patch(base + id + '/status', { status, cancellationReason }).then(unwrap<WeightOrder>),
  updateActualWeights: (id: string, items: { itemId: string; actualKg: number }[]) =>
    apiClient.patch(base + id + '/actual-weights', { items }).then(unwrap<WeightOrder>),
  addPayment: (id: string, amount: number, paymentMethod: string, expectedPaid: number) =>
    apiClient.post(base + id + '/payment', { amount, paymentMethod, expectedPaid }).then(unwrap<WeightOrder>),
  /** Makes the bill (stock, sale, khata) and marks the order handed over. */
  checkout: (id: string, body: { payments: Array<{ method: string; amount: number }>; expectedTotal: number; managerPin?: string }) =>
    apiClient.post(base + id + '/checkout', body).then(unwrap<WeightOrder & OrderMoney>),
  refund: (id: string, managerPin?: string) => apiClient.post(base + id + '/refund', { managerPin }).then(unwrap<WeightOrder & OrderMoney>),
  bySales: (ids: string[]) => apiClient.get(base + 'by-sales', { params: { ids: ids.join(',') } })
    .then(unwrap<Record<string, { id: string; orderNumber: string; isDelivery: boolean; occasion: string | null }>>),
  bill: (id: string) => apiClient.get(base + id + '/bill').then(unwrap<{ id: string; saleNumber: string; total: number; creditAmount: number } | null>),
};
