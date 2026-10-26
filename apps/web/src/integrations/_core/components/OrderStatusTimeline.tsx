import { Alert, Button, confirmDialog } from '@/design-system/components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Clock, CheckCircle2, ChefHat, Package, Bike, PackageCheck,
  XCircle, ChevronRight,
} from 'lucide-react';
import { integrationsApi } from '../api/integrations.api';
import { cn } from '@core/lib/cn';

const STATUS_FLOW = [
  { key: 'PENDING',          label: 'Pending',      icon: Clock },
  { key: 'CONFIRMED',        label: 'Confirmed',    icon: CheckCircle2 },
  { key: 'PREPARING',        label: 'Preparing',    icon: ChefHat },
  { key: 'READY',            label: 'Ready',        icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Del.', icon: Bike },
  { key: 'DELIVERED',        label: 'Delivered',    icon: PackageCheck },
];

/** Step colours: finished steps are a brand tint, the current step is solid, a delivered order is success. */
const stepClass = (key: string, done: boolean, current: boolean) => cn(
  !done && 'bg-slate-100 text-slate-400',
  done && !current && 'bg-brand-100 text-brand-700',
  current && (key === 'DELIVERED' ? 'bg-success-100 text-success-700 ring-success-500/30' : 'bg-brand-600 text-brand-fg ring-brand-500/25'),
);

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
              <div className={cn('flex h-6 w-6 items-center justify-center rounded-full transition', stepClass(s.key, isDone, isCurrent), isCurrent && 'ring-2')} title={s.label}>
                <Icon className="h-3 w-3" />
              </div>
              {i < STATUS_FLOW.length - 1 && (
                <div className={cn('h-0.5 w-3 rounded-full transition', i < currentIdx ? 'bg-brand-300' : 'bg-slate-200')} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {STATUS_FLOW.map((s, i) => {
          const Icon = s.icon;
          const isDone = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={s.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-full transition-all', stepClass(s.key, isDone, isCurrent), isCurrent && 'shadow-sm ring-4')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className={cn('text-center text-[0.625rem] font-semibold uppercase tracking-wider', isDone ? 'text-slate-800' : 'text-slate-400')}>
                  {s.label}
                </div>
              </div>
              {i < STATUS_FLOW.length - 1 && (
                <div className={cn('mx-1 h-1 flex-1 rounded-full transition', i < currentIdx ? 'bg-brand-300' : 'bg-slate-200')} />
              )}
            </div>
          );
        })}
      </div>

      {isTerminated ? (
        <Alert tone="danger" icon={<XCircle className="h-4 w-4 text-rose-600" />} title={`Order ${currentStatus.toLowerCase()}`} />
      ) : (
        <div className="flex items-center gap-2">
          {nextStatus && (
            <Button className="flex-1" loading={updateMutation.isPending} onClick={() => updateMutation.mutate(nextStatus.key)} rightIcon={<ChevronRight className="h-4 w-4" />}>
              Aage: {nextStatus.label}
            </Button>
          )}
          <Button variant="critical" loading={cancelMutation.isPending}
            onClick={async () => { if (await confirmDialog({ title: 'Ye order cancel karein?', danger: true })) cancelMutation.mutate(); }}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
