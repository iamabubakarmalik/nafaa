/** The bill's money, live, as the cashier changes it (same maths as the web counter). */

import { useMemo } from 'react';
import { billTotals, deliveryCharge, type BillTotals, type ServiceChargeItem } from '@nafaa/core/pos';
import { useBill } from './bill';
import { useCounter } from './counter';

/** Every charge on the bill: delivery first, then the others. */
export function billCharges(delivery: Parameters<typeof deliveryCharge>[0], charges: ServiceChargeItem[]): ServiceChargeItem[] {
  const d = deliveryCharge(delivery);
  return [...(d ? [d] : []), ...charges];
}

export function useBillTotals(): BillTotals & { allCharges: ServiceChargeItem[] } {
  const lines = useBill((s) => s.lines);
  const discountMode = useBill((s) => s.discountMode);
  const discountPct = useBill((s) => s.discountPct);
  const discountRs = useBill((s) => s.discountRs);
  const promo = useBill((s) => s.promo);
  const pointsWanted = useBill((s) => s.pointsWanted);
  const customer = useBill((s) => s.customer);
  const delivery = useBill((s) => s.delivery);
  const charges = useBill((s) => s.charges);
  const { loyalty } = useCounter();
  return useMemo(() => {
    const allCharges = billCharges(delivery, charges);
    const totals = billTotals({
      lines, discountMode, discountPct, discountRs, codeDiscount: promo?.discount ?? 0, pointsWanted, charges: allCharges,
      loyalty: { on: loyalty.on && !!customer, available: customer?.loyaltyPoints ?? 0, rate: loyalty.rate, maxRedeemPercent: loyalty.maxRedeemPercent, minRedeem: loyalty.minRedeem },
    });
    return { ...totals, allCharges };
  }, [lines, discountMode, discountPct, discountRs, promo, pointsWanted, customer, delivery, charges, loyalty]);
}
