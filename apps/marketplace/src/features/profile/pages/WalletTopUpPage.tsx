import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Wallet, Plus, CreditCard, Smartphone, Zap,
  ShieldCheck, Gift,
} from 'lucide-react';
import { marketplaceClient, unwrap } from '@/api/client';
import { Button, Card, Input, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];
const BONUS_TIERS = [
  { min: 5000, bonus: 5, label: 'Add PKR 5,000+ get 5% bonus' },
  { min: 10000, bonus: 10, label: 'Add PKR 10,000+ get 10% bonus' },
  { min: 25000, bonus: 15, label: 'Add PKR 25,000+ get 15% bonus' },
];

const PAYMENT_METHODS = [
  { key: 'JAZZCASH',  icon: Smartphone, label: 'JazzCash',  color: 'from-red-500 to-red-700' },
  { key: 'EASYPAISA', icon: Smartphone, label: 'EasyPaisa', color: 'from-emerald-600 to-teal-700' },
  { key: 'RAAST',     icon: Zap,        label: 'Raast',     color: 'from-blue-500 to-blue-700' },
  { key: 'CARD',      icon: CreditCard, label: 'Card',      color: 'from-slate-600 to-slate-800' },
];

export default function WalletTopUpPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('JAZZCASH');
  const [phone, setPhone] = useState('');

  const applicableBonus = BONUS_TIERS.slice().reverse().find((t) => amount >= t.min);
  const bonusAmount = applicableBonus ? (amount * applicableBonus.bonus) / 100 : 0;
  const totalCredit = amount + bonusAmount;

  const topUpMutation = useMutation({
    mutationFn: () =>
      marketplaceClient.post('/profile/wallet/top-up', {
        amount,
        paymentMethod,
        mobileNumber: phone,
      }).then(unwrap),
    onSuccess: () => {
      toast.success('Top-up initiated. Redirecting to payment...');
      // Payment redirect would happen here
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <>
      <Helmet><title>Top Up Wallet — Nafaa Bazaar</title></Helmet>

      <div className="max-w-2xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile/wallet')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to wallet
        </button>

        {/* Hero */}
        <Card className="p-6 bg-gradient-brand text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-wider">Add money</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Top Up Wallet</h1>
            <p className="text-brand-50 text-sm md:text-base mt-1">
              Instant credit · Zero fees · Bonus on big top-ups
            </p>
          </div>
        </Card>

        {/* Amount */}
        <Card className="p-5 space-y-4">
          <div>
            <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
              Choose amount
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setCustomAmount(''); }}
                  className={cn(
                    'h-14 rounded-xl border-2 text-sm font-black transition',
                    amount === a && !customAmount
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700'
                      : 'border-border bg-surface hover:border-brand-300',
                  )}
                >
                  {formatPrice(a)}
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Or enter custom amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setAmount(Number(e.target.value) || 0);
              }}
              inputSize="lg"
              leftIcon={<Wallet className="h-4 w-4" />}
              hint="Minimum PKR 100 · Maximum PKR 100,000"
            />
          </div>

          {/* Bonus indicator */}
          {applicableBonus && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-accent-50 to-amber-100 dark:from-accent-950/30 dark:to-amber-950/30 border border-accent-200 dark:border-accent-800">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-accent-600 shrink-0 animate-bounce-soft" />
                <div className="flex-1">
                  <div className="text-xs font-black text-accent-700 dark:text-accent-400">
                    🎉 You get {applicableBonus.bonus}% bonus!
                  </div>
                  <div className="text-2xs text-content-muted mt-0.5">
                    +{formatPrice(bonusAmount)} extra credited to your wallet
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Next tier hint */}
          {!applicableBonus && amount > 0 && (
            <div className="text-2xs text-content-muted p-2 rounded-lg bg-surface-muted">
              💡 Add PKR {BONUS_TIERS[0].min - amount} more to unlock {BONUS_TIERS[0].bonus}% bonus
            </div>
          )}
        </Card>

        {/* Payment method */}
        <Card className="p-5">
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-2">
            Payment method
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const active = paymentMethod === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={cn(
                    'p-3 rounded-2xl border-2 flex items-center gap-3 transition',
                    active ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-border bg-surface',
                  )}
                >
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-black">{m.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Phone */}
        {(paymentMethod === 'JAZZCASH' || paymentMethod === 'EASYPAISA') && (
          <Input
            label="Mobile number"
            placeholder="03001234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputSize="lg"
          />
        )}

        {/* Summary */}
        <Card className="p-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-content-muted">Amount</span>
            <span className="font-bold">{formatPrice(amount)}</span>
          </div>
          {bonusAmount > 0 && (
            <div className="flex justify-between text-sm text-accent-600 dark:text-accent-400">
              <span className="font-bold">Bonus ({applicableBonus?.bonus}%)</span>
              <span className="font-black">+{formatPrice(bonusAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-black">Total credited</span>
            <span className="text-2xl font-black gradient-text">{formatPrice(totalCredit)}</span>
          </div>
        </Card>

        <Button
          variant="gradient"
          size="lg"
          fullWidth
          disabled={amount < 100 || amount > 100000 || ((paymentMethod === 'JAZZCASH' || paymentMethod === 'EASYPAISA') && !phone)}
          loading={topUpMutation.isPending}
          onClick={() => topUpMutation.mutate()}
          leftIcon={<ShieldCheck className="h-4 w-4" />}
        >
          Add {formatPrice(amount)} to wallet
        </Button>

        <div className="text-center text-2xs text-content-muted">
          🔒 Secure payment · Instant credit · No hidden fees
        </div>
      </div>
    </>
  );
}
