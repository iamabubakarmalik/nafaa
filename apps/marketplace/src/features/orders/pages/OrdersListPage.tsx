import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  Package, Search, ShoppingBag, Clock, CheckCircle2,
  XCircle, Truck, Star, ChevronRight, RefreshCw,
} from 'lucide-react';
import { ordersApi } from '../api/orders.api';
import { Button, Card, Input, Badge, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { OrderStatus } from '@/types';

const STATUS_TABS: Array<{ key: string; label: string; statuses?: OrderStatus[]; icon: any; color: string }> = [
  { key: 'all', label: 'All', icon: Package, color: 'text-content' },
  { key: 'active', label: 'Active', statuses: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'], icon: Clock, color: 'text-info' },
  { key: 'delivered', label: 'Delivered', statuses: ['DELIVERED'], icon: CheckCircle2, color: 'text-brand-600' },
  { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED', 'REFUNDED'], icon: XCircle, color: 'text-danger' },
];

const STATUS_STYLES: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  DRAFT:              { label: 'Draft',           color: 'bg-slate-100 text-slate-700', icon: Package },
  PENDING:            { label: 'Pending',         color: 'bg-amber-100 text-amber-800',  icon: Clock },
  CONFIRMED:          { label: 'Confirmed',       color: 'bg-blue-100 text-blue-800',    icon: CheckCircle2 },
  PREPARING:          { label: 'Preparing',       color: 'bg-purple-100 text-purple-800', icon: Package },
  READY_FOR_PICKUP:   { label: 'Ready for pickup', color: 'bg-teal-100 text-teal-800',   icon: Package },
  OUT_FOR_DELIVERY:   { label: 'Out for delivery', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  DELIVERED:          { label: 'Delivered',       color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  CANCELLED:          { label: 'Cancelled',       color: 'bg-rose-100 text-rose-800',    icon: XCircle },
  REFUNDED:           { label: 'Refunded',        color: 'bg-slate-100 text-slate-700',  icon: RefreshCw },
  DISPUTED:           { label: 'Disputed',        color: 'bg-orange-100 text-orange-800', icon: XCircle },
  RETURNED:           { label: 'Returned',        color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
};

export default function OrdersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const activeTab = searchParams.get('tab') || 'all';

  const currentTab = STATUS_TABS.find((t) => t.key === activeTab)!;

  const { data, isLoading } = useQuery({
    queryKey: ['orders', activeTab, search],
    queryFn: () => ordersApi.list({
      status: currentTab.statuses,
      search: search || undefined,
      limit: 50,
    }),
    staleTime: 15_000,
  });

  return (
    <>
      <Helmet><title>My Orders — Nafaa Bazaar</title></Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-content flex items-center gap-2">
            <Package className="h-7 w-7 text-brand-600" />
            My Orders
          </h1>
          <p className="text-sm text-content-muted mt-0.5">
            Track and manage your orders
          </p>
        </div>

        {/* Search */}
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search by order number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Status tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            const count = tab.key === 'all'
              ? data?.counts?.all
              : tab.key === 'active'
                ? data?.counts?.active
                : tab.key === 'delivered'
                  ? data?.counts?.delivered
                  : (data?.counts?.cancelled ?? 0) + (data?.counts?.refunded ?? 0);
            return (
              <button
                key={tab.key}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set('tab', tab.key);
                  setSearchParams(next);
                }}
                className={cn(
                  'shrink-0 flex items-center gap-2 h-10 px-4 rounded-full text-sm font-bold transition border-2',
                  isActive
                    ? 'bg-brand-600 text-white border-brand-600 shadow-brand'
                    : 'bg-surface text-content-muted border-border hover:border-brand-300',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {count != null && count > 0 && (
                  <span className={cn(
                    'text-2xs rounded-full px-2 py-0.5 font-black',
                    isActive ? 'bg-white/20' : 'bg-surface-muted',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Orders list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-3xl" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={ShoppingBag}
            title={activeTab === 'all' ? 'No orders yet' : `No ${currentTab.label.toLowerCase()} orders`}
            description={activeTab === 'all' ? 'Start shopping to see your orders here' : 'Try a different filter'}
            action={activeTab === 'all' ? (
              <Link to="/"><Button variant="gradient">Browse shops</Button></Link>
            ) : null}
          />
        ) : (
          <div className="space-y-3">
            {data.items.map((order) => {
              const status = STATUS_STYLES[order.status];
              const StatusIcon = status.icon;
              const shopProfile = (order as any).shop?.marketplaceProfile;
              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block group"
                >
                  <Card className="p-4 md:p-5 hover:shadow-soft-lg transition-all hover:border-brand-300">
                    {/* Top row: shop + status */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {shopProfile?.logoUrl ? (
                          <img src={shopProfile.logoUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
                        ) : (
                          <div className="h-11 w-11 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-black shrink-0">
                            {shopProfile?.publicName?.[0] || 'S'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-black text-content text-sm md:text-base truncate">
                            {shopProfile?.publicName || 'Shop'}
                          </div>
                          <div className="text-2xs text-content-muted flex items-center gap-1.5">
                            <span className="font-bold">#{order.orderNumber}</span>
                            <span>·</span>
                            <span>{timeAgo(order.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-2xs font-black shrink-0',
                        status.color,
                      )}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>

                    {/* Items preview */}
                    <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
                      {order.items?.slice(0, 4).map((item: any, i: number) => (
                        <div key={i} className="h-14 w-14 rounded-xl bg-surface-muted overflow-hidden shrink-0 relative">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-content-subtle" />
                            </div>
                          )}
                          {item.quantity > 1 && (
                            <div className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-brand-600 text-white text-2xs font-black flex items-center justify-center ring-2 ring-surface">
                              {item.quantity}
                            </div>
                          )}
                        </div>
                      ))}
                      {(order.totalItems ?? order.items?.length ?? 0) > 4 && (
                        <div className="h-14 w-14 rounded-xl bg-surface-muted flex items-center justify-center text-xs font-black text-content-muted shrink-0">
                          +{(order.totalItems ?? order.items?.length) - 4}
                        </div>
                      )}
                    </div>

                    {/* Bottom row: total + actions */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
                      <div>
                        <div className="text-2xs text-content-muted font-semibold">Total</div>
                        <div className="font-black text-brand-600 dark:text-brand-400 text-base">
                          {formatPrice(order.total)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.canRate && (
                          <Badge variant="accent" size="md">
                            <Star className="h-3 w-3" />
                            Rate now
                          </Badge>
                        )}
                        {order.isActive && (
                          <Badge variant="info" size="md">Live tracking</Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-content-subtle group-hover:text-brand-600 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
