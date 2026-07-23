import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Package, MapPin, Phone, CheckCircle2, Circle } from 'lucide-react';
import { ordersApi } from '../api/orders.api';
import { useJoinRoom, useSocketEvent } from '@lib/realtime/useSocket';
import { Button } from '@shared/ui/Button';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { cn } from '@lib/cn';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.detail(id!),
    enabled: !!id,
  });

  const { data: track } = useQuery({
    queryKey: ['order-track', id],
    queryFn: () => ordersApi.track(id!),
    enabled: !!id,
    refetchInterval: order?.isActive ? 15000 : false,
  });

  // Real-time updates
  useJoinRoom('order', id);
  useSocketEvent('order:update', () => { refetch(); }, [id]);
  useSocketEvent('rider:location', (data: any) => {
    console.log('Rider location:', data);
  }, [id]);

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => ordersApi.cancel(id!, reason),
    onSuccess: () => { toast.success('Order cancel ho gaya'); refetch(); },
  });

  const reorderMutation = useMutation({
    mutationFn: () => ordersApi.reorder(id!),
    onSuccess: (data: any) => {
      toast.success(data.message || 'Cart mein add ho gaya');
      navigate('/cart');
    },
  });

  if (isLoading || !order) return <SkeletonCard />;

  return (
    <div className="space-y-4 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Status Timeline */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 via-emerald-700 to-teal-800 text-white p-5 shadow-brand-lg">
        <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Order</div>
        <div className="text-xl font-black">#{order.orderNumber}</div>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-70">Current Status</div>
            <div className="font-extrabold">{order.status}</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {track?.timeline && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-5 shadow-soft">
          <h3 className="font-extrabold text-slate-900 dark:text-white mb-4">🚚 Order Journey</h3>
          <div className="space-y-4">
            {track.timeline.map((step: any, i: number) => (
              <div key={step.status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {step.reached ? (
                    <CheckCircle2 className={cn('h-6 w-6', step.isCurrent ? 'text-brand-600 animate-pulse-soft' : 'text-success-600')} />
                  ) : (
                    <Circle className="h-6 w-6 text-slate-300" />
                  )}
                  {i < track.timeline.length - 1 && (
                    <div className={cn('w-0.5 flex-1 min-h-8 mt-1', step.reached ? 'bg-brand-600' : 'bg-slate-200')} />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className={cn('font-extrabold text-sm', step.reached ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>
                    {step.status.replace(/_/g, ' ')}
                  </div>
                  {step.reachedAt && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(step.reachedAt).toLocaleString('en-PK')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-5 shadow-soft">
        <h3 className="font-extrabold text-slate-900 dark:text-white mb-3">📦 Items ({order.items?.length})</h3>
        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
          {order.items?.map((it: any) => (
            <div key={it.id} className="py-3 flex gap-3">
              {it.imageUrl && <img src={it.imageUrl} className="h-14 w-14 rounded-xl object-cover" alt="" />}
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{it.productName}</div>
                <div className="text-xs text-slate-500 mt-0.5">Qty: {it.quantity} × Rs {Number(it.unitPrice).toFixed(0)}</div>
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                Rs {Number(it.total).toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Address */}
      {order.address && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-5 shadow-soft">
          <h3 className="font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-600" />
            Delivery Address
          </h3>
          <div className="text-sm text-slate-700 dark:text-slate-300">
            <div className="font-bold">{order.address.fullName}</div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <Phone className="h-3 w-3" />
              {order.address.phone}
            </div>
            <div className="text-xs mt-1">{order.address.addressLine1}, {order.address.area}, {order.address.city}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {order.canCancel && (
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              const reason = prompt('Cancel karne ki wajah?');
              if (reason) cancelMutation.mutate(reason);
            }}
          >
            Cancel Order
          </Button>
        )}
        {order.canReorder && (
          <Button variant="primary" fullWidth onClick={() => reorderMutation.mutate()}>
            Reorder
          </Button>
        )}
      </div>
    </div>
  );
}
