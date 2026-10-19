import { apiClient } from '@core/api/client';
import type { PaymentMethod, SalePaymentPart } from '@modules/sales/sales/api/sales.api';

export interface SalonBillInput {
  appointmentId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  services: Array<{
    serviceId: string;
    staffProfileId?: string;
    price?: number;
    notes?: string;
    packagePurchaseId?: string;
    used?: Array<{ productId: string; variantId?: string; quantity: number }>;
  }>;
  products?: Array<{ productId: string; variantId?: string; batchId?: string; quantity: number; price?: number }>;
  useMembership?: boolean;
  discount?: number;
  tip?: number;
  voucherCode?: string;
  voucherAmount?: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  payments?: SalePaymentPart[];
  managerPin?: string;
  note?: string;
}

export interface SalonBill {
  id: string; saleNumber: string; total: number; paidAmount: number; changeAmount: number; creditAmount: number;
  appointment: { id: string; appointmentNumber: string } | null;
  voucher?: { code: string; used: number; balance: number };
}

export interface SalonPerks {
  membership: { id: string; membershipNumber: string; planName: string; tier: string; discountPct: number; expiryDate: string } | null;
  packages: Array<{ id: string; purchaseNumber: string; packageName: string; sessionsRemaining: number; expiryDate: string; serviceIds: string[] }>;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const salonBillsApi = {
  create: (data: SalonBillInput) => apiClient.post('/salon/bills', data).then(unwrap<SalonBill>),
  perks: (customerId: string) => apiClient.get('/salon/bills/perks', { params: { customerId } }).then(unwrap<SalonPerks>),
};
