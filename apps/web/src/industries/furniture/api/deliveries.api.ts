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
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const deliveriesApi = {
  create: (data: Partial<FurnitureDelivery>) =>
    apiClient.post('/furniture/deliveries', data).then(unwrap<FurnitureDelivery>),

  list: (params?: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/furniture/deliveries', { params }).then(unwrap<FurnitureDelivery[]>),

  summary: () => apiClient.get('/furniture/deliveries/summary').then(unwrap<any>),
  today: () => apiClient.get('/furniture/deliveries/today').then(unwrap<FurnitureDelivery[]>),

  getOne: (id: string) => apiClient.get('/furniture/deliveries/' + id).then(unwrap<FurnitureDelivery>),

  assignVehicle: (id: string, data: { vehicleType?: string; vehicleNumber: string; driverName: string; driverPhone: string; helpersCount?: number }) =>
    apiClient.post('/furniture/deliveries/' + id + '/assign-vehicle', data).then(unwrap<FurnitureDelivery>),

  updateStatus: (id: string, data: { status: FurnitureDeliveryStatus; notes?: string }) =>
    apiClient.patch('/furniture/deliveries/' + id + '/status', data).then(unwrap<FurnitureDelivery>),

  confirm: (id: string, data: any) =>
    apiClient.post('/furniture/deliveries/' + id + '/confirm', data).then(unwrap<FurnitureDelivery>),

  remove: (id: string) => apiClient.delete('/furniture/deliveries/' + id).then(unwrap),
};
