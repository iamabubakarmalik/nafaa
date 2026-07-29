import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Package, CheckCircle2, XCircle, Clock, Truck,
  RefreshCw, ArrowRight, ShoppingCart, MapPin, Phone,
} from 'lucide-react';
import { integrationsApi } from '../api/integrations.api';
import { OrderStatusTimeline } from './OrderStatusTimeline';
import { Button } from '@core/ui/Button';
import { Badge } from '@core/ui/Badge';
import { SkeletonCard } from '@core/ui/Skeleton';
import { cn } from '@core/lib/cn';

const STATUS_CONFIG: Record<string, { label: string; color: any; icon: any }> = {
  PENDING:           { label: 'Pending',           color: 'warning', icon: Clock },
  CONFIRMED:         { label: 'Confirmed',         color: 'info',    icon: CheckCircle2 },
  PREPARING:         { label: 'Preparing',         color: 'info',    icon: Package },
  READY:             { label: 'Ready',             color: 'info',    icon: Package },
  OUT_FOR_DELIVERY:  { label: 'Out for Delivery',  color: 'info',    icon: Truck },
  DELIVERED:         { label: 'Delivered',         color: 'success', icon: CheckCircle2 },
  CANCELLED:         { label: 'Cancelled',         color: 'danger',  icon: XCircle },
  REJECTED:          { label: 'Rejected',          color: 'danger',  icon: XCircle },
};

export function ChannelOrdersPanel({ integrations }: { integrations: any[] }) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

  const integrationId = selectedIntegration ?? integrations[0]?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['channel-orders', integrationId, filterStatus],
    queryFn: () => integrationsApi.listOrders(integrationId!, filterStatus ?? undefined, 50, 0),
    enabled: !!integrationId,
    refetchInterval: 30_000,
  });

  const convertMutation = useMutation({
    mutationFn: integrationsApi.convertOrder,
    onSuccess: () => {
      toast.success('Sale mein convert ho gaya! ✅');
      queryClient.invalidateQueries({ queryKey: ['channel-orders'] });
      queryClient.invalidateQueries({ queryKey: ['integrations-dashboard'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error'),
  });

  const acceptMutation = useMutation({
    mutationFn: ({ intId, orderId }: { intId: string; orderId: string }) =>
      integrationsApi.acceptFoodpandaOrder(intId, orderId),
    onSuccess: () => {
      toast.success('Order accept ho gaya ✅');
      refetch();
    },
  });

  if (integrations.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 dark:bg-neutral-900 p-12 text-center">
        <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-3" />
        <div className="font-black text-slate-900 dark:text-white">Koi integration connected nahi</div>
        <p className="text-sm text-slate-500 mt-1">Pehle ek sales channel connect karein</p>
      </div>
    );
  }

  const orders = data?.items ?? [];
  const counts = data?.counts ?? {};

  return (
    <div className="space-y-4">
      {/* Integration selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {integrations.filter((i) => i.category === 'SALES_CHANNEL').map((i) => (
          <button
            key={i.id}
            onClick={() => setSelectedIntegration(i.id)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5',
              (integrationId === i.id)
                ? 'bg-brand-600 text-white shadow-brand'
                : 'bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100',
            )}
          >
            {getIntegrationEmoji(i.type)} {i.displayName}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus(null)}
          className={cn(
            'px-2.5 py-1 rounded-full text-[11px] font-bold transition',
            !filterStatus ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-neutral-800 text-slate-500',
          )}
        >
          All ({Object.values(counts).reduce((a, b) => a + b, 0)})
        </button>
        {Object.entries(counts).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1',
                filterStatus === status
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 hover:bg-slate-200',
              )}
            >
              {cfg.label} ({count as number})
            </button>
          );
        })}
        <Button size="sm" variant="ghost" leftIcon={<RefreshCw className="h-3 w-3" />} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 dark:bg-neutral-900 p-12 text-center">
          <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <div className="font-black text-slate-900 dark:text-white">Koi orders nahi</div>
          <p className="text-sm text-slate-500 mt-1">
            {filterStatus ? `${filterStatus} status mein koi order nahi` : 'Jab platform se orders aayeinge yahan dikhenge'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => {
            const cfg = STATUS_CONFIG[order.orderStatus] ?? STATUS_CONFIG.PENDING;
            const StatusIcon = cfg.icon;
            return (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg transition"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-lg shrink-0">
                      {getIntegrationEmoji(order.integration?.type)}
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">
                        Order #{order.externalOrderNumber ?? order.externalOrderId}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        {order.integration?.displayName} · {new Date(order.receivedAt).toLocaleString('en-PK', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                  <Badge variant={cfg.color} size="sm">
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </div>

                {/* Customer info */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/50">
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5">Customer</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{order.customerName}</div>
                    {order.customerPhone && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-2.5 w-2.5" /> {order.customerPhone}
                      </div>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/50">
                    <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5">Delivery</div>
                    {order.customerAddress && (
                      <div className="text-[10px] text-slate-600 dark:text-slate-400 flex items-start gap-1">
                        <MapPin className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{order.customerAddress}, {order.customerCity}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="mb-3">
                  <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Items</div>
                  <div className="space-y-1">
                    {(order.items as any[]).slice(0, 4).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 dark:text-slate-300 font-bold">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="text-slate-500 font-bold">Rs {Number(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                    {(order.items as any[]).length > 4 && (
                      <div className="text-[10px] text-slate-400 font-bold">
                        +{(order.items as any[]).length - 4} more items
                      </div>
                    )}
                  </div>
                </div>

                {/* Total + payment */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-neutral-800">
                  <div className="text-xs font-bold text-slate-500">
                    Payment: <span className="text-slate-900 dark:text-white">{order.paymentMethod ?? 'COD'}</span>
                    <span className={cn(
                      'ml-2 px-1.5 py-0.5 rounded text-[9px] font-black',
                      order.paymentStatus === 'PAID' ? 'bg-success-100 text-success-700' : 'bg-amber-100 text-amber-700',
                    )}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    Rs {Number(order.total).toFixed(0)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Accept (Foodpanda only) */}
                  {order.integration?.type === 'FOODPANDA' && order.orderStatus === 'PENDING' && (
                    <Button
                      size="sm"
                      variant="success"
                      loading={acceptMutation.isPending}
                      onClick={() => acceptMutation.mutate({ intId: order.integrationId, orderId: order.externalOrderId })}
                      leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    >
                      Accept
                    </Button>
                  )}

                  {/* Convert to Sale */}
                  {!order.nafaaSaleId && order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'REJECTED' && (
                    <Button
                      size="sm"
                      variant="gradient"
                      loading={convertMutation.isPending}
                      onClick={() => convertMutation.mutate(order.id)}
                      leftIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      Convert to Sale
                    </Button>
                  )}

                  {order.nafaaSaleId && (
                    <div className="w-full mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="h-3 w-3" />
                          Sale: {order.nafaaSaleId.slice(-8)}
                        </Badge>
                      </div>
                      <OrderStatusTimeline
                        orderId={order.id}
                        currentStatus={order.orderStatus}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getIntegrationEmoji(type: string): string {
  const map: Record<string, string> = {
    CUSTOM_WEBSITE: '🌐',
    FOODPANDA: '🍔',
    DARAZ: '🛒',
    SHOPIFY: '🛍️',
    TCS_COURIER: '📦',
    LEOPARDS_COURIER: '🚚',
  };
  return map[type] ?? '🔌';
}
