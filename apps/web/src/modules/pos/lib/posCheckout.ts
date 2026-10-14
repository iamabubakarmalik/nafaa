/**
 * Turns the checkout dialog's answer into the sale's payment fields, for the
 * POS engine and the industry POS pages that build their own bill.
 */

import { toast } from 'sonner';
import { customerLedgerApi } from '@modules/customers/khata/api/customer-ledger.api';
import type { SalePaymentPart } from '@modules/sales/sales/api/sales.api';
import type { PosCheckoutResult } from '../components/PosCheckoutModal';

/**
 * Payment fields of the sale. An advance kept in khata is not change: the
 * sale records the bill total and the extra goes to the ledger separately.
 */
export function salePayment(d: PosCheckoutResult, total: number) {
  return {
    paymentMethod: d.paymentMethod,
    paidAmount: d.depositExtra ? Math.min(d.paidAmount, total) : d.paidAmount,
    ...(d.payments && { payments: d.payments }),
  };
}

/** Puts what was paid over the bill on the customer's khata as an advance. True when saved. */
export async function keepAdvance(d: PosCheckoutResult, total: number, customerId: string | undefined, saleNumber?: string): Promise<boolean> {
  if (!d.depositExtra || !customerId || d.paidAmount <= total) return false;
  try {
    await customerLedgerApi.receivePayment(customerId, {
      amount: Number((d.paidAmount - total).toFixed(2)),
      paymentMethod: d.paymentMethod,
      reference: saleNumber,
      note: `Bill ${saleNumber ?? ''} par zyada diya — advance`,
    });
    return true;
  } catch {
    toast.error('Advance khate mein jama nahi hua — customer ko wapas dein ya Khata se jama karein');
    return false;
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Split parts brought to exactly `total`, for flows that settle a fixed bill
 * (a restaurant order): change comes off the cash, and a small difference
 * between the counter's preview and the server's total goes on the largest part.
 */
export function partsForTotal(parts: SalePaymentPart[], total: number): SalePaymentPart[] {
  const out = parts.map((p) => ({ ...p }));
  let over = r2(out.reduce((s, p) => s + p.amount, 0) - total);
  for (const p of out) {
    if (over <= 0) break;
    if (p.method !== 'CASH') continue;
    const cut = Math.min(p.amount, over);
    p.amount = r2(p.amount - cut);
    over = r2(over - cut);
  }
  if (over !== 0) {
    const big = out.reduce((a, b) => (b.amount > a.amount ? b : a), out[0]);
    if (big) big.amount = r2(big.amount - over);
  }
  return out.filter((p) => p.amount > 0);
}
