/**
 * New order from the floor or the orders list: /restaurant/orders/new
 * ?mode=TAKEAWAY · ?tableId=… (from the floor) · ?orderId=… (add dishes to a
 * running order; only the new ones go to the kitchen).
 */

import { useSearchParams } from 'react-router-dom';
import { RequireShop } from '@modules/pos/components';
import type { OrderMode } from '../api/orders.api';
import { OrderComposer } from '../components/OrderComposer';
import { ORDER_MODES } from '../lib/orderMeta';

export default function NewOrderPage() {
  const [params] = useSearchParams();
  const mode = params.get('mode') as OrderMode | null;
  const orderId = params.get('orderId') ?? undefined;
  return (
    <RequireShop action="Order lene">
      <OrderComposer key={orderId ?? 'new'} orderId={orderId} initialTableId={params.get('tableId') ?? undefined}
        initialMode={mode && ORDER_MODES.includes(mode) ? mode : undefined} />
    </RequireShop>
  );
}
