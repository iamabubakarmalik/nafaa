import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ShoppingBag, Store, ArrowRight, Bike, AlertTriangle, Trash2 } from 'lucide-react';
import { useCart, useClearShopCart } from '../hooks/useCart';
import { CartLineRow } from '../components/CartLineRow';
import { Button, Card, Badge, EmptyState } from '@/ui';
import { formatPrice, formatDuration } from '@/lib/format';
import { cn } from '@/lib/cn';

export default function CartPage() {
  const navigate = useNavigate();
  const { data: cart, isLoading } = useCart();
  const clearShop = useClearShopCart();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="skeleton h-8 w-40" />
        <div className="skeleton h-96 rounded-3xl" />
      </div>
    );
  }

  if (!cart || cart.shopGroups.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Discover amazing products from shops near you"
          action={
            <Button variant="gradient" size="lg" onClick={() => navigate('/')}>
              Start shopping
            </Button>
          }
        />
      </div>
    );
  }

  const isMultiShop = cart.shopGroups.length > 1;
  const anyBlocked = cart.shopGroups.some((g) => !g.meetsMinOrder);

  return (
    <>
      <Helmet><title>Cart ({cart.totalItems}) — Nafaa Bazaar</title></Helmet>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
        {/* LEFT: Cart items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-black text-content flex items-center gap-2">
              <ShoppingBag className="h-7 w-7 text-brand-600" />
              Cart
              <Badge variant="brand" size="lg">{cart.totalItems} items</Badge>
            </h1>
          </div>

          {isMultiShop && (
            <Card className="p-3 bg-info/10 border-info/30 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <div className="text-xs text-content">
                <strong>Multi-shop order:</strong> Items from {cart.shopGroups.length} shops will be delivered separately, each with its own delivery fee.
              </div>
            </Card>
          )}

          {cart.shopGroups.map((group) => (
            <Card key={group.shopId} className="overflow-hidden">
              {/* Shop header */}
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-surface-muted/50">
                <Link to={`/shops/${group.shop?.slug || group.shopId}`} className="flex items-center gap-3 min-w-0 flex-1">
                  {group.shop?.logoUrl ? (
                    <img src={group.shop.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-black shrink-0">
                      <Store className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-black text-content text-sm md:text-base truncate">
                      {group.shop?.publicName || 'Shop'}
                    </div>
                    <div className="text-2xs text-content-muted flex items-center gap-2">
                      <span>{group.itemCount} items</span>
                      {group.shop?.estimatedDeliveryMinutes && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Bike className="h-3 w-3" />
                            {formatDuration(group.shop.estimatedDeliveryMinutes)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => clearShop.mutate(group.shopId)}
                  className="text-xs font-bold text-danger hover:underline flex items-center gap-1 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>

              {/* Lines */}
              <div className="px-5 divide-y divide-border">
                {group.lines.map((line) => <CartLineRow key={line.id} line={line} />)}
              </div>

              {/* Shop subtotal */}
              <div className="px-5 py-4 border-t border-border bg-surface-muted/30 space-y-2">
                {!group.meetsMinOrder && (
                  <div className="flex items-center gap-2 text-xs text-danger font-bold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Add {formatPrice(group.minOrderAmount - group.subtotal)} more to meet min order
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-content-muted">Subtotal</span>
                  <span className="font-bold">{formatPrice(group.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-content-muted">Delivery fee</span>
                  <span className="font-bold">{group.deliveryFee === 0 ? 'FREE' : formatPrice(group.deliveryFee)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-black pt-2 border-t border-border">
                  <span>Shop total</span>
                  <span className="text-brand-600">{formatPrice(group.shopTotal)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* RIGHT: Order summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-lg">Order summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-content-muted">Items ({cart.totalItems})</span>
                <span className="font-bold">{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-muted">Delivery ({cart.shopGroups.length} shop{cart.shopGroups.length > 1 ? 's' : ''})</span>
                <span className="font-bold">{formatPrice(cart.totalDeliveryFee)}</span>
              </div>
              <div className="flex justify-between text-lg font-black pt-3 border-t border-border">
                <span>Total</span>
                <span className="gradient-text">{formatPrice(cart.grandTotal)}</span>
              </div>
            </div>

            <Button
              variant="gradient"
              size="lg"
              fullWidth
              disabled={anyBlocked}
              rightIcon={<ArrowRight className="h-5 w-5" />}
              onClick={() => navigate('/checkout')}
            >
              {anyBlocked ? 'Fix minimum order first' : 'Proceed to checkout'}
            </Button>

            <div className="pt-3 border-t border-border text-2xs text-content-muted space-y-1">
              <div>🔒 Secure checkout</div>
              <div>🚚 Fast delivery from local shops</div>
              <div>💬 Bargain-enabled items save more</div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
