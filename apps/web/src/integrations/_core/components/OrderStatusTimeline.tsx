import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Clock, CheckCircle2, ChefHat, Package, Bike, PackageCheck,
  XCircle, ChevronRight,
} from 'lucide-react';
import { integrationsApi } from '../api/integrations.api';
import { cn } from '@core/lib/cn';

const STATUS_FLOW = [
  { key: 'PENDING',          label: 'Pending',      icon: Clock,        color: 'amber' },
  { key: 'CONFIRMED',        label: 'Confirmed',    icon: CheckCircle2, color: 'blue' },
  { key: 'PREPARING',        label: 'Preparing',    icon: ChefHat,      color: 'purple' },
  { key: 'READY',            label: 'Ready',        icon: Package,      color: 'cyan' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Del.', icon: Bike,         color: 'orange' },
  { key: 'DELIVERED',        label: 'Delivered',    icon: PackageCheck, color: 'emerald' },
];

const COLOR_CLASSES: Record<string, string> = {
  amber:   'bg-amber-500 text-white',
  blue:    'bg-blue-500 text-white',
  purple:  'bg-purple-500 text-white',
  cyan:    'bg-cyan-500 text-white',
  orange:  'bg-orange-500 text-white',
  emerald: 'bg-emerald-500 text-white',
};

export function OrderStatusTimeline({
  orderId,
  currentStatus,
  compact = false,
}: {
  orderId: string;
  currentStatus: string;
  compact?: boolean;
}) {
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (status: string) => integrationsApi.updateOrderStatus(orderId, status),
    onSuccess: (_, status) => {
      toast.success(`Status → ${status}`);
      qc.invalidateQueries({ queryKey: ['channel-orders'] });
      qc.invalidateQueries({ queryKey: ['integrations-dashboard'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => integrationsApi.updateOrderStatus(orderId, 'CANCELLED'),
    onSuccess: () => {
      toast.success('Cancelled');
      qc.invalidateQueries({ queryKey: ['channel-orders'] });
    },
  });

  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === currentStatus);
  const isTerminated = currentStatus === 'CANCELLED' || currentStatus === 'REJECTED';
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {STATUS_FLOW.map((s, i) => {
          const Icon = s.icon;
          const isDone = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <div
                className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center transition',
                  isDone
                    ? COLOR_CLASSES[s.color]
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-400',
                  isCurrent && 'ring-2 ring-offset-1 ring-' + s.color + '-500 animate-pulse',
                )}
                title={s.label}
              >
                <Icon className="h-3 w-3" />
              </div>
              {i < STATUS_FLOW.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-3 transition',
                    i < currentIdx ? COLOR_CLASSES[s.color] : 'bg-slate-200 dark:bg-neutral-700',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Timeline */}
      <div className="flex items-center justify-between">
        {STATUS_FLOW.map((s, i) => {
          const Icon = s.icon;
          const isDone = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center transition-all',
                    isDone
                      ? COLOR_CLASSES[s.color] + ' shadow-lg'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-400',
                    isCurrent && 'ring-4 ring-offset-2 ring-' + s.color + '-200 dark:ring-' + s.color + '-900/50 animate-pulse',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className={cn(
                  'text-[9px] font-black uppercase tracking-wider text-center',
                  isDone ? 'text-slate-800 dark:text-white' : 'text-slate-400',
                )}>
                  {s.label}
                </div>
              </div>
              {i < STATUS_FLOW.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-1 rounded-full transition',
                    i < currentIdx ? COLOR_CLASSES[s.color] : 'bg-slate-200 dark:bg-neutral-700',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {isTerminated ? (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
          <XCircle className="h-5 w-5 text-rose-600" />
          <span className="text-sm font-black text-rose-700 dark:text-rose-400">
            Order {currentStatus.toLowerCase()}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {nextStatus && (
            <button
              onClick={() => updateMutation.mutate(nextStatus.key)}
              disabled={updateMutation.isPending}
              className={cn(
                'flex-1 h-10 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition',
                COLOR_CLASSES[nextStatus.color],
                'hover:shadow-lg active:scale-95 disabled:opacity-50',
              )}
            >
              Move to {nextStatus.label}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (window.confirm('Cancel this order?')) cancelMutation.mutate();
            }}
            className="h-10 px-4 rounded-xl bg-rose-100 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-200 text-xs font-black"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
