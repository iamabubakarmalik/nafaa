import { Check, Clock, Package, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import type { OrderStatus } from '@/types';

const stepIcons: Record<OrderStatus, any> = {
  DRAFT: Clock, PENDING: Clock, CONFIRMED: Check, PREPARING: Package,
  READY_FOR_PICKUP: Package, OUT_FOR_DELIVERY: Truck, DELIVERED: CheckCircle2,
  CANCELLED: XCircle, REFUNDED: XCircle, DISPUTED: XCircle, RETURNED: XCircle,
};

const stepLabels: Record<OrderStatus, string> = {
  DRAFT: 'Draft', PENDING: 'Order placed', CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing', READY_FOR_PICKUP: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled', REFUNDED: 'Refunded', DISPUTED: 'Disputed', RETURNED: 'Returned',
};

interface OrderTimelineProps {
  timeline: Array<{
    status: OrderStatus;
    reached: boolean;
    reachedAt: string | null;
    isCurrent: boolean;
  }>;
}

export function OrderTimeline({ timeline }: OrderTimelineProps) {
  return (
    <div className="relative">
      {timeline.map((step, i) => {
        const Icon = stepIcons[step.status];
        const isLast = i === timeline.length - 1;
        return (
          <div key={step.status} className="flex gap-4 pb-6 relative last:pb-0">
            {/* Vertical line */}
            {!isLast && (
              <div className={cn(
                'absolute left-5 top-11 bottom-0 w-0.5',
                step.reached ? 'bg-brand-500' : 'bg-border',
              )} />
            )}

            {/* Icon */}
            <div className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center shrink-0 relative z-10 transition-all',
              step.reached
                ? 'bg-brand-600 text-white shadow-brand'
                : 'bg-surface-muted text-content-subtle border-2 border-border',
              step.isCurrent && 'ring-4 ring-brand-500/20 animate-pulse-soft',
            )}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Text */}
            <div className="flex-1 pt-1.5">
              <div className={cn(
                'font-black text-sm',
                step.reached ? 'text-content' : 'text-content-subtle',
              )}>
                {stepLabels[step.status]}
                {step.isCurrent && (
                  <span className="ml-2 inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                    Current
                  </span>
                )}
              </div>
              {step.reachedAt && (
                <div className="text-2xs text-content-muted mt-0.5">
                  {timeAgo(step.reachedAt)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
