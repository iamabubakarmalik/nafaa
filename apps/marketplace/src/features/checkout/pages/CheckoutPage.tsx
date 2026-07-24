import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import {
  MapPin, CreditCard, Clock, Gift, Wallet, Tag,
  ArrowLeft, Lock, Info, AlertCircle, ShoppingBag, Sparkles,
} from 'lucide-react';
import { checkoutApi, PreviewCheckoutParams } from '../api/checkout.api';
import { paymentApi } from '../api/payment.api';
import { AddressSelector } from '../components/AddressSelector';
import { PaymentSelector } from '../components/PaymentSelector';
import { DeliverySlotSelector } from '../components/DeliverySlotSelector';
import { profileApi } from '@/features/profile/api/profile.api';
import { useCart } from '@/features/cart/hooks/useCart';
import { Button, Card, Input, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';
import type { CustomerAddress, PaymentMethod } from '@/types';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { data: cart, isLoading: loadingCart } = useCart();

  const [step, setStep] = useState<'address' | 'delivery' | 'payment' | 'review'>('address');
  const [address, setAddress] = useState<CustomerAddress | null>(null);
  const [deliveryType] = useState<'DELIVERY' | 'PICKUP' | 'DINE_IN'>('DELIVERY');
  const [deliverySlotStart, setDeliverySlotStart] = useState('');
  const [deliverySlotEnd, setDeliverySlotEnd] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [customerNotes, setCustomerNotes] = useState('');
  const [tip, setTip] = useState(0);

  // Wallet + loyalty
  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: profileApi.wallet });

  // Real-time preview
  const previewParams: PreviewCheckoutParams = {
    addressId: address?.id,
    deliveryType,
    couponCode: appliedCoupon || undefined,
    walletAmountToUse: useWallet ? walletAmount : 0,
    loyaltyPointsToUse: useLoyalty ? loyaltyPoints : 0,
    paymentMethod,
  };

  const { data: preview, isLoading: loadingPreview } = useQuery({
    queryKey: ['checkout-preview', previewParams],
    queryFn: () => checkoutApi.preview(previewParams),
    enabled: !!address,
    staleTime: 0,
  });

  // Auto-set max wallet/loyalty
  useEffect(() => {
    if (wallet && useWallet && walletAmount === 0) {
      const maxWallet = Math.min(Number(wallet.balance), cart?.grandTotal || 0);
      setWalletAmount(maxWallet);
    }
    if (wallet && useLoyalty && loyaltyPoints === 0) {
      setLoyaltyPoints(wallet.loyaltyPoints);
    }
  }, [wallet, useWallet, useLoyalty]);

  const placeOrderMutation = useMutation({
    mutationFn: () =>
      checkoutApi.placeOrder({
        addressId: address!.id,
        deliveryType,
        paymentMethod,
        couponCode: appliedCoupon || undefined,
        walletAmountToUse: useWallet ? walletAmount : 0,
        loyaltyPointsToUse: useLoyalty ? loyaltyPoints : 0,
        customerNotes: customerNotes || undefined,
        deliverySlotStart: deliverySlotStart || undefined,
        deliverySlotEnd: deliverySlotEnd || undefined,
        tipAmount: tip,
      }),
    onSuccess: async (result) => {
      toast.success(`Order placed! ${result.orders.length} order${result.orders.length > 1 ? 's' : ''} created`, {
        description: `Total: ${formatPrice(result.grandTotal)}`,
      });

      // If online payment, initiate
      if (paymentMethod === 'JAZZCASH' && result.orders[0]) {
        try {
          const jc = await paymentApi.jazzcashInitiate({
            orderId: result.orders[0].id,
            amount: result.orders[0].total,
            paymentType: 'WALLET',
            mobileNumber: address!.phone,
          });
          if (jc.method === 'REDIRECT') {
            // Auto-submit form to gateway
            toast.info('Redirecting to JazzCash...');
          }
        } catch (e: any) {
          toast.error('Payment initiation failed. You can pay from order details.');
        }
      }
      navigate(`/orders/${result.orders[0].id}`);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Failed to place order');
    },
  });

  if (loadingCart) {
    return <div className="skeleton h-96 rounded-3xl" />;
  }

  if (!cart || cart.shopGroups.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <ShoppingBag className="h-16 w-16 text-content-subtle mx-auto mb-4" />
        <h2 className="text-2xl font-black mb-2">Your cart is empty</h2>
        <p className="text-content-muted mb-6">Add items to your cart to checkout</p>
        <Button variant="gradient" onClick={() => navigate('/')}>Browse shops</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Checkout — Nafaa Bazaar</title></Helmet>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-6">
        {/* LEFT: Steps */}
        <div className="space-y-5">
          <button
            onClick={() => navigate('/cart')}
            className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to cart
          </button>

          {/* Step 1: Address */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 flex items-center justify-center">
                <MapPin className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black">Delivery address</h2>
            </div>
            <AddressSelector selectedId={address?.id} onSelect={setAddress} />
          </Card>

          {/* Step 2: Delivery slot */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black">Delivery time</h2>
            </div>
            <DeliverySlotSelector
              selectedStart={deliverySlotStart}
              onSelect={(s, e) => { setDeliverySlotStart(s); setDeliverySlotEnd(e); }}
            />
          </Card>

          {/* Step 3: Payment */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black">Payment method</h2>
            </div>
            <PaymentSelector
              selected={paymentMethod}
              onSelect={setPaymentMethod}
              walletBalance={wallet?.balance}
            />
          </Card>

          {/* Step 4: Savings (coupon, wallet, loyalty) */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-400 flex items-center justify-center">
                <Gift className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black">Save more</h2>
            </div>

            {/* Coupon */}
            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">Promo code</div>
              <div className="flex gap-2">
                <Input
                  leftIcon={<Tag className="h-4 w-4" />}
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                  <Button
                    variant="ghost"
                    onClick={() => { setAppliedCoupon(''); setCouponCode(''); }}
                    className="text-danger"
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => couponCode && setAppliedCoupon(couponCode)}
                    disabled={!couponCode}
                  >
                    Apply
                  </Button>
                )}
              </div>
              {preview?.couponError && (
                <p className="text-2xs text-danger mt-1.5 font-bold">{preview.couponError}</p>
              )}
              {appliedCoupon && preview && preview.couponDiscount > 0 && (
                <p className="text-2xs text-brand-600 dark:text-brand-400 mt-1.5 font-bold">
                  ✓ Saved {formatPrice(preview.couponDiscount)}
                </p>
              )}
            </div>

            {/* Wallet */}
            {wallet && wallet.balance > 0 && (
              <label className="flex items-start gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => {
                    setUseWallet(e.target.checked);
                    if (e.target.checked) setWalletAmount(Math.min(wallet.balance, cart.grandTotal));
                  }}
                  className="h-4 w-4 mt-0.5 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-brand-600" />
                    <span className="font-black text-sm">Use Nafaa Wallet</span>
                  </div>
                  <div className="text-2xs text-content-muted mt-0.5">
                    Balance: {formatPrice(wallet.balance)}
                  </div>
                  {useWallet && (
                    <div className="mt-2">
                      <input
                        type="range"
                        min={0}
                        max={Math.min(wallet.balance, cart.grandTotal)}
                        step={10}
                        value={walletAmount}
                        onChange={(e) => setWalletAmount(Number(e.target.value))}
                        className="w-full accent-brand-600"
                      />
                      <div className="text-2xs font-black text-brand-600 mt-1">
                        Using: {formatPrice(walletAmount)}
                      </div>
                    </div>
                  )}
                </div>
              </label>
            )}

            {/* Loyalty points */}
            {wallet && wallet.loyaltyPoints > 0 && (
              <label className="flex items-start gap-3 p-3 rounded-xl bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLoyalty}
                  onChange={(e) => {
                    setUseLoyalty(e.target.checked);
                    if (e.target.checked) setLoyaltyPoints(wallet.loyaltyPoints);
                  }}
                  className="h-4 w-4 mt-0.5 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent-600" />
                    <span className="font-black text-sm">Use loyalty points</span>
                  </div>
                  <div className="text-2xs text-content-muted mt-0.5">
                    Available: {wallet.loyaltyPoints} pts · Value: {formatPrice(wallet.loyaltyValue)}
                  </div>
                  {useLoyalty && (
                    <div className="mt-2">
                      <input
                        type="range"
                        min={0}
                        max={wallet.loyaltyPoints}
                        step={10}
                        value={loyaltyPoints}
                        onChange={(e) => setLoyaltyPoints(Number(e.target.value))}
                        className="w-full accent-accent-600"
                      />
                      <div className="text-2xs font-black text-accent-600 mt-1">
                        Using: {loyaltyPoints} pts = {formatPrice(loyaltyPoints * 0.5)}
                      </div>
                    </div>
                  )}
                </div>
              </label>
            )}
          </Card>

          {/* Notes + Tip */}
          <Card className="p-5 space-y-4">
            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Special instructions (optional)
              </div>
              <textarea
                placeholder="Any specific delivery instructions?"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-surface text-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none"
              />
            </div>

            <div>
              <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
                Add tip for rider (optional)
              </div>
              <div className="flex gap-2 flex-wrap">
                {[0, 50, 100, 200].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTip(amt)}
                    className={cn(
                      'h-10 px-4 rounded-xl border-2 text-sm font-black transition',
                      tip === amt
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400'
                        : 'border-border bg-surface hover:border-brand-300',
                    )}
                  >
                    {amt === 0 ? 'No tip' : `+${formatPrice(amt)}`}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: Order summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-lg">Order summary</h3>

            {loadingPreview ? (
              <div className="skeleton h-64 rounded-2xl" />
            ) : preview ? (
              <>
                {/* Shop breakdown */}
                <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                  {preview.shopBreakdown.map((sh) => (
                    <div key={sh.shopId} className="flex items-start gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-content truncate">{sh.shop?.publicName}</div>
                        <div className="text-content-muted">{sh.itemCount} items</div>
                        {!sh.meetsMinOrder && (
                          <div className="text-danger font-bold flex items-center gap-1 mt-0.5">
                            <AlertCircle className="h-3 w-3" />
                            Min order: {formatPrice(sh.minOrderAmount)}
                          </div>
                        )}
                      </div>
                      <span className="font-bold shrink-0">{formatPrice(sh.total)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-content-muted">Subtotal</span>
                    <span className="font-bold">{formatPrice(preview.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-content-muted">Delivery</span>
                    <span className="font-bold">{formatPrice(preview.totalDeliveryFee)}</span>
                  </div>
                  {tip > 0 && (
                    <div className="flex justify-between">
                      <span className="text-content-muted">Rider tip</span>
                      <span className="font-bold">{formatPrice(tip)}</span>
                    </div>
                  )}
                  {preview.couponDiscount > 0 && (
                    <div className="flex justify-between text-brand-600">
                      <span>Coupon</span>
                      <span className="font-bold">−{formatPrice(preview.couponDiscount)}</span>
                    </div>
                  )}
                  {preview.loyaltyPoints.appliedDiscount > 0 && (
                    <div className="flex justify-between text-accent-600">
                      <span>Loyalty</span>
                      <span className="font-bold">−{formatPrice(preview.loyaltyPoints.appliedDiscount)}</span>
                    </div>
                  )}
                  {preview.wallet.used > 0 && (
                    <div className="flex justify-between text-brand-600">
                      <span>Wallet</span>
                      <span className="font-bold">−{formatPrice(preview.wallet.used)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <span className="text-base font-black">Total</span>
                  <span className="text-2xl font-black gradient-text">
                    {formatPrice(preview.finalTotal + tip)}
                  </span>
                </div>

                {preview.warnings.length > 0 && (
                  <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-xs text-warning font-bold flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <div>{preview.warnings.join(', ')}</div>
                  </div>
                )}

                <Button
                  variant="gradient"
                  size="lg"
                  fullWidth
                  disabled={!preview.canPlaceOrder || !address || placeOrderMutation.isPending}
                  loading={placeOrderMutation.isPending}
                  onClick={() => placeOrderMutation.mutate()}
                  leftIcon={<Lock className="h-4 w-4" />}
                >
                  Place order · {formatPrice(preview.finalTotal + tip)}
                </Button>

                <div className="text-2xs text-content-muted text-center leading-relaxed">
                  <Lock className="h-3 w-3 inline mr-1" />
                  Secure checkout · By placing this order you agree to our Terms
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-content-muted">
                <Info className="h-8 w-8 mx-auto mb-2" />
                Select address to see order total
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function cn(...args: any[]) {
  return args.filter(Boolean).join(' ');
}
