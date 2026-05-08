'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, Crown, Rocket, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';

const plans = [
  {
    slug: 'free-trial',
    name: 'Free Trial',
    icon: Sparkles,
    color: 'from-slate-500 to-slate-700',
    monthly: 0,
    yearly: 0,
    badge: '7 Days Free',
    description: 'Perfect to test the waters',
    features: {
      products: '30',
      users: '2',
      shops: '1',
      sales: '100/month',
    },
    list: [
      { label: 'POS Counter', has: true },
      { label: 'Barcode Scanner', has: true },
      { label: 'Khata Book', has: true },
      { label: 'Cash Register', has: true },
      { label: 'Returns', has: true },
      { label: 'Reports', has: true },
      { label: 'Discounts', has: false },
      { label: 'Loyalty Points', has: false },
      { label: 'Multi-Shop', has: false },
      { label: 'WhatsApp Receipt', has: false },
      { label: '24/7 Support', has: false },
    ],
  },
  {
    slug: 'basic',
    name: 'Basic',
    icon: Zap,
    color: 'from-blue-500 to-blue-700',
    monthly: 1500,
    yearly: 15000,
    description: 'For small shops and startups',
    features: {
      products: '500',
      users: '3',
      shops: '1',
      sales: '2,000/month',
    },
    list: [
      { label: 'POS Counter', has: true },
      { label: 'Barcode Scanner', has: true },
      { label: 'Khata Book', has: true },
      { label: 'Cash Register', has: true },
      { label: 'Returns', has: true },
      { label: 'Reports', has: true },
      { label: 'Discounts', has: true },
      { label: 'Excel/PDF Export', has: true },
      { label: 'Loyalty Points', has: false },
      { label: 'Multi-Shop', has: false },
      { label: '24/7 Support', has: false },
    ],
  },
  {
    slug: 'pro',
    name: 'Pro',
    icon: Rocket,
    color: 'from-brand-500 to-brand-700',
    monthly: 3500,
    yearly: 36000,
    popular: true,
    description: 'For growing businesses',
    features: {
      products: '5,000',
      users: '10',
      shops: '3',
      sales: '10,000/month',
    },
    list: [
      { label: 'POS Counter', has: true },
      { label: 'Barcode Scanner', has: true },
      { label: 'Khata Book', has: true },
      { label: 'Cash Register', has: true },
      { label: 'Returns', has: true },
      { label: 'Reports + Profit Analytics', has: true },
      { label: 'Discounts', has: true },
      { label: 'Loyalty Points', has: true },
      { label: 'Multi-Shop (3 branches)', has: true },
      { label: 'Stock Transfer', has: true },
      { label: 'WhatsApp Receipt', has: true },
      { label: 'Backup', has: true },
    ],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    icon: Crown,
    color: 'from-amber-500 to-amber-700',
    monthly: 9500,
    yearly: 99000,
    description: 'Unlimited everything',
    features: {
      products: 'Unlimited',
      users: 'Unlimited',
      shops: 'Unlimited',
      sales: 'Unlimited',
    },
    list: [
      { label: 'Everything in Pro', has: true },
      { label: 'Unlimited Products', has: true },
      { label: 'Unlimited Users', has: true },
      { label: 'Unlimited Shops', has: true },
      { label: '24/7 Priority Support', has: true },
      { label: 'Custom Branding', has: true },
      { label: 'Dedicated Account Manager', has: true },
      { label: 'Custom Integrations', has: true },
      { label: 'API Access', has: true },
      { label: 'On-Premise Deployment', has: true },
    ],
  },
];

export function PricingClient() {
  const { t } = useLocale();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  const formatPrice = (m: number, y: number) => {
    if (m === 0) return 'Free';
    return `Rs ${(interval === 'monthly' ? m : Math.round(y / 12)).toLocaleString()}`;
  };

  return (
    <Container className="relative">
      {/* Toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex bg-slate-100 dark:bg-slate-900 rounded-2xl p-1 border border-slate-200 dark:border-slate-800">
          {(['monthly', 'yearly'] as const).map((i) => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className={cn(
                'px-6 py-2.5 rounded-xl text-sm font-bold transition-all',
                interval === i
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400',
              )}
            >
              {i === 'monthly' ? t('pricing.monthly') : t('pricing.yearly')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
        {plans.map((plan, idx) => {
          const Icon = plan.icon;
          const isPro = plan.popular;
          return (
            <motion.div
              key={plan.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className={cn(
                'relative rounded-3xl bg-white dark:bg-slate-900 border-2 overflow-hidden transition-all hover:shadow-2xl',
                isPro
                  ? 'border-brand-500 lg:scale-105 shadow-xl shadow-brand-500/20'
                  : 'border-slate-200 dark:border-slate-800',
              )}
            >
              {isPro && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-brand-600 to-emerald-600 text-white text-center py-1.5 text-xs font-bold tracking-wider">
                  ⭐ {t('pricing.popular')}
                </div>
              )}
              {plan.badge && !isPro && (
                <div className="absolute top-4 right-4">
                  <Badge variant="accent">{plan.badge}</Badge>
                </div>
              )}

              <div className={cn('p-6', isPro && 'pt-12')}>
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mt-5 text-2xl font-extrabold">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>

                <div className="mt-5">
                  <div className="text-4xl font-extrabold">{formatPrice(plan.monthly, plan.yearly)}</div>
                  {plan.monthly > 0 && (
                    <div className="text-sm text-slate-500 mt-0.5">
                      {t('pricing.per_month')}{' '}
                      {interval === 'yearly' && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                          (billed yearly)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  size="md"
                  className="mt-6 w-full"
                  variant={isPro ? 'primary' : 'secondary'}
                  href={`${APP_URL}/register?plan=${plan.slug}`}
                >
                  {plan.monthly === 0 ? 'Start Free Trial' : t('pricing.cta')}
                </Button>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">Limits</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2.5">
                      <div className="text-slate-500">Products</div>
                      <div className="font-bold mt-0.5">{plan.features.products}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2.5">
                      <div className="text-slate-500">Users</div>
                      <div className="font-bold mt-0.5">{plan.features.users}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2.5">
                      <div className="text-slate-500">Shops</div>
                      <div className="font-bold mt-0.5">{plan.features.shops}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2.5">
                      <div className="text-slate-500">Sales</div>
                      <div className="font-bold mt-0.5">{plan.features.sales}</div>
                    </div>
                  </div>

                  <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mt-5 mb-3">Features</div>
                  <ul className="space-y-2">
                    {plan.list.map((f) => (
                      <li key={f.label} className="flex items-center gap-2 text-sm">
                        {f.has ? (
                          <Check className="h-4 w-4 text-brand-600 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-slate-300 dark:text-slate-700 flex-shrink-0" />
                        )}
                        <span className={cn(f.has ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 line-through')}>
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Money back */}
      <div className="mt-16 max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          🛡️ 30-day money-back guarantee — no questions asked
        </div>
        <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm">
          Need a custom plan? <a href="/contact" className="text-brand-600 font-semibold hover:underline">Contact our sales team</a>
        </p>
      </div>
    </Container>
  );
}
