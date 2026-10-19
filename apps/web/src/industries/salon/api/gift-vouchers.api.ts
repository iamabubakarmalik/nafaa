import { apiClient } from '@core/api/client';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

export type VoucherStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

export interface GiftVoucher {
  id: string;
  code: string;
  amount: number;
  balance: number;
  used: number;
  customerId?: string | null;
  saleId?: string | null;
  expiryDate?: string | null;
  status: VoucherStatus;
  customer?: { id: string; name: string; phone?: string | null } | null;
  sale?: { id: string; saleNumber: string; status: string } | null;
  createdAt: string;
}

export interface GiftVoucherDetail extends GiftVoucher {
  uses: Array<{ saleId: string; saleNumber: string; status: string; at: string; amount: number; givenBack: number }>;
}

/** What the counter needs about a code; `problem` says why it cannot be used now. */
export interface VoucherLookup {
  id: string; code: string; amount: number; balance: number; status: VoucherStatus; expiryDate?: string | null;
  customerName?: string | null; problem: string | null;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const giftVouchersApi = {
  sell: (data: { amount: number; customerId?: string; expiryDate?: string; paymentMethod: PaymentMethod }) =>
    apiClient.post('/salon/gift-vouchers', data).then(unwrap<GiftVoucher>),
  list: (params?: { status?: VoucherStatus; search?: string; customerId?: string }) =>
    apiClient.get('/salon/gift-vouchers', { params }).then(unwrap<{ items: GiftVoucher[]; totals: { active: number; balance: number; sold: number } }>),
  getOne: (id: string) => apiClient.get('/salon/gift-vouchers/' + id).then(unwrap<GiftVoucherDetail>),
  lookup: (code: string) => apiClient.get('/salon/gift-vouchers/lookup', { params: { code } }).then(unwrap<VoucherLookup>),
  cancel: (id: string) => apiClient.post('/salon/gift-vouchers/' + id + '/cancel').then(unwrap<GiftVoucher>),
};
