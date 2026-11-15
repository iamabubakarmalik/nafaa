/** Badge colour and timeline steps for order statuses. */
import type { OrderStatus } from '@/lib/types';

export function statusTone(s: OrderStatus): 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'brand' {
  if (s === 'DELIVERED') return 'green';
  if (s === 'CANCELLED' || s === 'DISPUTED') return 'red';
  if (s === 'REFUNDED' || s === 'RETURNED') return 'gray';
  if (s === 'OUT_FOR_DELIVERY') return 'blue';
  return 'brand';
}

export function timelineSteps(deliveryType: string): OrderStatus[] {
  const pickup = /PICKUP|DINE_IN/.test(deliveryType);
  return pickup ? ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERED'] : ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
}
