import { apiClient } from '@core/api/client';

export type FurnitureDeliveryStatus =
  | 'PENDING' | 'SCHEDULED' | 'DISPATCHED' | 'IN_TRANSIT' | 'ARRIVED'
  | 'DELIVERED' | 'ASSEMBLED' | 'RESCHEDULED' | 'FAILED' | 'RETURNED';

export interface FurnitureDelivery {
  id: string;
  deliveryNumber: string;
  saleId?: string;
  customOrderId?: string;
  productIds: string[];
  productNames: string[];
  itemsCount: number;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  city?: string;
  area?: string;
  landmark?: string;
  floorNumber?: number;
  hasLift?: boolean;
  latitude?: number;
  longitude?: number;
  scheduledDate?: string;
  scheduledSlot?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  helpersCount: number;
  dispatchedAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
  assembledAt?: string;
  status: FurnitureDeliveryStatus;
  deliveryCharge: number;
  loadingCharge: number;
  unloadingCharge: number;
  floorCharge: number;
  assemblyCharge: number;
  totalCharge: number;
  requiresAssembly: boolean;
  assemblyIncluded: boolean;
  assemblyTimeSpent?: number;
  assemblyNotes?: string;
  receivedByName?: string;
  receivedByCnic?: string;
  signatureUrl?: string;
  photoUrls: string[];
  customerRating?: number;
  customerFeedback?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /** Bill of the delivery charges, once made. */
  chargesBill?: { id: string; saleNumber: string; status: string; total: number; creditAmount: number } | null;
}

export interface DeliverySummary { pending: number; scheduled: number; inTransit: number; delivered: number; assembled: number; todayScheduled: number; rescheduled: number }
export interface DeliveryPage { items: FurnitureDelivery[]; total: number; page: number; limit: number }
export interface DeliveryInput {
  saleId?: string; customOrderId?: string; customerId?: string; customerName: string; customerPhone: string; deliveryAddress: string;
  city?: string; area?: string; landmark?: string; floorNumber?: number; hasLift?: boolean; scheduledDate?: string; scheduledSlot?: string;
  vehicleType?: string; vehicleNumber?: string; driverName?: string; driverPhone?: string; helpersCount?: number;
  deliveryCharge?: number; loadingCharge?: number; unloadingCharge?: number; floorCharge?: number; assemblyCharge?: number;
  requiresAssembly?: boolean; productNames?: string[]; itemsCount?: number; notes?: string;
}

const unwrap = <T,>(res: { data?: { data?: unknown } }): T => (res.data?.data ?? res.data) as T;

export const deliveriesApi = {
  create: (data: DeliveryInput) =>
    apiClient.post('/furniture/deliveries', data).then(unwrap<FurnitureDelivery>),

  page: (params: { status?: string; from?: string; to?: string; search?: string; page: number; limit: number }) =>
    apiClient.get('/furniture/deliveries', { params }).then(unwrap<DeliveryPage>),

  summary: () => apiClient.get('/furniture/deliveries/summary').then(unwrap<DeliverySummary>),

  getOne: (id: string) => apiClient.get('/furniture/deliveries/' + id).then(unwrap<FurnitureDelivery>),

  assignVehicle: (id: string, data: { vehicleType?: string; vehicleNumber?: string; driverName?: string; driverPhone?: string; helpersCount?: number; scheduledDate?: string; scheduledSlot?: string }) =>
    apiClient.post('/furniture/deliveries/' + id + '/assign-vehicle', data).then(unwrap<FurnitureDelivery>),

  updateStatus: (id: string, data: { status: FurnitureDeliveryStatus; notes?: string }) =>
    apiClient.patch('/furniture/deliveries/' + id + '/status', data).then(unwrap<FurnitureDelivery>),

  confirm: (id: string, data: { receivedByName?: string; receivedByCnic?: string; customerRating?: number; customerFeedback?: string; assemblyTimeSpent?: number; assemblyNotes?: string; assembled?: boolean }) =>
    apiClient.post('/furniture/deliveries/' + id + '/confirm', data).then(unwrap<FurnitureDelivery>),

  bill: (id: string, data: { paidAmount: number; paymentMethod: string }) =>
    apiClient.post('/furniture/deliveries/' + id + '/bill', data).then(unwrap<{ id: string; saleNumber: string; total: number; creditAmount: number }>),
};
