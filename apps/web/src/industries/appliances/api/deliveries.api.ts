import { apiClient } from '@core/api/client';

export interface ApplianceDelivery {
  id: string;
  deliveryNumber: string;
  saleId?: string;
  serialTrackingIds: string[];
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  city?: string;
  area?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  floorNumber?: number;
  hasLift?: boolean;
  scheduledDate?: string;
  scheduledSlot?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  helperCount?: number;
  dispatchedAt?: string;
  arrivedAt?: string;
  deliveredAt?: string;
  status: string;
  deliveryCharge: number;
  loadingCharge: number;
  unloadingCharge: number;
  floorCharge: number;
  totalCharge: number;
  requiresInstallation: boolean;
  installationLinked: boolean;
  receivedByName?: string;
  receivedByCnic?: string;
  signatureUrl?: string;
  photoUrls: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /** Money side, from the server: paid so far and still owed. */
  paidAmount?: number;
  dueAmount?: number;
  billId?: string | null;
}

export type DeliveryView = 'open' | 'today' | 'novehicle' | 'late' | 'unpaid' | 'delivered' | 'closed' | 'all';

export interface DeliveryPage {
  items: ApplianceDelivery[]; total: number; page: number; limit: number; totalPages: number; totals: { charges: number };
}

export interface DeliveryDetail extends ApplianceDelivery {
  serials?: Array<{ id: string; serialNumber: string; modelNumber?: string | null; productId: string; status: string }>;
  installation?: { id: string; installationNumber: string; status: string; scheduledDate?: string | null } | null;
  sale?: { id: string; saleNumber: string; total: number } | null;
  /** The counter bill already charged for this delivery. */
  chargedAtCounter?: boolean;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export interface DeliverySummary {
  pending: number; scheduled: number; dispatched: number; delivered: number;
  todayScheduled: number;
  arrived: number; cancelled: number; open: number;
  /** Gaari abhi tak nahi lagi */
  noVehicle: number;
  /** Tareekh guzar gayi lekin maal nahi pohancha */
  overdue: number;
  /** Maal pohanch gaya lekin installation abhi book nahi hui */
  installationPending: number;
  month: {
    trips: number; revenue: number; avgTrip: number;
    breakdown: { delivery: number; loading: number; unloading: number; floor: number };
  };
}

export const deliveriesApi = {
  create: (data: any) =>
    apiClient.post('/appliances/deliveries', data).then(unwrap<ApplianceDelivery>),
  list: (params?: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/appliances/deliveries', { params }).then(unwrap<ApplianceDelivery[]>),
  page: (params: { view?: DeliveryView; search?: string; from?: string; to?: string; page: number; limit?: number }) =>
    apiClient.get('/appliances/deliveries', { params }).then(unwrap<DeliveryPage>),
  summary: () =>
    apiClient.get('/appliances/deliveries/summary').then(unwrap<DeliverySummary>),
  getOne: (id: string) =>
    apiClient.get('/appliances/deliveries/' + id).then(unwrap<DeliveryDetail>),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    apiClient.patch('/appliances/deliveries/' + id + '/status', data).then(unwrap<ApplianceDelivery>),
  assignVehicle: (id: string, data: { vehicleNumber: string; driverName: string; driverPhone?: string; helperCount?: number; scheduledDate?: string; scheduledSlot?: string }) =>
    apiClient.post('/appliances/deliveries/' + id + '/assign-vehicle', data).then(unwrap<ApplianceDelivery>),
  confirm: (id: string, data: { receivedByName?: string; receivedByCnic?: string; paidAmount?: number; paymentMethod?: string }) =>
    apiClient.post('/appliances/deliveries/' + id + '/confirm', data).then(unwrap<ApplianceDelivery>),
  addPayment: (id: string, data: { amount: number; paymentMethod?: string; note?: string }) =>
    apiClient.post('/appliances/deliveries/' + id + '/payment', data).then(unwrap<ApplianceDelivery>),
};
