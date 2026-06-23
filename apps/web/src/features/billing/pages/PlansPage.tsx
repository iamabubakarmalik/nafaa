import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, Sparkles, Crown, Rocket, Zap, ArrowRight,
  Star, Award, Shield, TrendingUp, Users, Package, Store,
  BarChart3, Wallet, MessageCircle, ChevronRight, AlertTriangle,
  CheckCircle2, RefreshCw,
} from 'lucide-react';
import { plansApi, type Plan } from '@/api/plans.api';
import { subscriptionsApi, type BillingInterval } from '@/api/subscriptions.api';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const planIcons: Record<string, any> = {
  'free-trial': Sparkles,
  basic: Zap,
  pro: Rocket,
  enterprise: Crown,
};

const planGradients: Record<string, string> = {
  'free-trial': 'from-slate-600 to-slate-800',
  basic: 'from-blue-500 to-blue-700',
  pro: 'from-brand-500 to-emerald-700',
  enterprise: 'from-amber-500 to-orange-700',
};

const planGlows: Record<string, string> = {
  'free-trial': 'shadow-slate-500/30',
  basic: 'shadow-blue-500/30',
  pro: 'shadow-brand-500/40',
  enterprise: 'shadow-amber-500/30',
};

interface FeatureRowProps {
  enabled: boolean;
  label: string;
}

const FeatureRow = ({ enabled, label }: FeatureRowProps) => (
  <div className="flex items-start gap-2 text-sm">
    {enabled ? (
      <div className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
        <Check className="h-3 w-3 text-emerald-700" strokeWidth={3} />
      </div>
    ) : (
      <div className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <X className="h-3 w-3 text-slate-400" strokeWidth={3} />
      </div>
    )}
    <span className={`${enabled ? 'text-slate-700 font-semibold' : 'text-slate-400 line-through'} leading-tight`}>
      {label}
    </span>
  </div>
);

interface ConfirmModalProps {
  plan: Plan;
  interval: BillingInterval;
  price: number;
  existingPending: any;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

function ConfirmUpgradeModal({ plan, interval, price, existingPending, onConfirm, onClose, loading }: ConfirmModalProps) {
  const isSamePlan = existingPending?.subscription?.plan?.id === plan.id &&
                     existingPending?.subscription?.interval === interval;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${planGradients[plan.slug] || 'from-slate-700 to-slate-900'} text-white p-6`}>
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 mb-3">
              {isSamePlan ? (
                <>
                  <RefreshCw className="h-2.5 w-2.5 text-amber-300" />
                  Same Plan
                </>
              ) : existingPending ? (
                <>
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-300" />
                  Switch Plan
                </>
              ) : (
                <>
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                  Confirm Subscription
                </>
              )}
            </div>
            <h3 className="text-2xl font-extrabold">{plan.name}</h3>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tabular-nums">{formatPKR(price)}</span>
              <span className="text-sm font-bold text-white/80">/ {interval.toLowerCase()}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {isSamePlan ? (
            <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4 flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-blue-900 text-sm">Already Pending</div>
                <p className="text-xs text-blue-800 mt-1 font-semibold leading-relaxed">
                  Iss plan ke liye already invoice generate ho chuki hai. Aap ko us hi invoice par redirect kar dia jayega — naya invoice nahi banega.
                </p>
              </div>
            </div>
          ) : existingPending ? (
            <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-amber-900 text-sm">Pichla Pending Cancel Ho Jayega</div>
                <p className="text-xs text-amber-800 mt-1 font-semibold leading-relaxed">
                  Aap ka existing pending plan{' '}
                  <strong>{existingPending.subscription.plan.name}</strong> aur uska{' '}
                  invoice <strong>{existingPending.invoice.invoiceNumber}</strong> ({formatPKR(existingPending.invoice.amountDue)}) automatic cancel ho jayega.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-emerald-900 text-sm">Ready to Subscribe</div>
                <p className="text-xs text-emerald-800 mt-1 font-semibold leading-relaxed">
                  Naya invoice generate hoga aur aap payment page par chale jayenge. Current trial/plan payment confirm hone tak chalta rahega.
                </p>
              </div>
            </div>
          )}

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-slate-700 font-semibold">
              <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
              <span>{plan.maxProducts >= 999999 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products</span>
            </li>
            <li className="flex items-center gap-2 text-slate-700 font-semibold">
              <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
              <span>{plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} Team Users</span>
            </li>
            <li className="flex items-center gap-2 text-slate-700 font-semibold">
              <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
              <span>{plan.maxShops >= 999 ? 'Unlimited' : plan.maxShops} Shop{plan.maxShops > 1 ? 's' : ''}</span>
            </li>
          </ul>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              className={`flex-1 bg-gradient-to-r ${planGradients[plan.slug] || 'from-brand-600 to-emerald-600'} hover:opacity-95 shadow-xl ${planGlows[plan.slug] || ''}`}
              onClick={onConfirm}
              loading={loading}
            >
              {isSamePlan ? (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Go to Payment
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Confirm & Pay
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });

  const { data: current } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
  });

  // Get existing pending — used to show smart warnings
  const { data: pendingUpgrade } = useQuery({
    queryKey: ['subscription-pending'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/subscriptions/pending-upgrade');
        return res.data?.data ?? res.data ?? null;
      } catch {
        return null;
      }
    },
  });

  const startMutation = useMutation({
    mutationFn: ({ planId, interval }: { planId: string; interval: BillingInterval }) =>
      subscriptionsApi.start(planId, interval),
    onSuccess: (data) => {
      // Invalidate everything related
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });

      if (data.reused) {
        toast.success('Existing invoice par redirect kar rahe hain', {
          description: 'Same plan ka pending invoice mil gaya',
        });
      } else if (data.cancelledCount > 0) {
        toast.success(`✅ Plan switch ho gaya!`, {
          description: `${data.cancelledCount} pichla pending automatic cancel ho gaya`,
        });
      } else {
        toast.success('🎉 Plan selected! Ab payment karein');
      }

      setConfirmPlan(null);
      navigate(`/billing/invoice/${data.invoice.id}/pay`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Subscribe fail'),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => subscriptionsApi.cleanupPending(),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['subscription-pending'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cleanup fail'),
  });

  const getPrice = (plan: Plan) => {
    if (interval === 'MONTHLY') return plan.priceMonthly;
    if (interval === 'QUARTERLY') return plan.priceQuarterly;
    return plan.priceYearly;
  };

  const getPriceLabel = (plan: Plan) => {
    if (plan.priceMonthly === 0) return 'Free';
    return formatPKR(getPrice(plan));
  };

  const getSavings = (plan: Plan) => {
    if (plan.priceMonthly === 0) return null;
    if (interval === 'MONTHLY') return null;
    const monthlyTotal = plan.priceMonthly * (interval === 'QUARTERLY' ? 3 : 12);
    const actualPrice = getPrice(plan);
    const savings = monthlyTotal - actualPrice;
    const pct = (savings / monthlyTotal) * 100;
    return { amount: savings, percent: pct };
  };

  const intervalLabel = {
    MONTHLY: '/month',
    QUARTERLY: '/3 months',
    YEARLY: '/year',
  }[interval];

  const handleSubscribeClick = (plan: Plan) => {
    setConfirmPlan(plan);
  };

  const handleConfirm = () => {
    if (!confirmPlan) return;
    startMutation.mutate({ planId: confirmPlan.id, interval });
  };

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-emerald-700 text-white p-8 sm:p-12 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-xs font-extrabold border border-white/20 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Pricing Plans
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Apna business <span className="bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">aagey barhao</span>
          </h2>
          <p className="mt-4 text-base text-white/80 max-w-2xl mx-auto font-semibold">
            Pakistan ke shopkeepers ke liye banaya gaya. Free trial 7 din — koi credit card nahi chahiye.
          </p>

          {/* Interval switcher */}
          <div className="mt-8 inline-flex bg-white/10 backdrop-blur rounded-2xl p-1 border border-white/20 shadow-lg">
            {(['MONTHLY', 'QUARTERLY', 'YEARLY'] as BillingInterval[]).map((i) => {
              const active = interval === i;
              return (
                <button
                  key={i}
                  onClick={() => setInterval(i)}
                  className={`relative px-5 py-2.5 rounded-xl text-sm font-extrabold transition ${
                    active ? 'bg-white text-slate-900 shadow-lg' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {i === 'MONTHLY' && 'Monthly'}
                  {i === 'QUARTERLY' && (
                    <>
                      Quarterly
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[8px] font-extrabold">-5%</span>
                    </>
                  )}
                  {i === 'YEARLY' && (
                    <>
                      Yearly
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-400 text-emerald-900 text-[8px] font-extrabold">-15%</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Current plan info */}
      {current && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Current Plan</div>
              <div className="font-extrabold text-emerald-900">{current.plan.name}</div>
              <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                Status: {current.status} • Expires: {new Date(current.currentPeriodEnd).toLocaleDateString('en-PK')}
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate('/billing')}>
            View Billing
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Existing pending warning */}
      {pendingUpgrade && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">
                  Existing Pending Upgrade
                </div>
                <div className="font-extrabold text-amber-900">
                  {pendingUpgrade.subscription.plan.name} — {formatPKR(pendingUpgrade.invoice.amountDue)}
                </div>
                <div className="text-xs text-amber-700 font-semibold mt-0.5">
                  Naya plan choose karne se ye automatic cancel ho jayega
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => cleanupMutation.mutate()}
                loading={cleanupMutation.isPending}
                className="bg-white border-amber-300 hover:bg-amber-100 text-amber-800"
              >
                <RefreshCw className="h-4 w-4" />
                Cleanup
              </Button>
              <Button
                onClick={() => navigate(`/billing/invoice/${pendingUpgrade.invoice.id}/pay`)}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
              >
                Pay Existing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PLANS GRID ═══ */}
      <section className="grid lg:grid-cols-4 md:grid-cols-2 gap-5">
        {plans.map((plan) => {
          const Icon = planIcons[plan.slug] || Sparkles;
          const gradient = planGradients[plan.slug] || 'from-slate-500 to-slate-700';
          const glow = planGlows[plan.slug] || 'shadow-slate-500/30';
          const isCurrent = current?.plan.id === plan.id;
          const isPro = plan.slug === 'pro';
          const isEnterprise = plan.slug === 'enterprise';
          const price = getPrice(plan);
          const savings = getSavings(plan);
          const isFree = plan.priceMonthly === 0;
          const isPendingThis = pendingUpgrade?.subscription?.plan?.id === plan.id;

          return (
            <div
              key={plan.id}
              className={`group relative rounded-3xl bg-white border-2 shadow-md overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-2 ${
                isPro
                  ? 'border-brand-500 lg:scale-105 ring-4 ring-brand-100'
                  : isEnterprise
                  ? 'border-amber-400'
                  : 'border-slate-200'
              }`}
            >
              {isPro && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-brand-600 via-emerald-600 to-brand-700 text-white text-center py-1.5 text-[10px] font-extrabold uppercase tracking-wider z-10 shadow-lg">
                  <Star className="h-3 w-3 fill-white inline mr-1" />
                  Most Popular
                </div>
              )}

              {isPendingThis && (
                <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-lg">
                  ⏳ Pending
                </div>
              )}

              <div className={`relative bg-gradient-to-br ${gradient} text-white p-6 ${isPro ? 'pt-10' : ''} overflow-hidden`}>
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-xl ring-2 ring-white/20 group-hover:rotate-6 transition-transform">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-2xl font-extrabold">{plan.name}</h3>
                  <p className="text-sm text-white/85 mt-1 font-semibold leading-snug">{plan.description}</p>

                  <div className="mt-5">
                    <div className="flex items-baseline gap-1">
                      <div className="text-4xl font-extrabold tabular-nums">{getPriceLabel(plan)}</div>
                      {price > 0 && <div className="text-sm text-white/80 font-bold">{intervalLabel}</div>}
                    </div>
                    {isFree && <div className="text-sm text-white/80 font-semibold mt-1">⏱️ {plan.trialDays} days trial</div>}
                    {savings && (
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-300/30 backdrop-blur border border-amber-200/40 text-[10px] font-extrabold text-amber-100">
                        💰 Save {formatPKR(savings.amount)} ({savings.percent.toFixed(0)}%)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" /> Limits
                  </div>
                  <div className="space-y-2">
                    <FeatureRow enabled label={`${plan.maxProducts >= 999999 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products`} />
                    <FeatureRow enabled label={`${plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} Users`} />
                    <FeatureRow enabled label={`${plan.maxShops >= 999 ? 'Unlimited' : plan.maxShops} Shop${plan.maxShops > 1 ? 's' : ''}`} />
                    <FeatureRow enabled label={`${plan.maxSalesPerMonth >= 999999 ? 'Unlimited' : plan.maxSalesPerMonth.toLocaleString()} Sales/month`} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Features
                  </div>
                  <div className="space-y-2">
                    <FeatureRow enabled={plan.featurePos} label="POS Counter" />
                    <FeatureRow enabled={plan.featureBarcodeScanner} label="Barcode Scanner" />
                    <FeatureRow enabled={plan.featureKhata} label="Khata (Udhaar)" />
                    <FeatureRow enabled={plan.featureCashRegister} label="Cash Register" />
                    <FeatureRow enabled={plan.featureReturns} label="Returns" />
                    <FeatureRow enabled={plan.featureReports} label="Reports & Analytics" />
                    <FeatureRow enabled={plan.featureDiscounts} label="Discount Codes" />
                    <FeatureRow enabled={plan.featureLoyalty} label="Loyalty Points" />
                    <FeatureRow enabled={plan.featureMultiShop} label="Multi-Shop" />
                    <FeatureRow enabled={plan.featureStockTransfer} label="Stock Transfer" />
                    <FeatureRow enabled={plan.featureProfitReport} label="Profit Reports" />
                    <FeatureRow enabled={plan.featureExports} label="Excel/PDF Export" />
                    <FeatureRow enabled={plan.featureBackup} label="Backup" />
                    <FeatureRow enabled={plan.featureWhatsappReceipt} label="WhatsApp Receipt" />
                    <FeatureRow enabled={plan.featureCustomBranding} label="Custom Branding" />
                    <FeatureRow enabled={plan.featureSupport24x7} label="24/7 Priority Support" />
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-100">
                  {isCurrent ? (
                    <Button className="w-full" variant="secondary" disabled>
                      <Check className="h-4 w-4" />
                      Current Plan
                    </Button>
                  ) : isFree ? (
                    <Button className="w-full" variant="secondary" onClick={() => navigate('/billing')}>
                      Already on Trial
                    </Button>
                  ) : isPendingThis ? (
                    <Button
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                      onClick={() => navigate(`/billing/invoice/${pendingUpgrade.invoice.id}/pay`)}
                    >
                      <ArrowRight className="h-4 w-4" />
                      Continue Payment
                    </Button>
                  ) : (
                    <Button
                      className={`w-full shadow-lg bg-gradient-to-r ${gradient} hover:opacity-90 ${glow}`}
                      onClick={() => handleSubscribeClick(plan)}
                    >
                      Subscribe Now
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Trust + FAQ */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 p-6 shadow-sm">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-extrabold text-slate-900">Why Choose Nafaa?</h3>
          <p className="text-sm text-slate-600 mt-1 font-semibold">Trusted by Pakistani shopkeepers</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TrustCard icon={Shield} title="Secure" desc="Bank-level security & encryption" />
          <TrustCard icon={Zap} title="Fast" desc="Lightning quick — even on slow internet" />
          <TrustCard icon={MessageCircle} title="Urdu Support" desc="Roman Urdu support team" />
          <TrustCard icon={TrendingUp} title="Growing" desc="500+ shops trust Nafaa daily" />
        </div>
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 p-6 shadow-sm">
        <h3 className="text-2xl font-extrabold text-slate-900 mb-4">Common Questions</h3>
        <div className="space-y-3">
          <FAQ q="Free trial mein kya milta hai?" a="7 days full access of Pro plan — POS, inventory, reports, khata. Koi credit card nahi chahiye." />
          <FAQ q="Payment kaise karein?" a="JazzCash, EasyPaisa, NayaPay, bank transfer ya credit/debit card. Manual payment ke liye admin 24 hours mein approve karega." />
          <FAQ q="Kya main plan change kar sakta hoon?" a="Haan, koi bhi waqt upgrade ya downgrade kar sakte hain. Naya plan choose karne par pichla pending automatic cancel ho jayega." />
          <FAQ q="Agar mujhe cancel karna ho?" a="Anytime cancel kar sakte hain. Period end tak access milta hai, phir read-only mode mein chala jata hai." />
        </div>
      </section>

      {/* Confirm modal */}
      {confirmPlan && (
        <ConfirmUpgradeModal
          plan={confirmPlan}
          interval={interval}
          price={getPrice(confirmPlan)}
          existingPending={pendingUpgrade}
          onConfirm={handleConfirm}
          onClose={() => setConfirmPlan(null)}
          loading={startMutation.isPending}
        />
      )}
    </div>
  );
}

function TrustCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 hover:border-brand-300 hover:shadow-md transition group">
      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="mt-3 font-extrabold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-600 font-semibold mt-1 leading-snug">{desc}</p>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border-2 border-slate-200 overflow-hidden transition hover:border-brand-300">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition"
      >
        <span className="font-extrabold text-slate-900">{q}</span>
        <ChevronRight className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-slate-600 font-semibold leading-relaxed animate-in slide-in-from-top-1 duration-150">
          {a}
        </div>
      )}
    </div>
  );
}
