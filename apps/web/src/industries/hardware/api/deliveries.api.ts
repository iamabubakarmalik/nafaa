import { apiClient } from '@core/api/client';

export type DeliveryStatus = 'PENDING' | 'SCHEDULED' | 'LOADED' | 'DISPATCHED' | 'IN_TRANSIT'
  | 'DELIVERED' | 'PARTIALLY_DELIVERED' | 'FAILED' | 'CANCELLED' | 'RETURNED';

export type VehicleType = 'PICKUP' | 'MINI_TRUCK' | 'TRUCK' | 'TRAILER' | 'DUMPER' | 'CRANE'
  | 'RICKSHAW' | 'MOTORCYCLE' | 'CUSTOMER_PICKUP' | 'OTHER';

export interface DeliveryItem {
  id?: string;
  productId?: string;
  variantId?: string;
  itemName: string;
  brand?: string;
  orderedQty: number;
  loadedQty: number;
  deliveredQty: number;
  returnedQty: number;
  damagedQty: number;
  unit: string;
  unitPrice: number;
  total: number;
  notes?: string;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  saleId?: string;
  projectId?: string;
  quotationId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  siteContactName?: string;
  siteContactPhone?: string;
  status: DeliveryStatus;
  vehicleType: VehicleType;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  driverCnic?: string;
  helperName?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  loadedAt?: string;
  dispatchedAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  distanceKm?: number;
  deliveryCharge: number;
  loadingCharge: number;
  unloadingCharge: number;
  laborCharge: number;
  tollCharge: number;
  totalCharges: number;
  receivedByName?: string;
  receivedByPhone?: string;
  receivedByCnic?: string;
  receiverSignatureUrl?: string;
  deliveryProofUrls: string[];
  gateEntryNumber?: string;
  loadingInstructions?: string;
  driverInstructions?: string;
  customerNotes?: string;
  internalNotes?: string;
  issueReported?: string;
  items: DeliveryItem[];
  project?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const deliveriesApi = {
  create: (data: any) => apiClient.post('/hardware/deliveries', data).then(unwrap<Delivery>),
  list: (params?: any) => apiClient.get('/hardware/deliveries', { params }).then(unwrap<Delivery[]>),
  summary: () => apiClient.get('/hardware/deliveries/summary').then(unwrap<any>),
  getOne: (id: string) => apiClient.get('/hardware/deliveries/' + id).then(unwrap<Delivery>),
  updateStatus: (id: string, status: string, opts?: { cancellationReason?: string; issueReported?: string }) =>
    apiClient.patch('/hardware/deliveries/' + id + '/status', { status, ...opts }).then(unwrap<Delivery>),
  assignVehicle: (id: string, data: any) => apiClient.post('/hardware/deliveries/' + id + '/assign-vehicle', data).then(unwrap<Delivery>),
  confirmDelivery: (id: string, data: any) => apiClient.post('/hardware/deliveries/' + id + '/confirm', data).then(unwrap<Delivery>),
  remove: (id: string) => apiClient.delete('/hardware/deliveries/' + id).then(unwrap),
};
