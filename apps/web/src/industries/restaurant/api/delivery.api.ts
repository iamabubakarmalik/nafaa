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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const deliveryApi = {
  assign: (orderId: string, data: { riderId: string; estimatedMinutes?: number; distanceKm?: number; deliveryFee?: number; riderCommission?: number }) =>
    apiClient.post('/restaurant/delivery/assign/' + orderId, data).then(unwrap<DeliveryTracking>),

  updateStatus: (orderId: string, data: { status: string; customerRating?: number; feedback?: string; proofPhotoUrl?: string; failureReason?: string }) =>
    apiClient.post('/restaurant/delivery/' + orderId + '/status', data).then(unwrap<DeliveryTracking>),

  listActive: () =>
    apiClient.get('/restaurant/delivery/active').then(unwrap<DeliveryTracking[]>),
};
