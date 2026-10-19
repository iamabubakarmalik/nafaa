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
  project?: { id: string; name: string; projectNumber: string } | null;
  /** Bill number when the challan was made from a bill. */
  saleNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryTab = 'all' | 'open' | 'today' | 'partial' | 'delivered' | 'cancelled';

export interface DeliveryQuery {
  tab?: DeliveryTab;
  search?: string;
  from?: string;
  to?: string;
  saleId?: string;
  projectId?: string;
  customerId?: string;
}

export interface DeliveryPage {
  items: Delivery[];
  total: number;
  page: number;
  limit: number;
  counts: Record<DeliveryTab, number>;
  /** Delivery, loading and labour charges on the challans in the filter. */
  charges: number;
}

/** A bill line for a challan: sold (less returns), already sent and still to send. */
export interface BillLine {
  productId: string;
  name: string;
  unit: string;
  price: number;
  sold: number;
  sent: number;
  remaining: number;
}

export interface BillForChallan {
  sale: {
    id: string; saleNumber: string; status: string; shopId?: string | null; soldAt: string; total: number; customerId?: string | null;
    customer?: { id: string; name: string; phone?: string | null; address?: string | null; city?: string | null; area?: string | null } | null;
  };
  lines: BillLine[];
  challanCount: number;
}

export type SaleChallans = Record<string, { count: number; open: number; numbers: string[] }>;

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const deliveriesApi = {
  create: (data: Record<string, unknown>) => apiClient.post('/hardware/deliveries', data).then(unwrap<Delivery>),
  page: (params: DeliveryQuery & { page: number; limit: number }) => apiClient.get('/hardware/deliveries/page', { params }).then(unwrap<DeliveryPage>),
  summary: () => apiClient.get('/hardware/deliveries/summary').then(unwrap<{ pending: number; inTransit: number; deliveredCount: number; deliveredRevenue: number; todayScheduled: number }>),
  billLines: (saleId: string) => apiClient.get('/hardware/deliveries/sale/' + saleId).then(unwrap<BillForChallan>),
  forSales: (ids: string[]) => apiClient.get('/hardware/deliveries/for-sales', { params: { ids: ids.join(',') } }).then(unwrap<SaleChallans>),
  getOne: (id: string) => apiClient.get('/hardware/deliveries/' + id).then(unwrap<Delivery>),
  updateStatus: (id: string, status: DeliveryStatus, opts?: { cancellationReason?: string; issueReported?: string }) =>
    apiClient.patch('/hardware/deliveries/' + id + '/status', { status, ...opts }).then(unwrap<Delivery>),
  assignVehicle: (id: string, data: Partial<Pick<Delivery, 'vehicleType' | 'vehicleNumber' | 'driverName' | 'driverPhone' | 'helperName' | 'scheduledDate' | 'scheduledTime'>>) =>
    apiClient.post('/hardware/deliveries/' + id + '/assign-vehicle', data).then(unwrap<Delivery>),
  confirmDelivery: (id: string, data: { receivedByName?: string; receivedByPhone?: string; gateEntryNumber?: string; issueReported?: string; deliveredItems?: Array<{ itemId: string; deliveredQty: number; damagedQty?: number }> }) =>
    apiClient.post('/hardware/deliveries/' + id + '/confirm', data).then(unwrap<Delivery>),
  cancel: (id: string, reason: string) => apiClient.delete('/hardware/deliveries/' + id, { params: { reason } }).then(unwrap<Delivery>),
};
