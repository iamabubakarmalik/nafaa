import { Award } from 'lucide-react';
import { formatPKR } from '@/lib/format';
import { useRestaurantOrderForSale } from '../hooks/useRestaurantOrderForSale';

/**
 * Extra totals rows for restaurant receipts:
 *   • Service charge (% of subtotal)
 *   • Tax
 *   • Delivery fee
 *   • Packaging fee
 *   • Tip
 *
 * Rendered inside the receipt totals block, above the grand total.
 * If the sale isn\'t a restaurant order, renders nothing.
 */
export function RestaurantTotalsExtension({ sale }: { sale: any }) {
  const { data: order } = useRestaurantOrderForSale(sale?.id, sale?.saleNumber);
  if (!order) return null;

  const rows: Array<{ label: string; amount: number; tone: string; icon?: any }> = [];

  if (order.serviceCharge > 0) {
    rows.push({
      label: `Service Charge (${order.serviceChargePct}%)`,
      amount: order.serviceCharge,
      tone: 'orange',
    });
  }
  if (order.taxAmount > 0) {
    rows.push({
      label: `Tax (${order.taxPct}%)`,
      amount: order.taxAmount,
      tone: 'slate',
    });
  }
  if (order.deliveryFee > 0) {
    rows.push({ label: 'Delivery Fee', amount: order.deliveryFee, tone: 'violet' });
  }
  if (order.packagingFee > 0) {
    rows.push({ label: 'Packaging', amount: order.packagingFee, tone: 'slate' });
  }
  if (order.tip > 0) {
    rows.push({ label: 'Tip', amount: order.tip, tone: 'emerald', icon: Award });
  }

  if (rows.length === 0) return null;

  const toneMap: Record<string, string> = {
    orange: 'text-orange-700',
    slate: 'text-slate-700',
    violet: 'text-violet-700',
    emerald: 'text-emerald-700',
  };

  return (
    <>
      {rows.map((r, i) => {
        const Icon = r.icon;
        return (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className={`font-semibold ${toneMap[r.tone]} inline-flex items-center gap-1`}>
              {Icon && <Icon className="h-3 w-3" />}
              {r.label}
            </span>
            <span className={`font-bold tabular-nums ${toneMap[r.tone]}`}>
              +{formatPKR(r.amount)}
            </span>
          </div>
        );
      })}
    </>
  );
}
