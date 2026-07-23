import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { Package, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { ordersApi } from '../api/orders.api';
import { EmptyState } from '@shared/ui/EmptyState';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { Tabs, TabsList, TabsTrigger } from '@shared/ui/Tabs';
import { Badge } from '@shared/ui/Badge';
import { cn } from '@lib/cn';

const STATUS_CONFIG: Record<string, { label: string; color: any; icon: any; emoji: string }> = {
  PENDING:          { label: 'Pending',        color: 'warning', icon: Clock,       emoji: '⏳' },
  CONFIRMED:        { label: 'Confirmed',      color: 'info',    icon: CheckCircle2, emoji: '✅' },
  PREPARING:        { label: 'Preparing',      color: 'accent',  icon: Package,     emoji: '👨‍🍳' },
  READY_FOR_PICKUP: { label: 'Ready',          color: 'brand',   icon: Package,     emoji: '📦' },
  OUT_FOR_DELIVERY: { label: 'On the Way',     color: 'brand',   icon: Package,     emoji: '🛵' },
  DELIVERED:        { label: 'Delivered',      color: 'success', icon: CheckCircle2, emoji: '🎉' },
  CANCELLED:        { label: 'Cancelled',      color: 'danger',  icon: XCircle,     emoji: '❌' },
  REFUNDED:         { label: 'Refunded',       color: 'danger',  icon: XCircle,     emoji: '💰' },
};

export default function OrdersListPage() {
  const [tab, setTab] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  const statusFilter =
    tab === 'active'    ? ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] :
    tab === 'delivered' ? ['DELIVERED'] :
    tab === 'cancelled' ? ['CANCELLED', 'REFUNDED'] :
    undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['market-orders', tab],
    queryFn: () => ordersApi.list({ status: statusFilter, limit: 50 }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Package className="h-6 w-6 text-brand-600" />
          My Orders
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Total: {data?.counts?.all || 0}</p>
      </div>

      <Tabs value={tab} onChange={(v) => setTab(v as any)}>
        <TabsList variant="pills" className="overflow-x-auto no-scrollbar">
          <TabsTrigger value="all" variant="pills">All ({data?.counts?.all || 0})</TabsTrigger>
          <TabsTrigger value="active" variant="pills">Active ({data?.counts?.active || 0})</TabsTrigger>
          <TabsTrigger value="delivered" variant="pills">Delivered ({data?.counts?.delivered || 0})</TabsTrigger>
          <TabsTrigger value="cancelled" variant="pills">Cancelled ({data?.counts?.cancelled || 0})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !data?.items?.length ? (
        <EmptyState emoji="📭" title="Koi order nahi" description="Kuch mangwate hain?" size="md" />
      ) : (
        <div className="space-y-3">
          {data.items.map((order: any) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const Icon = cfg.icon;
            return (
              <NavLink
                key={order.id}
                to={`/market/orders/${order.id}`}
                className="block rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all overflow-hidden"
              >
                <div className="p-4 flex items-center gap-3">
                  <div className={cn(
                    'h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0',
                    order.status === 'DELIVERED' ? 'bg-success-100 dark:bg-success-900/30' :
                    order.status === 'CANCELLED' ? 'bg-rose-100 dark:bg-rose-900/30' :
                    'bg-brand-100 dark:bg-brand-900/30',
                  )}>
                    {cfg.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                        {order.shop?.marketplaceProfile?.publicName || 'Shop'}
                      </span>
                      <Badge variant={cfg.color} size="xs">{cfg.label}</Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      #{order.orderNumber} · {order.totalItems} items · {new Date(order.createdAt).toLocaleDateString('en-PK')}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        Rs {Number(order.total).toFixed(0)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">
                        {order.paymentMethod}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
