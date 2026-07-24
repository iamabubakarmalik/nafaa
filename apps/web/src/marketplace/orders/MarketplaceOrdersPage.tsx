import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ShoppingCart, Search, Clock, CheckCircle2, ChefHat, Package, Bike,
  PackageCheck, XCircle, Filter, ChevronLeft, ChevronRight, X,
  Phone, MessageCircle, User, MapPin, CreditCard, ArrowRight, Sparkles,
} from 'lucide-react';
import { ordersApi, type ListMktOrdersParams } from '../shared/marketplace.api';
import { ORDER_STATUS_META, PAYMENT_STATUS_META, relativeTime } from '../shared/status-utils';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import type { MarketplaceOrderStatus } from '../shared/types';

const STATUS_TABS: { label: string; statuses: MarketplaceOrderStatus[]; color: string }[] = [
  { label: 'All',              statuses: [],                                         color: 'slate' },
  { label: 'New',              statuses: ['PENDING'],                                color: 'amber' },
  { label: 'Confirmed',        statuses: ['CONFIRMED'],                              color: 'blue' },
  { label: 'Preparing',        statuses: ['PREPARING'],                              color: 'violet' },
  { label: 'Ready / Out',      statuses: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'],   color: 'orange' },
  { label: 'Delivered',        statuses: ['DELIVERED'],                              color: 'emerald' },
  { label: 'Cancelled',        statuses: ['CANCELLED', 'REFUNDED'],                  color: 'rose' },
];

export default function MarketplaceOrdersPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);

  const [params, setParams] = useState<ListMktOrdersParams>({
    search: '',
    page: 1,
    limit: 20,
  });
  const [activeTab, setActiveTab] = useState(0);

  const effectiveParams = useMemo<ListMktOrdersParams>(() => ({
    ...params,
    status: STATUS_TABS[activeTab].statuses.length ? STATUS_TABS[activeTab].statuses : undefined,
  }), [params, activeTab]);

  const { data } = useQuery({
    queryKey: ['marketplace-orders', effectiveParams],
    queryFn: () => ordersApi.list(effectiveParams),
    refetchInterval: 15_000, // auto refresh every 15s for new orders
  });

  const acceptMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.accept(orderId),
    onSuccess: () => {
      toast.success('Order confirm ho gaya ✅');
      qc.invalidateQueries({ queryKey: ['marketplace-orders'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) => ordersApi.reject(orderId, reason),
    onSuccess: () => {
      toast.success('Order reject ho gayi');
      qc.invalidateQueries({ queryKey: ['marketplace-orders'] });
    },
  });

  const items = data?.items || [];
  const counts = data?.counts || {};

  const totalPending = counts.PENDING || 0;

  return (
    <div className="space-y-5 pb-10">
      {/* HERO */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
              <ShoppingCart className="h-3.5 w-3.5" />
              Customer Orders
              {totalPending > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] animate-pulse">
                  {totalPending} NEW
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black leading-tight">Incoming Orders</h1>
            <p className="mt-2 text-sm text-white/85 font-medium">
              Marketplace se aane wali orders — accept karke prepare karein
            </p>
          </div>
        </div>

        {/* Status KPIs */}
        <div className="relative grid grid-cols-3 md:grid-cols-6 gap-2 mt-6">
          {(['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as MarketplaceOrderStatus[]).map((status) => {
            const meta = ORDER_STATUS_META[status];
            const StatusIcon = meta.icon;
            const count = counts[status] || 0;
            return (
              <div key={status} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <StatusIcon className="h-3 w-3 opacity-80" />
                  <div className="text-[9px] uppercase tracking-wider font-black opacity-90 truncate">
                    {status.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="text-xl font-black tabular-nums">{count}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Status Tabs */}
      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-2 flex gap-1 overflow-x-auto">
        {STATUS_TABS.map((tab, idx) => {
          const isActive = activeTab === idx;
          const tabCount = tab.statuses.length === 0
            ? Object.values(counts).reduce((a, b) => a + b, 0)
            : tab.statuses.reduce((sum, s) => sum + (counts[s] || 0), 0);
          return (
            <button
              key={idx}
              onClick={() => { setActiveTab(idx); setParams({ ...params, page: 1 }); }}
              className={`px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 whitespace-nowrap transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {tabCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex gap-2 items-center">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold outline-none focus:border-emerald-500"
            placeholder="Search by order number or customer..."
            value={params.search ?? ''}
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
          {params.search && (
            <button
              onClick={() => setParams({ ...params, search: '', page: 1 })}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* Orders */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-900">No orders in this category</h3>
          <p className="text-sm text-slate-500 mt-1">Naye orders yahan appear honge</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAccept={() => acceptMutation.mutate(order.id)}
              onReject={() => {
                const reason = prompt('Reject reason:');
                if (reason) rejectMutation.mutate({ orderId: order.id, reason });
              }}
              isPending={acceptMutation.isPending || rejectMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="text-sm text-slate-600 font-bold">
            Page <span className="text-slate-900">{data.meta.page}</span> of{' '}
            <span className="text-slate-900">{data.meta.totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
              className="h-9 px-3 rounded-lg border-2 border-slate-200 text-xs font-black disabled:opacity-40 hover:bg-slate-50 inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              disabled={(params.page ?? 1) >= data.meta.totalPages}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
              className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-black disabled:opacity-40 inline-flex items-center gap-1"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onAccept, onReject, isPending }: any) {
  const meta = ORDER_STATUS_META[order.status as keyof typeof ORDER_STATUS_META];
  const StatusIcon = meta.icon;
  const payMeta = PAYMENT_STATUS_META[order.paymentStatus as keyof typeof PAYMENT_STATUS_META];
  const isNewOrder = order.status === 'PENDING';

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm overflow-hidden transition-all ${
      isNewOrder ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Header */}
      <div className={`px-5 py-3 flex items-center gap-3 flex-wrap ${meta.bg} border-b-2 ${meta.border}`}>
        <div className={`h-10 w-10 rounded-xl ${meta.color.replace('text-', 'bg-')} bg-opacity-20 flex items-center justify-center`}>
          <StatusIcon className={`h-5 w-5 ${meta.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-900">#{order.orderNumber}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${meta.color}`}>
              {meta.label}
            </span>
            {isNewOrder && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                NEW
              </span>
            )}
          </div>
          <div className="text-xs text-slate-600 font-medium mt-0.5">
            {relativeTime(order.createdAt)} · {order.deliveryType === 'DELIVERY' ? '🚚 Home Delivery' : order.deliveryType === 'PICKUP' ? '📦 Pickup' : '🍽️ Dine-in'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-black text-lg text-emerald-700 tabular-nums">Rs {formatPKR(order.total)}</div>
          <div className={`text-[10px] font-black px-1.5 py-0.5 rounded ${payMeta.bg} ${payMeta.color}`}>
            {order.paymentMethod} · {payMeta.label}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 grid md:grid-cols-[1fr_240px] gap-4">
        {/* Left: Customer + items */}
        <div className="space-y-3">
          {/* Customer */}
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="font-black">{order.customer?.fullName || 'Customer'}</span>
            {order.customer?.phone && (
              <a
                href={`tel:${order.customer.phone}`}
                className="ml-auto inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-xs font-black"
              >
                <Phone className="h-3 w-3" />
                {order.customer.phone}
              </a>
            )}
          </div>

          {/* Address */}
          {order.addressSnapshot && (
            <div className="flex items-start gap-2 text-xs text-slate-600 font-medium bg-slate-50 rounded-lg p-2.5">
              <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                {order.addressSnapshot.addressLine1 || order.addressSnapshot.address || 'Address'}
                {order.addressSnapshot.city && `, ${order.addressSnapshot.city}`}
              </div>
            </div>
          )}

          {/* Items preview */}
          {order.items && order.items.length > 0 && (
            <div className="space-y-1.5">
              {order.items.slice(0, 3).map((item: any, idx: number) => (
                <div key={item.id || idx} className="flex items-center gap-2 text-xs">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 truncate">{item.productName}</div>
                    {item.variantName && <div className="text-[10px] text-slate-500 font-medium">{item.variantName}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black tabular-nums">×{item.quantity}</div>
                    <div className="text-[10px] text-slate-500 font-bold">Rs {formatPKR(item.total)}</div>
                  </div>
                </div>
              ))}
              {order.items.length > 3 && (
                <div className="text-[10px] text-slate-500 font-bold text-center pt-1">
                  +{order.items.length - 3} more items
                </div>
              )}
            </div>
          )}

          {/* Customer notes */}
          {order.customerNotes && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs font-medium text-amber-800">
              <strong className="font-black">Note:</strong> {order.customerNotes}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-2">
          {isNewOrder ? (
            <>
              <Button
                onClick={onAccept}
                loading={isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow"
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept Order
              </Button>
              <Button
                variant="secondary"
                onClick={onReject}
                disabled={isPending}
                className="w-full bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          ) : (
            <Link
              to={`/marketplace/orders/${order.id}`}
              className="flex items-center justify-center gap-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition"
            >
              View Details <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {order.customer?.phone && (
            <a
              href={`https://wa.me/${order.customer.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-1 h-9 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-black border-2 border-green-200 transition"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
