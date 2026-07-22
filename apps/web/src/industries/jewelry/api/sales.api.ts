import { apiClient } from '@core/api/client';

export type JewelryOrderStatus = 'DRAFT' | 'QUOTED' | 'CONFIRMED' | 'DESIGNING' | 'METAL_ISSUED'
  | 'IN_PRODUCTION' | 'POLISHING' | 'QUALITY_CHECK' | 'HALLMARKING' | 'READY' | 'DELIVERED' | 'CANCELLED' | 'ON_HOLD';

export interface JewelrySale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerCnic?: string;
  customerAddress?: string;
  saleDate: string;
  status: JewelryOrderStatus;
  metalRateSnapshot?: any;
  grossWeight: number;
  netWeight: number;
  metalValue: number;
  makingCharges: number;
  wastageValue: number;
  polishCharges: number;
  hallmarkCharges: number;
  stoneValue: number;
  gstAmount: number;
  otherCharges: number;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  exchangeMetalGrams: number;
  exchangeValue: number;
  hallmarkVerified: boolean;
  hasCertificate: boolean;
  isReturned: boolean;
  isExchanged: boolean;
  customerNotes?: string;
  internalNotes?: string;
  items: any[];
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const jewelrySalesApi = {
  create: (data: any) => apiClient.post('/jewelry/sales', data).then(unwrap<JewelrySale>),
  list: (params?: any) => apiClient.get('/jewelry/sales', { params }).then(unwrap<JewelrySale[]>),
  getOne: (id: string) => apiClient.get('/jewelry/sales/' + id).then(unwrap<JewelrySale>),
  updateStatus: (id: string, status: string, cancellationReason?: string) =>
    apiClient.patch('/jewelry/sales/' + id + '/status', { status, cancellationReason }).then(unwrap<JewelrySale>),
  addPayment: (id: string, amount: number, paymentMethod?: string) =>
    apiClient.post('/jewelry/sales/' + id + '/payment', { amount, paymentMethod }).then(unwrap<JewelrySale>),
  markReturned: (id: string, reason: string) => apiClient.post('/jewelry/sales/' + id + '/return', { reason }).then(unwrap<JewelrySale>),
  markExchanged: (id: string, exchangeType: string) => apiClient.post('/jewelry/sales/' + id + '/exchange', { exchangeType }).then(unwrap<JewelrySale>),
};
