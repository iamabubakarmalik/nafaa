import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, Sparkles, Crown, Rocket, Zap, ArrowRight,
  Star, Award, Shield, TrendingUp, Users, Package, Store,
  BarChart3, Wallet, MessageCircle, ChevronRight, AlertTriangle,
  CheckCircle2, RefreshCw, GraduationCap, HelpCircle, Flame,
  Clock, ShieldCheck,
} from 'lucide-react';
import { plansApi, type Plan } from '@modules/billing/plans/api/plans.api';
import { subscriptionsApi, type BillingInterval } from '@modules/billing/subscriptions/api/subscriptions.api';
import { apiClient } from '@core/api/client';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA PLANS — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌙 Dark mode complete
   🎓 Teacher modal — Plan selection + interval savings guide
   ⌨️  M/Q/Y interval • T guide • Esc
   💰 Live savings calculator
   ⭐ Enhanced trust badges + 7-Q FAQ
   ⏱️ Animated most-popular ribbon
   ═════════════════════════════════════════════════════════════ */

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
      <div className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Check className="h-3 w-3 text-emerald-700 dark:text-emerald-400" strokeWidth={3} />
      </div>
    ) : (
      <div className="h-4 w-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
        <X className="h-3 w-3 text-slate-400 dark:text-slate-600" strokeWidth={3} />
      </div>
    )}
    <span className={`${enabled ? 'text-slate-700 dark:text-slate-200 font-semibold' : 'text-slate-400 dark:text-slate-600 line-through'} leading-tight`}>
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
  const pendingSub  = existingPending?.subscription ?? null;
  const pendingPlan = pendingSub?.plan ?? null;
  const pendingInv  = existingPending?.invoice ?? null;
  const hasPending  = !!pendingPlan;
  const isSamePlan  = hasPending && pendingPlan?.id === plan.id && pendingSub?.interval === interval;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className={`relative overflow-hidden bg-gradient-to-br ${planGradients[plan.slug] || 'from-slate-700 to-slate-900'} text-white p-6`}>
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest border border-white/20 mb-3">
              {isSamePlan ? (<><RefreshCw className="h-2.5 w-2.5 text-amber-300" />Same Plan</>) :
               hasPending ? (<><AlertTriangle className="h-2.5 w-2.5 text-amber-300" />Switch Plan</>) :
               (<><Sparkles className="h-2.5 w-2.5 text-amber-300" />Confirm Subscription</>)}
            </div>
            <h3 className="text-2xl font-extrabold">{plan.name}</h3>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tabular-nums">{formatPKR(price)}</span>
              <span className="text-sm font-bold text-white/80">/ {interval.toLowerCase()}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {isSamePlan ? (
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/40 p-4 flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-blue-900 dark:text-blue-200 text-sm">Already Pending</div>
                <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 font-semibold leading-relaxed">
                  Iss plan ke liye already invoice generate ho chuki hai. Aap ko us hi invoice par redirect kar dia jayega — naya invoice nahi banega.
                </p>
              </div>
            </div>
          ) : hasPending ? (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">Pichla Pending Cancel Ho Jayega</div>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-semibold leading-relaxed">
                  Aap ka existing pending plan <strong>{pendingPlan?.name ?? 'Unknown'}</strong>
                  {pendingInv ? (<> aur uska invoice <strong>{pendingInv.invoiceNumber ?? ''}</strong> ({formatPKR(pendingInv.amountDue ?? 0)})</>) : null}
                  {' '}automatic cancel ho jayega.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/40 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">Ready to Subscribe</div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 font-semibold leading-relaxed">
                  Naya invoice generate hoga aur aap payment page par chale jayenge. Current trial/plan payment confirm hone tak chalta rahega.
                </p>
              </div>
            </div>
          )}

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
              <span>{plan.maxProducts >= 999999 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products</span>
            </li>
            <li className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
              <span>{plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} Team Users</span>
            </li>
            <li className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
              <span>{plan.maxShops >= 999 ? 'Unlimited' : plan.maxShops} Shop{plan.maxShops > 1 ? 's' : ''}</span>
            </li>
          </ul>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button
              className={`flex-1 bg-gradient-to-r ${planGradients[plan.slug] || 'from-brand-600 to-emerald-600'} hover:opacity-95 shadow-xl ${planGlows[plan.slug] || ''} font-extrabold`}
              onClick={onConfirm}
              loading={loading}
            >
              {isSamePlan ? (<><ArrowRight className="h-4 w-4" />Go to Payment</>) : (<><Rocket className="h-4 w-4" />Confirm & Pay</>)}
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
  const [showTeacher, setShowTeacher] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });

  const { data: current } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
  });

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
        toast.success('🎉 Plan selected! Ab payment karo');
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

  const handleSubscribeClick = (plan: Plan) => setConfirmPlan(plan);
  const handleConfirm = () => {
    if (!confirmPlan) return;
    startMutation.mutate({ planId: confirmPlan.id, interval });
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (confirmPlan) return setConfirmPlan(null);
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 'm') { e.preventDefault(); setInterval('MONTHLY'); }
      if (e.key.toLowerCase() === 'q') { e.preventDefault(); setInterval('QUARTERLY'); }
      if (e.key.toLowerCase() === 'y') { e.preventDefault(); setInterval('YEARLY'); }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, confirmPlan]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = (showTeacher || confirmPlan) ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher, confirmPlan]);

  // Compute max potential yearly savings across all paid plans
  const maxYearlySavings = useMemo(() => {
    let max = 0;
    for (const p of plans) {
      if (p.priceMonthly === 0) continue;
      const s = (p.priceMonthly * 12) - p.priceYearly;
      if (s > max) max = s;
    }
    return max;
  }, [plans]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-10">
      {showTeacher && <PlansTeacher onClose={() => setShowTeacher(false)} maxSavings={maxYearlySavings} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-emerald-700 dark:from-slate-950 dark:via-brand-950 dark:to-emerald-900 text-white p-6 sm:p-12 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

        <div className="relative text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-4 py-1.5 text-xs font-extrabold border border-white/25 shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Pricing Plans 2026
            </div>
            <button
              onClick={() => setShowTeacher(true)}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400/90 hover:bg-amber-400 backdrop-blur-md px-4 py-1.5 text-xs font-extrabold text-slate-900 border border-amber-300 shadow-lg transition"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              How to Choose?
            </button>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight">
            Apna business <span className="bg-gradient-to-r from-amber-300 to-emerald-300 bg-clip-text text-transparent">aagey barhao</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-white/90 max-w-2xl mx-auto font-semibold">
            Pakistan ke shopkeepers ke liye banaya gaya. Free trial 7 din — koi credit card nahi chahiye.
          </p>

          {/* Interval switcher */}
          <div className="mt-8 inline-flex bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/20 shadow-lg">
            {(['MONTHLY', 'QUARTERLY', 'YEARLY'] as BillingInterval[]).map((i) => {
              const active = interval === i;
              return (
                <button
                  key={i}
                  onClick={() => setInterval(i)}
                  className={`relative px-4 sm:px-5 py-2.5 rounded-xl text-sm font-extrabold transition ${
                    active ? 'bg-white text-slate-900 shadow-lg' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {i === 'MONTHLY' && 'Monthly'}
                  {i === 'QUARTERLY' && (
                    <>
                      Quarterly
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[8px] font-extrabold shadow-sm">-5%</span>
                    </>
                  )}
                  {i === 'YEARLY' && (
                    <>
                      Yearly
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-400 text-emerald-900 text-[8px] font-extrabold shadow-sm">-15%</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Keyboard hints */}
          <div className="mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center justify-center">
            <Kbd>M</Kbd><span className="text-white/60">Monthly</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>Q</Kbd><span className="text-white/60">Quarterly</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>Y</Kbd><span className="text-white/60">Yearly</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>T</Kbd><span className="text-white/60">Guide</span>
          </div>

          {/* Savings banner */}
          {interval === 'YEARLY' && maxYearlySavings > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400/30 to-emerald-400/30 backdrop-blur-md border-2 border-amber-300/40 px-4 py-2 text-sm font-extrabold text-amber-100 shadow-lg">
              <Flame className="h-4 w-4 text-amber-300" />
              💰 Yearly billing pe upto <strong className="text-amber-300 tabular-nums">{formatPKR(maxYearlySavings)}</strong> saving!
            </div>
          )}
        </div>
      </section>

      {/* Current plan info */}
      {current && current.plan && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-2 border-emerald-200 dark:border-emerald-500/40 p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-400">Current Plan</div>
              <div className="font-extrabold text-emerald-900 dark:text-emerald-200">{current.plan?.name}</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
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
      {pendingUpgrade && pendingUpgrade.subscription && pendingUpgrade.subscription.plan && pendingUpgrade.invoice && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-400">
                  Existing Pending Upgrade
                </div>
                <div className="font-extrabold text-amber-900 dark:text-amber-200">
                  {pendingUpgrade.subscription.plan.name} — {formatPKR(pendingUpgrade.invoice.amountDue)}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                  Naya plan choose karne se ye automatic cancel ho jayega
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => cleanupMutation.mutate()}
                loading={cleanupMutation.isPending}
                className="bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-300"
              >
                <RefreshCw className="h-4 w-4" />
                Cleanup
              </Button>
              <Button
                onClick={() => pendingUpgrade?.invoice?.id && navigate(`/billing/invoice/${pendingUpgrade.invoice.id}/pay`)}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 font-extrabold"
              >
                Pay Existing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PLANS GRID ═══ */}
      <section className="grid lg:grid-cols-4 md:grid-cols-2 gap-4 sm:gap-5">
        {plans.map((plan) => {
          const Icon = planIcons[plan.slug] || Sparkles;
          const gradient = planGradients[plan.slug] || 'from-slate-500 to-slate-700';
          const glow = planGlows[plan.slug] || 'shadow-slate-500/30';
          const isCurrent = current?.plan?.id === plan.id;
          const isPro = plan.slug === 'pro';
          const isEnterprise = plan.slug === 'enterprise';
          const price = getPrice(plan);
          const savings = getSavings(plan);
          const isFree = plan.priceMonthly === 0;
          const isPendingThis = !!pendingUpgrade?.subscription?.plan?.id && pendingUpgrade.subscription.plan.id === plan?.id;

          return (
            <div
              key={plan.id}
              className={`group relative rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-md overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-2 ${
                isPro
                  ? 'border-brand-500 dark:border-brand-400 lg:scale-105 ring-4 ring-brand-100 dark:ring-brand-500/20'
                  : isEnterprise
                    ? 'border-amber-400 dark:border-amber-500/50'
                    : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {isPro && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-brand-600 via-emerald-600 to-brand-700 text-white text-center py-1.5 text-[10px] font-extrabold uppercase tracking-widest z-10 shadow-lg overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  <div className="relative flex items-center justify-center gap-1">
                    <Star className="h-3 w-3 fill-white inline" />
                    Most Popular
                    <Star className="h-3 w-3 fill-white inline" />
                  </div>
                </div>
              )}

              {isPendingThis && (
                <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold uppercase tracking-widest shadow-lg animate-pulse">
                  ⏳ Pending
                </div>
              )}

              {isCurrent && (
                <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold uppercase tracking-widest shadow-lg">
                  ✓ Active
                </div>
              )}

              <div className={`relative bg-gradient-to-br ${gradient} text-white p-5 sm:p-6 ${isPro ? 'pt-10' : ''} overflow-hidden`}>
                <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-xl ring-2 ring-white/20 group-hover:rotate-6 transition-transform">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-2xl font-extrabold">{plan.name}</h3>
                  <p className="text-sm text-white/85 mt-1 font-semibold leading-snug">{plan.description}</p>

                  <div className="mt-5">
                    <div className="flex items-baseline gap-1">
                      <div className="text-3xl sm:text-4xl font-extrabold tabular-nums">{getPriceLabel(plan)}</div>
                      {price > 0 && <div className="text-sm text-white/80 font-bold">{intervalLabel}</div>}
                    </div>
                    {isFree && <div className="text-sm text-white/80 font-semibold mt-1">⏱️ {plan.trialDays} days trial</div>}
                    {savings && (
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-300/30 backdrop-blur-md border border-amber-200/40 text-[10px] font-extrabold text-amber-100">
                        💰 Save {formatPKR(savings.amount)} ({savings.percent.toFixed(0)}%)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div>
                  <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" /> Limits
                  </div>
                  <div className="space-y-2">
                    <FeatureRow enabled label={`${plan.maxProducts >= 999999 ? 'Unlimited' : plan.maxProducts.toLocaleString()} Products`} />
                    <FeatureRow enabled label={`${plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} Users`} />
                    <FeatureRow enabled label={`${plan.maxShops >= 999 ? 'Unlimited' : plan.maxShops} Shop${plan.maxShops > 1 ? 's' : ''}`} />
                    <FeatureRow enabled label={`${plan.maxSalesPerMonth >= 999999 ? 'Unlimited' : plan.maxSalesPerMonth.toLocaleString()} Sales/month`} />
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
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

                <div className="pt-5 border-t-2 border-slate-100 dark:border-slate-800">
                  {isCurrent ? (
                    <Button className="w-full" variant="secondary" disabled>
                      <Check className="h-4 w-4" />
                      Current Plan
                    </Button>
                  ) : isFree ? (
                    <Button className="w-full" variant="secondary" onClick={() => navigate('/billing')}>
                      Already on Trial
                    </Button>
                  ) : isPendingThis && pendingUpgrade?.invoice?.id ? (
                    <Button
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 font-extrabold"
                      onClick={() => navigate(`/billing/invoice/${pendingUpgrade.invoice.id}/pay`)}
                    >
                      <ArrowRight className="h-4 w-4" />
                      Continue Payment
                    </Button>
                  ) : (
                    <Button
                      className={`w-full shadow-lg bg-gradient-to-r ${gradient} hover:opacity-90 ${glow} font-extrabold`}
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

      {/* Trust badges */}
      <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-900/40 border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="text-center mb-5">
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Why Choose Nafaa?</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-semibold">Trusted by Pakistani shopkeepers since 2024</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <TrustCard icon={Shield} title="Secure" desc="Bank-level security & encryption" tone="emerald" />
          <TrustCard icon={Zap} title="Fast" desc="Lightning quick — even slow internet" tone="amber" />
          <TrustCard icon={MessageCircle} title="Urdu Support" desc="Roman Urdu support team" tone="violet" />
          <TrustCard icon={TrendingUp} title="500+ Shops" desc="Growing family daily" tone="rose" />
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Common Questions</h3>
        </div>
        <div className="space-y-3">
          <FAQ q="Free trial mein kya milta hai?" a="7 din full access of Pro plan — POS, inventory, reports, khata, cash register, sab kuch. Koi credit card nahi chahiye, koi hidden charges nahi." />
          <FAQ q="Payment kaise karein?" a="JazzCash, EasyPaisa, NayaPay, bank transfer, ya credit/debit card (Stripe). Manual payment ke liye admin 24 hours mein approve karta hai. Card payment turant activate hoti hai." />
          <FAQ q="Kya main plan change kar sakta hoon?" a="Haan, koi bhi waqt upgrade ya downgrade kar sakte hain. Naya plan choose karne par pichla pending automatic cancel ho jayega. Data safe rehta hai." />
          <FAQ q="Agar mujhe cancel karna ho?" a="Anytime cancel kar sakte hain. Period end tak access milta hai, phir read-only mode mein chala jata hai (data safe). Data export bhi kar sakte hain kabhi bhi." />
          <FAQ q="Yearly vs Monthly — kya farak?" a="Yearly billing pe 15% discount milta hai (Quarterly pe 5%). Har mahine same features milte hain — sirf ek dafa payment karke saal bhar ke liye peace of mind. Chhote business ke liye monthly best, established shops ke liye yearly." />
          <FAQ q="Kya data safe rehta hai plan expire hone par?" a="Bilkul safe. 90 days tak read-only access milta hai — reports dekh sakte ho, export kar sakte ho. 90 days baad backup archive me chala jata hai. Kabhi delete nahi hota — dobara subscribe karo, sab wapas activate ho jayega." />
          <FAQ q="Multiple shops ke liye kaunsa plan?" a="Pro plan me 3 shops tak, Enterprise me unlimited. Har shop ka alag inventory, staff, reports — sab centrally manage. Stock transfer bhi shops ke beech ho sakta hai." />
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

/* ═════════════════════════════════════════════════════════════
   PLANS TEACHER — Plan selection guide
   ═════════════════════════════════════════════════════════════ */
function PlansTeacher({ onClose, maxSavings }: { onClose: () => void; maxSavings: number }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-brand-300 dark:border-brand-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-brand-200 dark:border-brand-500/30 bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-500/15 dark:to-emerald-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-brand-900 dark:text-brand-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Plan Kaise Choose Karein?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>4 plans hain</strong> — chhote dukan se leke bade multi-shop business tak. Sahi plan choose karna paise bachata hai aur features unnecessary bhi nahi lete.
          </p>

          {/* Plan comparison */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Star className="h-3 w-3" /> Kis Ke Liye Kaunsa Plan?
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                ✨ <strong>Free Trial (7 din):</strong> Pehli baar try kar rahe? Pro plan ka full access. Card nahi chahiye. Perfect for testing.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                ⚡ <strong>Basic:</strong> Chhota dukan (1 shop, kam products, 1-2 staff). Basic POS + inventory + reports. Under Rs 15k monthly revenue.
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border-2 border-emerald-300 dark:border-emerald-500/50 p-2">
                🚀 <strong>Pro (Recommended):</strong> Growing business (1-3 shops, khata/udhaar, WhatsApp receipts, loyalty). 90% users ke liye best. Multi-shop support included.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                👑 <strong>Enterprise:</strong> Multi-shop chain (5+ shops, unlimited users, custom branding, 24/7 priority support). Established brands.
              </div>
            </div>
          </div>

          {/* Interval savings */}
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Billing Interval — Kitna Save?
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 p-2 flex items-center justify-between">
                <span><strong>Monthly:</strong> Base price. Flexibility max.</span>
                <span className="text-slate-500 dark:text-slate-400 font-extrabold">0%</span>
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 p-2 flex items-center justify-between">
                <span><strong>Quarterly (3 mahine):</strong> Thoda commit karo.</span>
                <span className="text-amber-700 dark:text-amber-400 font-extrabold">-5%</span>
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border-2 border-emerald-300 dark:border-emerald-500/50 p-2 flex items-center justify-between">
                <span><strong>Yearly:</strong> Best value! Ek dafa payment.</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">-15%</span>
              </div>
              {maxSavings > 0 && (
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 p-2 text-xs font-extrabold text-emerald-800 dark:text-emerald-200 text-center">
                  💰 Yearly pe max <strong className="tabular-nums">{formatPKR(maxSavings)}</strong> tak savings!
                </div>
              )}
            </div>
          </div>

          {/* Upgrade/downgrade rules */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Upgrade/Downgrade Rules
            </div>
            <TipRow><strong>⬆️ Upgrade:</strong> Anytime. Naya invoice ban jayega, pay karte hi features unlock. Pichla pending automatic cancel.</TipRow>
            <TipRow><strong>⬇️ Downgrade:</strong> Current period end tak wait karo (paisa waste na ho). Phir chhota plan pick karo.</TipRow>
            <TipRow><strong>🔄 Interval change:</strong> Monthly → Yearly anytime. Yearly → Monthly next renewal se.</TipRow>
            <TipRow><strong>❌ Cancel:</strong> Anytime. Period end tak access, phir read-only.</TipRow>
            <TipRow><strong>💾 Data:</strong> Sab safe — 90 days read-only, phir archived. Wapas subscribe = wapas restore.</TipRow>
          </div>

          {/* Pro tips */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Pro Tips
            </div>
            <TipRow><strong>🎯 Trial complete karo:</strong> 7 din me sab features test karo — usage pattern samajh me aayega.</TipRow>
            <TipRow><strong>💡 Start with Pro:</strong> 90% shops ke liye best fit. Basic sirf tab agar budget bahut tight.</TipRow>
            <TipRow><strong>📊 Yearly agar stable business:</strong> 15% saving = 2 mahine free. Big shops ke liye no-brainer.</TipRow>
            <TipRow><strong>🚀 Growth planning:</strong> Multi-shop socho? Pro le lo — future me easy upgrade.</TipRow>
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            💡 <strong>Pro tip:</strong> Confuse ho to <strong>Pro Monthly</strong> se start karo. Sab features milte hain, koi commitment nahi. 2 mahine me pata chal jata hai — phir yearly le lo aur save karo!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 font-extrabold shadow-lg shadow-brand-500/40 h-12"
            onClick={onClose}
          >
            <Rocket className="h-4 w-4" /> Samajh Gaya — Plan Choose Karo!
          </Button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}

function TrustCard({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    violet: 'from-violet-500 to-purple-700 shadow-violet-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/60 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-4 hover:border-brand-300 dark:hover:border-brand-500/50 hover:shadow-md transition group">
      <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="mt-3 font-extrabold text-slate-900 dark:text-white">{title}</h4>
      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1 leading-snug">{desc}</p>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition ${
      open
        ? 'border-brand-300 dark:border-brand-500/50 bg-brand-50/30 dark:bg-brand-500/5'
        : 'border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-500/40'
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
      >
        <span className="font-extrabold text-slate-900 dark:text-white">{q}</span>
        <ChevronRight className={`h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${open ? 'rotate-90 text-brand-600 dark:text-brand-400' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-slate-600 dark:text-slate-300 font-semibold leading-relaxed animate-in slide-in-from-top-1 duration-150">
          {a}
        </div>
      )}
    </div>
  );
}
