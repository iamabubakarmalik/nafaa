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
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const deliveriesApi = {
  create: (data: any) =>
    apiClient.post('/appliances/deliveries', data).then(unwrap<ApplianceDelivery>),
  list: (params?: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/appliances/deliveries', { params }).then(unwrap<ApplianceDelivery[]>),
  summary: () =>
    apiClient.get('/appliances/deliveries/summary').then(unwrap<any>),
  getOne: (id: string) =>
    apiClient.get('/appliances/deliveries/' + id).then(unwrap<ApplianceDelivery>),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    apiClient.patch('/appliances/deliveries/' + id + '/status', data).then(unwrap<ApplianceDelivery>),
  assignVehicle: (id: string, data: { vehicleNumber: string; driverName: string; driverPhone: string; helperCount?: number }) =>
    apiClient.post('/appliances/deliveries/' + id + '/assign-vehicle', data).then(unwrap<ApplianceDelivery>),
  confirm: (id: string, data: { receivedByName?: string; receivedByCnic?: string; signatureUrl?: string; photoUrls?: string[] }) =>
    apiClient.post('/appliances/deliveries/' + id + '/confirm', data).then(unwrap<ApplianceDelivery>),
};
