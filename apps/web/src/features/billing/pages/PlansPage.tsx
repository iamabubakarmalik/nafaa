import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, Sparkles, Crown, Rocket, Zap, ArrowRight,
} from 'lucide-react';
import { plansApi, type Plan } from '@/api/plans.api';
import { subscriptionsApi, type BillingInterval } from '@/api/subscriptions.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';

const planIcons: Record<string, any> = {
  'free-trial': Sparkles,
  basic: Zap,
  pro: Rocket,
  enterprise: Crown,
};

const planColors: Record<string, string> = {
  'free-trial': 'from-slate-500 to-slate-700',
  basic: 'from-blue-500 to-blue-700',
  pro: 'from-brand-500 to-brand-700',
  enterprise: 'from-amber-500 to-amber-700',
};

interface FeatureRowProps {
  enabled: boolean;
  label: string;
}

const FeatureRow = ({ enabled, label }: FeatureRowProps) => (
  <div className="flex items-center gap-2 text-sm">
    {enabled ? (
      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
    ) : (
      <X className="h-4 w-4 text-slate-300 flex-shrink-0" />
    )}
    <span className={enabled ? 'text-slate-700' : 'text-slate-400 line-through'}>{label}</span>
  </div>
);

export default function PlansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });

  const { data: current } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: subscriptionsApi.current,
  });

  const startMutation = useMutation({
    mutationFn: ({ planId, interval }: { planId: string; interval: BillingInterval }) =>
      subscriptionsApi.start(planId, interval),
    onSuccess: (data) => {
      toast.success('Plan selected! Ab payment karein');
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      navigate(`/billing/invoice/${data.invoice.id}/pay`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Subscribe fail'),
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

  const intervalLabel = {
    MONTHLY: '/month',
    QUARTERLY: '/3 months',
    YEARLY: '/year',
  }[interval];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white p-8 shadow-soft text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-accent-500" />
          Choose Your Plan
        </div>
        <h2 className="mt-4 text-4xl font-bold">Apna business agay barhao</h2>
        <p className="mt-3 text-white/80 max-w-2xl mx-auto">
          Pakistan ke shopkeepers ke liye banaya gaya. Free trial — 7 din, koi credit card nahi chahiye.
        </p>

        <div className="mt-6 inline-flex bg-white/10 rounded-2xl p-1">
          {(['MONTHLY', 'QUARTERLY', 'YEARLY'] as BillingInterval[]).map((i) => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${
                interval === i ? 'bg-white text-slate-900' : 'text-white/80 hover:text-white'
              }`}
            >
              {i === 'MONTHLY' && 'Monthly'}
              {i === 'QUARTERLY' && 'Quarterly'}
              {i === 'YEARLY' && 'Yearly (save 15%)'}
            </button>
          ))}
        </div>
      </section>

      {current && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-semibold text-emerald-900">
              Current Plan: {current.plan.name}
            </div>
            <div className="text-sm text-emerald-700">
              Status: {current.status} • Expires:{' '}
              {new Date(current.currentPeriodEnd).toLocaleDateString('en-PK')}
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate('/billing')}>
            View Billing
          </Button>
        </div>
      )}

      <section className="grid lg:grid-cols-4 md:grid-cols-2 gap-5">
        {plans.map((plan) => {
          const Icon = planIcons[plan.slug] || Sparkles;
          const colorGrad = planColors[plan.slug] || 'from-slate-500 to-slate-700';
          const isCurrent = current?.plan.id === plan.id;
          const isPro = plan.slug === 'pro';
          const price = getPrice(plan);

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl bg-white border-2 shadow-sm overflow-hidden transition hover:shadow-soft ${
                isPro ? 'border-brand-500 lg:scale-105' : 'border-slate-200'
              }`}
            >
              {isPro && (
                <div className="absolute top-0 left-0 right-0 bg-brand-600 text-white text-center py-1 text-xs font-bold">
                  ⭐ MOST POPULAR
                </div>
              )}

              <div className={`bg-gradient-to-br ${colorGrad} text-white p-6 ${isPro ? 'pt-10' : ''}`}>
                <Icon className="h-10 w-10" />
                <h3 className="mt-4 text-2xl font-bold">{plan.name}</h3>
                <p className="text-sm text-white/80 mt-1">{plan.description}</p>

                <div className="mt-5">
                  <div className="text-4xl font-bold">{getPriceLabel(plan)}</div>
                  {price > 0 && (
                    <div className="text-sm text-white/80">{intervalLabel}</div>
                  )}
                  {plan.priceMonthly === 0 && (
                    <div className="text-sm text-white/80">{plan.trialDays} days trial</div>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-2.5">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Limits
                </div>
                <FeatureRow enabled={true} label={`${plan.maxProducts >= 999999 ? 'Unlimited' : plan.maxProducts} Products`} />
                <FeatureRow enabled={true} label={`${plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} Users`} />
                <FeatureRow enabled={true} label={`${plan.maxShops >= 999 ? 'Unlimited' : plan.maxShops} Shop${plan.maxShops > 1 ? 's' : ''}`} />
                <FeatureRow enabled={true} label={`${plan.maxSalesPerMonth >= 999999 ? 'Unlimited' : plan.maxSalesPerMonth} Sales/month`} />

                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2">
                  Features
                </div>
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

                <div className="pt-4 border-t border-slate-100 mt-4">
                  {isCurrent ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Current Plan
                    </Button>
                  ) : plan.priceMonthly === 0 ? (
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => navigate('/billing')}
                    >
                      Already on Trial
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${isPro ? 'bg-brand-600 hover:bg-brand-700' : ''}`}
                      loading={startMutation.isPending}
                      onClick={() => startMutation.mutate({ planId: plan.id, interval })}
                    >
                      Subscribe Now
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
