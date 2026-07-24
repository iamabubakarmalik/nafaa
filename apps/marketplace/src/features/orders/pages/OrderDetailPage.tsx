import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState } from 'react';
import {
  ArrowLeft, Package, MapPin, Phone, MessageCircle, Store, AlertTriangle,
  Clock, CreditCard, Copy, RefreshCw, XCircle, Star, ChevronRight,
} from 'lucide-react';
import { ordersApi } from '../api/orders.api';
import { OrderTimeline } from '../components/OrderTimeline';
import { RiderTrackingMap } from '../components/RiderTrackingMap';
import { CancelOrderModal } from '../components/CancelOrderModal';
import { RateOrderModal } from '../components/RateOrderModal';
import { CreateDisputeModal } from '../components/CreateDisputeModal';
import { Button, Card, Badge, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { useSocketEvent, useJoinRoom } from '@/lib/useSocket';
import { toast } from 'sonner';

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  useJoinRoom('order', orderId);
  useSocketEvent('order:update', () => {
    qc.invalidateQueries({ queryKey: ['order', orderId] });
    qc.invalidateQueries({ queryKey: ['order-track', orderId] });
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.detail(orderId!),
    enabled: !!orderId,
  });

  const { data: tracking } = useQuery({
    queryKey: ['order-track', orderId],
    queryFn: () => ordersApi.track(orderId!),
    enabled: !!orderId && !!order?.isActive,
    refetchInterval: (query) => (query.state.data?.isActive ? 10_000 : false),
  });

  const reorderMutation = useMutation({
    mutationFn: () => ordersApi.reorder(orderId!),
    onSuccess: (r) => {
      toast.success(r.message);
      if (r.addedCount > 0) navigate('/cart');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <div className="skeleton h-96 rounded-3xl" />;
  if (!order) {
    return <EmptyState icon={Package} title="Order not found" description="This order doesn't exist." />;
  }

  const shopProfile = (order as any).shop?.marketplaceProfile;
  const address = (order.addressSnapshot as any) || null;

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    toast.success('Order number copied!');
  };

  return (
    <>
      <Helmet><title>Order #{order.orderNumber} — Nafaa Bazaar</title></Helmet>

      <div className="max-w-4xl mx-auto space-y-5">
        {/* Back link */}
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          All orders
        </button>

        {/* Header */}
        <Card className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black">Order #{order.orderNumber}</h1>
                <button onClick={copyOrderNumber} className="text-content-subtle hover:text-brand-600">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm text-content-muted mt-1">
                Placed {timeAgo(order.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {order.canCancel && (
                <Button variant="outline" size="sm" onClick={() => setShowCancel(true)} leftIcon={<XCircle className="h-4 w-4" />}>
                  Cancel
                </Button>
              )}
              {order.canReorder && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => reorderMutation.mutate()}
                  loading={reorderMutation.isPending}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Reorder
                </Button>
              )}
              {order.status === 'DELIVERED' && (
                <Button variant="outline" size="sm" onClick={() => setShowDispute(true)} leftIcon={<AlertTriangle className="h-4 w-4" />}>
                  Report issue
                </Button>
              )}
              {order.canRate && (
                <Button variant="gradient" size="sm" onClick={() => setShowRate(true)} leftIcon={<Star className="h-4 w-4" />}>
                  Rate order
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Shop card */}
        {shopProfile && (
          <Link to={`/shops/${shopProfile.slug || order.shopId}`}>
            <Card className="p-4 hover:shadow-soft-lg transition">
              <div className="flex items-center gap-3">
                {shopProfile.logoUrl ? (
                  <img src={shopProfile.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-black">
                    <Store className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-black text-content">{shopProfile.publicName}</div>
                  <div className="text-2xs text-content-muted">{shopProfile.city}</div>
                </div>
                <ChevronRight className="h-5 w-5 text-content-subtle" />
              </div>
            </Card>
          </Link>
        )}

        {/* Timeline (only for active orders) */}
        {order.isActive && tracking && (
          <Card className="p-5">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-brand-600" />
              Order tracking
            </h3>
            <OrderTimeline timeline={tracking.timeline} />

            {order.riderName && order.status === 'OUT_FOR_DELIVERY' && (
              <div className="mt-4 p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800">
                <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-1">
                  Your rider
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-content">{order.riderName}</div>
                    {order.riderPhone && (
                      <a href={`tel:${order.riderPhone}`} className="text-xs text-brand-600 font-bold">
                        {order.riderPhone}
                      </a>
                    )}
                  </div>
                  {order.riderPhone && (
                    <div className="flex gap-2">
                      <a
                        href={`tel:${order.riderPhone}`}
                        className="h-9 w-9 rounded-full bg-brand-600 text-white flex items-center justify-center"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <a
                        href={`https://wa.me/${order.riderPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Items */}
        <Card className="p-5">
          <h3 className="font-black text-lg mb-4">Items ({order.items.length})</h3>
          <div className="divide-y divide-border">
            {order.items.map((item) => (
              <Link
                key={item.id}
                to={`/products/${item.productId}`}
                className="flex gap-3 py-3 first:pt-0 last:pb-0 group"
              >
                <div className="h-16 w-16 rounded-xl bg-surface-muted overflow-hidden shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-content-subtle" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-content text-sm line-clamp-1 group-hover:text-brand-600 transition">
                    {item.productName}
                  </div>
                  {item.variantName && (
                    <div className="text-2xs text-content-muted">{item.variantName}</div>
                  )}
                  <div className="text-2xs text-content-muted mt-0.5">
                    {formatPrice(item.unitPrice)} × {item.quantity}
                  </div>
                </div>
                <div className="font-black text-content text-sm shrink-0">
                  {formatPrice(item.total)}
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Address + Payment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {address && (
            <Card className="p-5">
              <h3 className="font-black text-sm flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-brand-600" />
                Delivery address
              </h3>
              <div className="text-sm space-y-1">
                <div className="font-bold">{address.fullName}</div>
                <div className="text-content-muted">{address.phone}</div>
                <div className="text-content-muted">
                  {address.addressLine1}
                  {address.addressLine2 && `, ${address.addressLine2}`}
                </div>
                <div className="text-content-muted">
                  {address.area}, {address.city}
                </div>
                {address.deliveryNotes && (
                  <div className="text-2xs text-content-subtle italic mt-2">
                    Note: {address.deliveryNotes}
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-black text-sm flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-brand-600" />
              Payment
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-content-muted">Method</span>
                <span className="font-bold">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-muted">Status</span>
                <Badge variant={order.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                  {order.paymentStatus}
                </Badge>
              </div>
              {order.paidAt && (
                <div className="flex justify-between text-2xs text-content-muted">
                  <span>Paid</span>
                  <span>{timeAgo(order.paidAt)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Bill breakdown */}
        <Card className="p-5">
          <h3 className="font-black text-sm mb-3">Bill details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-content-muted">Subtotal</span>
              <span className="font-bold">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-muted">Delivery fee</span>
              <span className="font-bold">{formatPrice(order.deliveryFee)}</span>
            </div>
            {order.tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-content-muted">Rider tip</span>
                <span className="font-bold">{formatPrice(order.tipAmount)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-brand-600">
                <span>Discount</span>
                <span className="font-bold">−{formatPrice(order.discount)}</span>
              </div>
            )}
            {order.loyaltyDiscount > 0 && (
              <div className="flex justify-between text-accent-600">
                <span>Loyalty points</span>
                <span className="font-bold">−{formatPrice(order.loyaltyDiscount)}</span>
              </div>
            )}
            {order.walletUsed > 0 && (
              <div className="flex justify-between text-brand-600">
                <span>Wallet used</span>
                <span className="font-bold">−{formatPrice(order.walletUsed)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-3 border-t border-border">
              <span className="font-black">Total paid</span>
              <span className="text-xl font-black gradient-text">{formatPrice(order.total)}</span>
            </div>
          </div>
        </Card>

        {order.customerNotes && (
          <Card className="p-5">
            <h3 className="font-black text-sm mb-2">Delivery instructions</h3>
            <p className="text-sm text-content-muted italic">{order.customerNotes}</p>
          </Card>
        )}
      </div>

      {showCancel && (
        <CancelOrderModal
          orderId={order.id}
          onClose={() => setShowCancel(false)}
          onSuccess={() => setShowCancel(false)}
        />
      )}
      {showDispute && (
        <CreateDisputeModal
          orderId={order.id}
          orderNumber={order.orderNumber}
          items={order.items}
          onClose={() => setShowDispute(false)}
        />
      )}
      {showRate && (
        <RateOrderModal orderId={order.id} onClose={() => setShowRate(false)} />
      )}
    </>
  );
}
