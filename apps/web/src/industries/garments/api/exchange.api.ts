import { apiClient } from '@core/api/client';
import { withManagerPin } from '@core/security/ManagerPin';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';

interface ExchangeLine {
  saleItemId: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  unit: string;
  quantity: number;
  /** Still on the bill (sold minus returned earlier). */
  returnable: number;
  /** What one unit refunds (after line and bill discounts). */
  unitRefund: number;
}

export interface ExchangePreview {
  sale: {
    id: string; saleNumber: string; soldAt: string; total: number; creditAmount: number; status: string;
    customer: { id: string; name: string; phone: string | null } | null;
    shop: { id: string; name: string } | null;
  };
  /** Shop's exchange window in days; 0 = no limit. */
  exchangeDays: number;
  days: number;
  late: boolean;
  needsPin: boolean;
  lines: ExchangeLine[];
}

interface ExchangeInput {
  saleId: string;
  returnItems: Array<{ saleItemId: string; quantity: number; restock?: boolean }>;
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  paymentMethod?: PaymentMethod;
  reason?: string;
}

export interface ExchangeResult {
  returnId: string;
  returnNumber: string;
  refundAmount: number;
  /** Part of the refund that cleared the old bill's khata. */
  khataAmount: number;
  /** Returned value used on the new bill. */
  credit: number;
  paidNow: number;
  days: number;
  late: boolean;
  sale: { id: string; saleNumber: string; total: number; paidAmount: number; changeAmount: number; creditAmount: number };
}

const unwrap = <T,>(res: { data: { data: T } }): T => res.data.data;

export const exchangeApi = {
  preview: (saleId: string) => apiClient.get('/garments/returns/exchange/' + saleId).then(unwrap<ExchangePreview>),
  /** Asks for the owner's or a manager's PIN when the server wants one, then sends again. */
  create: (data: ExchangeInput) => withManagerPin('Exchange', (managerPin) =>
    apiClient.post('/garments/returns/exchange', { ...data, managerPin }).then(unwrap<ExchangeResult>), 'refund'),
};
