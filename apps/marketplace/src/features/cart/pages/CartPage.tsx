import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Heart, AlertCircle, Store } from 'lucide-react';
import { cartApi } from '../api/cart.api';
import { Button } from '@shared/ui/Button';
import { EmptyState } from '@shared/ui/EmptyState';
import { SkeletonCard } from '@shared/ui/Skeleton';
import { Badge } from '@shared/ui/Badge';

export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: cart, isLoading } = useQuery({
    queryKey: ['market-cart'],
    queryFn: cartApi.get,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['market-cart'] });

  const updateMutation = useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      cartApi.updateLine(lineId, { quantity }),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (lineId: string) => cartApi.removeLine(lineId),
    onSuccess: () => { invalidate(); toast.success('Item hata diya'); },
  });

  const moveWishMutation = useMutation({
    mutationFn: (lineId: string) => cartApi.moveToWishlist(lineId),
    onSuccess: () => { invalidate(); toast.success('Wishlist mein add ho gaya ❤️'); },
  });

  const clearMutation = useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: () => { invalidate(); toast.success('Cart clear ho gaya'); },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!cart?.shopGroups?.length) {
    return (
      <EmptyState
        emoji="🛒"
        title="Cart khaali hai"
        description="Kuch products add karein aur khareedari shuru karein"
        size="lg"
        action={
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>
            Shopping Start Karein
          </Button>
        }
      />
    );
  }

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-brand-600" />
            Cart
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {cart.totalItems} items · {cart.shopGroups.length} shops
          </p>
        </div>
        <button
          onClick={() => confirm('Poora cart clear karna hai?') && clearMutation.mutate()}
          className="text-xs font-extrabold text-rose-600 hover:text-rose-700 flex items-center gap-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear All
        </button>
      </div>

      {/* Shop Groups */}
      <div className="space-y-4">
        {cart.shopGroups.map((group: any) => (
          <div
            key={group.shopId}
            className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 overflow-hidden shadow-soft"
          >
            {/* Shop Header */}
            <div className="p-3 bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-950/30 dark:to-emerald-950/30 border-b border-slate-100 dark:border-neutral-800 flex items-center gap-3">
              {group.shop?.logoUrl ? (
                <img src={group.shop.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                  <Store className="h-5 w-5 text-brand-700 dark:text-brand-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  {group.shop?.publicName || 'Shop'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {group.itemCount} items · {group.shop?.estimatedDeliveryMinutes ? `${group.shop.estimatedDeliveryMinutes} min delivery` : ''}
                </div>
              </div>
              {group.shop?.isOpen === false && (
                <Badge variant="danger" size="xs">Closed</Badge>
              )}
            </div>

            {/* Lines */}
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {group.lines.map((line: any) => (
                <div key={line.id} className="p-3 flex gap-3">
                  <div className="h-20 w-20 rounded-xl bg-slate-100 dark:bg-neutral-800 overflow-hidden shrink-0">
                    {line.imageUrl ? (
                      <img src={line.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2 leading-tight">
                      {line.productName}
                    </div>
                    {line.variantName && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{line.variantName}</div>
                    )}
                    {line.bargainId && (
                      <Badge variant="brand" size="xs" className="mt-1">💰 Bargain Deal</Badge>
                    )}
                    {line.priceChanged && (
                      <Badge variant="warning" size="xs" className="mt-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Price changed
                      </Badge>
                    )}
                    {!line.stillAvailable && (
                      <Badge variant="danger" size="xs" className="mt-1">Out of Stock</Badge>
                    )}
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="font-black text-brand-700 dark:text-brand-400 text-base">
                        Rs {Number(line.unitPrice).toFixed(0)}
                      </span>
                      {line.compareAtPrice && (
                        <span className="text-[10px] text-slate-400 line-through">
                          Rs {Number(line.compareAtPrice).toFixed(0)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center border-2 border-slate-200 dark:border-neutral-700 rounded-full">
                        <button
                          onClick={() => updateMutation.mutate({ lineId: line.id, quantity: line.quantity - 1 })}
                          className="h-7 w-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-l-full transition"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center font-black text-sm tabular-nums">{line.quantity}</span>
                        <button
                          onClick={() => updateMutation.mutate({ lineId: line.id, quantity: line.quantity + 1 })}
                          className="h-7 w-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-r-full transition"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => moveWishMutation.mutate(line.id)}
                        className="h-7 w-7 rounded-full bg-slate-100 dark:bg-neutral-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center justify-center transition group"
                        title="Wishlist"
                      >
                        <Heart className="h-3.5 w-3.5 text-slate-500 group-hover:text-rose-500" />
                      </button>
                      <button
                        onClick={() => removeMutation.mutate(line.id)}
                        className="h-7 w-7 rounded-full bg-slate-100 dark:bg-neutral-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center justify-center transition group ml-auto"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-slate-500 group-hover:text-rose-500" />
                      </button>
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                          Rs {Number(line.lineTotal).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Shop Footer */}
            <div className="p-3 bg-slate-50 dark:bg-neutral-900/50 border-t border-slate-100 dark:border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                <span className="font-extrabold text-slate-900 dark:text-white">Rs {group.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Delivery</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {group.deliveryFee > 0 ? `Rs ${group.deliveryFee.toFixed(0)}` : 'FREE'}
                </span>
              </div>
              {!group.meetsMinOrder && (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Min order Rs {group.minOrderAmount} — abhi Rs {(group.minOrderAmount - group.subtotal).toFixed(0)} kam
                </div>
              )}
              <div className="pt-1 border-t border-slate-200 dark:border-neutral-700 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Shop Total</span>
                <span className="text-base font-black text-brand-700 dark:text-brand-400">Rs {group.shopTotal.toFixed(0)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Checkout Bar */}
      <div className="fixed bottom-20 inset-x-0 z-30 bg-white dark:bg-neutral-950 border-t-2 border-slate-100 dark:border-neutral-800 shadow-soft-xl">
        <div className="max-w-6xl mx-auto p-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Grand Total</div>
            <div className="text-2xl font-black bg-gradient-to-r from-brand-600 to-emerald-700 bg-clip-text text-transparent">
              Rs {cart.grandTotal.toFixed(0)}
            </div>
          </div>
          <Button
            variant="gradient"
            size="lg"
            onClick={() => navigate('/checkout')}
            rightIcon={<ArrowRight className="h-5 w-5" />}
          >
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
