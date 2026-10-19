import { apiClient } from '@core/api/client';

export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'ON_THE_WAY' | 'ARRIVED' | 'DELIVERED' | 'FAILED' | 'RETURNED';

export interface DeliveryTracking {
  id: string;
  orderId: string;
  riderId?: string;
  status: DeliveryStatus;
  assignedAt?: string;
  pickedUpAt?: string;
  onTheWayAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  distanceKm?: number;
  estimatedMinutes?: number;
  actualMinutes?: number;
  deliveryFee: number;
  riderCommission: number;
  customerTip: number;
  customerRating?: number;
  customerFeedback?: string;
  proofPhotoUrl?: string;
  failureReason?: string;
  order?: any;
  rider?: any;
}

export type DeliveryStage = 'needsRider' | 'assigned' | 'onTheWay' | 'cash' | 'done';

export interface BoardOrder {
  id: string; orderNumber: string; status: string; total: number; paidAmount: number; due: number; saleId?: string | null;
  createdAt: string; readyAt?: string | null; token?: number | null; stage: DeliveryStage;
  customerName?: string | null; customerPhone?: string | null; deliveryAddress?: string | null; deliveryNotes?: string | null; deliveryFee: number;
  delivery?: (DeliveryTracking & { rider?: { id: string; name: string; phone: string; vehicleNumber?: string | null } | null }) | null;
  items: Array<{ quantity: number; status: string; product?: { name: string } | null }>;
}

export interface RiderCash {
  rider: { id: string; name: string; phone: string };
  orders: Array<{ id: string; orderNumber: string; total: number; paidAmount: number; due: number; status: string; deliveredAt?: string | null; customerName?: string | null; riderFee?: number }>;
  delivered: number;
  amount: number;
  /** Rider's fee on these trips (set when the rider was assigned). */
  riderFee?: number;
}

export interface SettleResult {
  settled: Array<{ orderId: string; orderNumber: string; amount: number; saleId: string | null }>;
  failed: Array<{ orderNumber: string; error: string }>;
  amount: number;
  /** Present when the fee was paid from the drawer: the cash expense saved for it. */
  riderFee?: { amount: number; expenseNumbers: string[]; error?: string };
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const deliveryApi = {
  assign: (orderId: string, data: { riderId: string; estimatedMinutes?: number; distanceKm?: number; deliveryFee?: number; riderCommission?: number }) =>
    apiClient.post('/restaurant/delivery/assign/' + orderId, data).then(unwrap<DeliveryTracking>),

  updateStatus: (orderId: string, data: { status: string; customerRating?: number; feedback?: string; proofPhotoUrl?: string; failureReason?: string }) =>
    apiClient.post('/restaurant/delivery/' + orderId + '/status', data).then(unwrap<DeliveryTracking>),

  board: () =>
    apiClient.get('/restaurant/delivery/board').then(unwrap<BoardOrder[]>),

  riderCash: () =>
    apiClient.get('/restaurant/delivery/rider-cash').then(unwrap<RiderCash[]>),

  /**
   * The rider hands over the cash: each order becomes a cash bill now. With
   * `payRiderFee` the rider's fee is paid from the drawer as a cash expense.
   */
  settle: (riderId: string, orderIds: string[], payRiderFee?: boolean) =>
    apiClient.post('/restaurant/delivery/settle', { riderId, orderIds, ...(payRiderFee && { payRiderFee: true }) })
      .then(unwrap<SettleResult>),
};
