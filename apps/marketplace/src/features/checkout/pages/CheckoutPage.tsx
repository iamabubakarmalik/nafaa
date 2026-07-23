import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPin, Wallet, Gift, CreditCard, Truck, Package, Check, Sparkles } from 'lucide-react';
import { checkoutApi } from '../api/checkout.api';
import { profileApi } from '../../profile/api/profile.api';
import { Button } from '@shared/ui/Button';
import { cn } from '@lib/cn';

const PAYMENT_METHODS = [
  { key: 'COD',       label: 'Cash on Delivery', desc: 'Ghar pe cash dein', icon: '💵', color: 'brand' },
  { key: 'JAZZCASH',  label: 'JazzCash',          desc: 'Mobile wallet',      icon: '📱', color: 'rose' },
  { key: 'EASYPAISA', label: 'Easypaisa',         desc: 'Mobile wallet',      icon: '💚', color: 'success' },
  { key: 'CARD',      label: 'Card',              desc: 'Visa / MasterCard',  icon: '💳', color: 'info' },
  { key: 'RAAST',     label: 'Raast',             desc: 'State Bank instant', icon: '⚡', color: 'accent' },
  { key: 'WALLET',    label: 'Nafaa Wallet',      desc: 'App balance use',   icon: '👛', color: 'brand' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [useLoyalty, setUseLoyalty] = useState(0);
  const [useWallet, setUseWallet] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');

  const { data: addresses } = useQuery({
    queryKey: ['market-addresses'],
    queryFn: profileApi.addresses,
  });

  // Preview
  const { data: preview } = useQuery({
    queryKey: ['checkout-preview', selectedAddress, paymentMethod, useLoyalty, useWallet, couponCode],
    queryFn: () => checkoutApi.preview({
      addressId: selectedAddress || undefined,
      deliveryType: 'DELIVERY',
      paymentMethod,
      loyaltyPointsToUse: useLoyalty,
      walletAmountToUse: useWallet,
      couponCode: couponCode || undefined,
    }),
    enabled: !!selectedAddress || paymentMethod !== '',
  });

  const placeMutation = useMutation({
    mutationFn: () => checkoutApi.placeOrder({
      addressId: selectedAddress,
      deliveryType: 'DELIVERY',
      paymentMethod,
      loyaltyPointsToUse: useLoyalty,
      walletAmountToUse: useWallet,
      couponCode: couponCode || undefined,
      customerNotes: notes || undefined,
    }),
    onSuccess: (data: any) => {
      toast.success('Order place ho gaya! 🎉', {
        description: `${data.totalOrders} order(s) created`,
      });
      navigate(`/market/orders/${data.orders[0]?.id}`, { replace: true });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Order fail'),
  });

  return (
    <div className="pb-32 space-y-4">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">
        💳 Checkout
      </h1>

      {/* Address Selection */}
      <section className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 shadow-soft">
        <h2 className="font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-600" />
          Delivery Address
        </h2>
        {addresses && addresses.length > 0 ? (
          <div className="space-y-2">
            {addresses.map((addr: any) => (
              <label
                key={addr.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
                  selectedAddress === addr.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                    : 'border-slate-200 dark:border-neutral-700 hover:border-slate-300',
                )}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddress === addr.id}
                  onChange={() => setSelectedAddress(addr.id)}
                  className="mt-1 accent-brand-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="px-1.5 py-0.5 rounded-md bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400 text-[9px] font-extrabold">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {addr.fullName} · {addr.phone}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {addr.addressLine1}, {addr.area}, {addr.city}
                  </div>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <button
            onClick={() => navigate('/profile/addresses')}
            className="w-full h-12 rounded-xl border-2 border-dashed border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-400 font-extrabold text-sm hover:bg-brand-50 dark:hover:bg-brand-950/30 transition"
          >
            + Add Address
          </button>
        )}
      </section>

      {/* Payment Method */}
      <section className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 shadow-soft">
        <h2 className="font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-brand-600" />
          Payment Method
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.key}
              onClick={() => setPaymentMethod(pm.key)}
              className={cn(
                'p-3 rounded-xl border-2 text-left transition',
                paymentMethod === pm.key
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 shadow-md'
                  : 'border-slate-200 dark:border-neutral-700 hover:border-slate-300',
              )}
            >
              <div className="text-2xl mb-1">{pm.icon}</div>
              <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                {pm.label}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{pm.desc}</div>
              {paymentMethod === pm.key && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-brand-700 dark:text-brand-400">
                  <Check className="h-3 w-3" />
                  Selected
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Wallet + Loyalty */}
      {preview && (
        <section className="rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/30 dark:to-emerald-950/30 border border-brand-200 dark:border-brand-800 p-4 shadow-soft">
          <h2 className="font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            Rewards Use Karein
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                Loyalty Points
              </div>
              <div className="text-xs text-slate-600 mb-1.5">
                Available: <span className="font-extrabold">{preview.loyaltyPoints?.available || 0}</span>
              </div>
              <input
                type="number"
                min="0"
                max={preview.loyaltyPoints?.available || 0}
                value={useLoyalty}
                onChange={(e) => setUseLoyalty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-bold"
              />
              <div className="text-[10px] text-brand-700 mt-1">= Rs {(useLoyalty * 0.5).toFixed(0)} discount</div>
            </div>
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                Wallet Balance
              </div>
              <div className="text-xs text-slate-600 mb-1.5">
                Available: <span className="font-extrabold">Rs {preview.wallet?.balance || 0}</span>
              </div>
              <input
                type="number"
                min="0"
                max={preview.wallet?.balance || 0}
                value={useWallet}
                onChange={(e) => setUseWallet(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-bold"
              />
            </div>
          </div>
        </section>
      )}

      {/* Coupon */}
      <section className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 shadow-soft">
        <h2 className="font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-500" />
          Coupon Code
        </h2>
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="COUPON123"
          className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-neutral-700 focus:border-amber-500 outline-none font-bold uppercase text-sm"
        />
      </section>

      {/* Order Notes */}
      <section className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 shadow-soft">
        <h2 className="font-extrabold text-slate-900 dark:text-white mb-3">
          📝 Special Instructions (optional)
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery ke waqt bell 2 baar bajayein..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 focus:border-brand-500 outline-none text-sm resize-none"
        />
      </section>

      {/* Preview Summary */}
      {preview && (
        <section className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-4 shadow-soft space-y-2">
          <h2 className="font-extrabold text-slate-900 dark:text-white mb-2">Bill Summary</h2>
          <Row label="Subtotal" value={preview.subtotal} />
          <Row label="Delivery Fee" value={preview.totalDeliveryFee} />
          {preview.couponDiscount > 0 && <Row label="Coupon" value={-preview.couponDiscount} danger />}
          {preview.loyaltyPoints?.appliedDiscount > 0 && (
            <Row label={`Loyalty (${useLoyalty} points)`} value={-preview.loyaltyPoints.appliedDiscount} danger />
          )}
          {preview.wallet?.used > 0 && <Row label="Wallet Used" value={-preview.wallet.used} danger />}
          <div className="pt-2 border-t-2 border-slate-200 dark:border-neutral-700 flex items-center justify-between">
            <span className="text-base font-extrabold text-slate-900 dark:text-white">Total</span>
            <span className="text-2xl font-black bg-gradient-to-r from-brand-600 to-emerald-700 bg-clip-text text-transparent">
              Rs {preview.finalTotal.toFixed(0)}
            </span>
          </div>
        </section>
      )}

      {/* Sticky Place Order */}
      <div className="fixed bottom-20 inset-x-0 z-30 bg-white dark:bg-neutral-950 border-t-2 border-slate-100 dark:border-neutral-800 shadow-soft-xl">
        <div className="max-w-6xl mx-auto p-4">
          <Button
            variant="gradient"
            size="xl"
            fullWidth
            loading={placeMutation.isPending}
            disabled={!selectedAddress || !preview?.canPlaceOrder}
            onClick={() => placeMutation.mutate()}
            rightIcon={<Check className="h-5 w-5" />}
          >
            Place Order · Rs {preview?.finalTotal?.toFixed(0) || 0}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className={cn(
        'font-extrabold tabular-nums',
        danger ? 'text-rose-600' : 'text-slate-900 dark:text-white',
      )}>
        {value < 0 ? '-' : ''}Rs {Math.abs(value).toFixed(0)}
      </span>
    </div>
  );
}
