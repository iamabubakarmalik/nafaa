import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles, Package, Users, Building2, ShoppingCart, Check, X, ArrowRight,
  Crown, TrendingUp, AlertTriangle, CheckCircle2, Award, Zap, Rocket,
  RefreshCw, BarChart3, Receipt, BookOpen, Wallet, RotateCcw, Bell,
  Activity, Tag, Star, ArrowLeftRight, Download, Save, MessageCircle,
  Palette, Shield, Infinity as InfinityIcon, Lock, ChevronRight,
} from 'lucide-react';
import { planUsageApi } from '@/api/plan-usage.api';
import { Button } from '@/components/ui/Button';

const formatNum = (n: number) => n.toLocaleString('en-PK');

interface UsageCardProps {
  label: string;
  current: number;
  limit: number;
  icon: any;
  color: string;
}

const UsageCard = ({ label, current, limit, icon: Icon, color }: UsageCardProps) => {
  const isUnlimited = limit >= 999999;
  const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);
  const danger = percentage >= 90;
  const warning = percentage >= 75 && percentage < 90;
  const healthy = percentage < 75;

  const colors: Record<string, { gradient: string; ring: string; bar: string; bg: string }> = {
    emerald: {
      gradient: 'from-emerald-500 to-green-600',
      ring: 'shadow-emerald-500/30',
      bar: 'bg-emerald-500',
      bg: 'bg-emerald-50',
    },
    blue: {
      gradient: 'from-blue-500 to-blue-700',
      ring: 'shadow-blue-500/30',
      bar: 'bg-blue-500',
      bg: 'bg-blue-50',
    },
    violet: {
      gradient: 'from-violet-500 to-purple-600',
      ring: 'shadow-violet-500/30',
      bar: 'bg-violet-500',
      bg: 'bg-violet-50',
    },
    amber: {
      gradient: 'from-amber-500 to-orange-600',
      ring: 'shadow-amber-500/30',
      bar: 'bg-amber-500',
      bg: 'bg-amber-50',
    },
  };

  const c = colors[color] || colors.emerald;

  return (
    <div className={`relative overflow-hidden rounded-3xl border-2 transition-all hover:-translate-y-1 hover:shadow-xl ${
      danger
        ? 'border-rose-300 bg-gradient-to-br from-rose-50 to-pink-50'
        : warning
        ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50'
        : 'border-slate-200 bg-white hover:border-brand-300'
    }`}>
      {/* Background glow */}
      <div className={`absolute -top-8 -right-8 h-32 w-32 rounded-full ${c.bg} blur-2xl opacity-50`} />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${c.gradient} text-white flex items-center justify-center shadow-lg ${c.ring} shrink-0`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                {danger ? 'Critical' : warning ? 'Warning' : 'Healthy'}
              </div>
              <div className="font-extrabold text-slate-900 text-sm">{label}</div>
            </div>
          </div>

          {/* Status badge */}
          {isUnlimited ? (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wider">
              <InfinityIcon className="h-2.5 w-2.5" />
              Unlimited
            </div>
          ) : danger ? (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[9px] font-extrabold uppercase tracking-wider animate-pulse">
              <AlertTriangle className="h-2.5 w-2.5" />
              Limit!
            </div>
          ) : warning ? (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase tracking-wider">
              <AlertTriangle className="h-2.5 w-2.5" />
              {percentage.toFixed(0)}%
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wider">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {percentage.toFixed(0)}%
            </div>
          )}
        </div>

        {/* Numbers */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            <div className={`text-3xl font-extrabold tabular-nums ${
              danger ? 'text-rose-700' : warning ? 'text-amber-700' : 'text-slate-900'
            }`}>
              {formatNum(current)}
            </div>
            {!isUnlimited && (
              <div className="text-sm text-slate-500 font-bold">
                / {formatNum(limit)}
              </div>
            )}
          </div>
          {!isUnlimited && (
            <div className="text-[10px] text-slate-500 font-bold mt-0.5">
              {formatNum(limit - current)} remaining
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!isUnlimited && (
          <div className="space-y-1.5">
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  danger ? 'bg-gradient-to-r from-rose-500 to-rose-600' :
                  warning ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                  `bg-gradient-to-r ${c.gradient}`
                }`}
                style={{ width: `${Math.max(percentage, 3)}%` }}
              />
            </div>

            {danger && (
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-rose-700">
                <AlertTriangle className="h-3 w-3" />
                Upgrade karein varna add nahi hoga
              </div>
            )}
            {warning && (
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-700">
                <TrendingUp className="h-3 w-3" />
                Limit ke kareeb pohanch rahay hain
              </div>
            )}
          </div>
        )}

        {isUnlimited && (
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700">
            <Sparkles className="h-3 w-3" />
            No limits — grow freely
          </div>
        )}
      </div>
    </div>
  );
};

interface FeatureItemProps {
  enabled: boolean;
  label: string;
  icon: any;
  description?: string;
}

const FeatureItem = ({ enabled, label, icon: Icon, description }: FeatureItemProps) => (
  <div className={`group relative rounded-xl border-2 p-3 transition-all ${
    enabled
      ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400 hover:shadow-md'
      : 'border-slate-200 bg-slate-50/50 opacity-70 hover:opacity-100'
  }`}>
    <div className="flex items-start gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
        enabled
          ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30'
          : 'bg-slate-200 text-slate-400'
      }`}>
        {enabled ? <Icon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold text-sm ${enabled ? 'text-slate-900' : 'text-slate-500'}`}>
            {label}
          </span>
          {enabled && <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />}
        </div>
        {description && (
          <div className={`text-[10px] mt-0.5 font-semibold ${enabled ? 'text-slate-600' : 'text-slate-400'}`}>
            {description}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default function PlanUsagePage() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['plan-usage'],
    queryFn: planUsageApi.me,
  });

  // Compute summary stats
  const summary = useMemo(() => {
    if (!data) return null;
    const u = data.usage;
    const limits = [
      { current: u.products.current, limit: u.products.limit },
      { current: u.users.current, limit: u.users.limit },
      { current: u.shops.current, limit: u.shops.limit },
      { current: u.salesThisMonth.current, limit: u.salesThisMonth.limit },
    ];

    let critical = 0;
    let warning = 0;
    let unlimited = 0;
    limits.forEach(({ current, limit }) => {
      if (limit >= 999999) {
        unlimited++;
      } else {
        const pct = (current / limit) * 100;
        if (pct >= 90) critical++;
        else if (pct >= 75) warning++;
      }
    });

    const features = data.features;
    const enabledCount = Object.values(features).filter(Boolean).length;
    const totalFeatures = Object.values(features).length;

    return {
      critical,
      warning,
      unlimited,
      enabledCount,
      totalFeatures,
      featurePct: Math.round((enabledCount / totalFeatures) * 100),
    };
  }, [data]);

  if (isLoading || !data || !summary) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Feature groups
  const coreFeatures = [
    { key: 'pos', label: 'POS Counter', icon: ShoppingCart, desc: 'Point of sale system' },
    { key: 'barcodeScanner', label: 'Barcode Scanner', icon: Activity, desc: 'Quick scan products' },
    { key: 'cashRegister', label: 'Cash Register', icon: Wallet, desc: 'Open/close shifts' },
    { key: 'returns', label: 'Returns', icon: RotateCcw, desc: 'Process refunds' },
  ];

  const creditFeatures = [
    { key: 'khata', label: 'Khata (Udhaar)', icon: BookOpen, desc: 'Customer credit ledger' },
    { key: 'discounts', label: 'Discount Codes', icon: Tag, desc: 'Promotional codes' },
    { key: 'loyalty', label: 'Loyalty Points', icon: Star, desc: 'Reward customers' },
    { key: 'whatsappReceipt', label: 'WhatsApp Receipt', icon: MessageCircle, desc: 'Send via WhatsApp' },
  ];

  const advancedFeatures = [
    { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, desc: 'Sales insights' },
    { key: 'profitReport', label: 'Profit by Product', icon: TrendingUp, desc: 'Margin analysis' },
    { key: 'multiShop', label: 'Multi-Shop', icon: Building2, desc: 'Branch management' },
    { key: 'stockTransfer', label: 'Stock Transfer', icon: ArrowLeftRight, desc: 'Move between shops' },
  ];

  const proFeatures = [
    { key: 'notifications', label: 'Smart Notifications', icon: Bell, desc: 'Real-time alerts' },
    { key: 'exports', label: 'Excel/PDF Exports', icon: Download, desc: 'Data exports' },
    { key: 'backup', label: 'Backup & Restore', icon: Save, desc: 'Data protection' },
    { key: 'customBranding', label: 'Custom Branding', icon: Palette, desc: 'Logo on receipts' },
    { key: 'support24x7', label: '24/7 Priority Support', icon: Shield, desc: 'Always available' },
  ];

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/15">
              <Award className="h-3.5 w-3.5 text-amber-300" />
              Plan Usage Dashboard
            </div>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                {data.plan.name}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-extrabold shadow-lg">
                <Crown className="h-3 w-3 fill-amber-950" />
                ACTIVE
              </div>
            </div>
            <p className="mt-2 text-sm text-white/80 max-w-2xl">
              Aap ke account ka real-time usage track karein aur features explore karein
            </p>

            {/* Quick stats strip */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur border border-white/15">
                <Sparkles className="h-3 w-3 text-emerald-300" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  {summary.enabledCount}/{summary.totalFeatures} Features
                </span>
              </div>
              {summary.critical > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/30 backdrop-blur border border-rose-300/40 animate-pulse">
                  <AlertTriangle className="h-3 w-3 text-rose-200" />
                  <span className="text-[10px] font-extrabold text-white">
                    {summary.critical} at limit
                  </span>
                </div>
              )}
              {summary.warning > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/30 backdrop-blur border border-amber-300/40">
                  <TrendingUp className="h-3 w-3 text-amber-200" />
                  <span className="text-[10px] font-extrabold text-white">
                    {summary.warning} warning
                  </span>
                </div>
              )}
              {summary.unlimited > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/30 backdrop-blur border border-emerald-300/40">
                  <InfinityIcon className="h-3 w-3 text-emerald-200" />
                  <span className="text-[10px] font-extrabold text-white">
                    {summary.unlimited} unlimited
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap shrink-0">
            <Button
              onClick={() => refetch()}
              variant="secondary"
              className="bg-white/15 hover:bg-white/25 text-white border-white/20 backdrop-blur"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/plan">
              <Button className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
                <Rocket className="h-4 w-4" />
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ CRITICAL ALERT ═══ */}
      {summary.critical > 0 && (
        <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-300 p-5 shadow-lg flex items-start gap-4 flex-wrap">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0 animate-pulse">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-rose-700 mb-1">
              Critical — Limit Reached
            </div>
            <h3 className="font-extrabold text-rose-900 text-lg">
              {summary.critical} limit{summary.critical > 1 ? 's' : ''} 90%+ — Upgrade karein!
            </h3>
            <p className="text-xs text-rose-800 mt-1 font-semibold">
              Aap ki dukan tezi se barh rahi hai. Higher plan choose karein aur bina ruke kaam karein.
            </p>
          </div>
          <Link to="/plan" className="shrink-0">
            <Button className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-lg shadow-rose-500/30">
              <Rocket className="h-4 w-4" />
              Upgrade Now
            </Button>
          </Link>
        </div>
      )}

      {/* ═══ USAGE LIMITS ═══ */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Usage Limits</h3>
              <p className="text-sm text-slate-500 font-semibold">Real-time tracking</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <UsageCard
            label="Products"
            current={data.usage.products.current}
            limit={data.usage.products.limit}
            icon={Package}
            color="emerald"
          />
          <UsageCard
            label="Team Users"
            current={data.usage.users.current}
            limit={data.usage.users.limit}
            icon={Users}
            color="blue"
          />
          <UsageCard
            label="Shops / Branches"
            current={data.usage.shops.current}
            limit={data.usage.shops.limit}
            icon={Building2}
            color="violet"
          />
          <UsageCard
            label="Sales (this month)"
            current={data.usage.salesThisMonth.current}
            limit={data.usage.salesThisMonth.limit}
            icon={ShoppingCart}
            color="amber"
          />
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Available Features</h3>
              <p className="text-sm text-slate-500 font-semibold">
                <span className="text-emerald-700 font-extrabold">{summary.enabledCount}</span> of {summary.totalFeatures} enabled ({summary.featurePct}%)
              </p>
            </div>
          </div>

          {/* Feature progress */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-slate-200 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-700"
                style={{ width: `${summary.featurePct}%` }}
              />
            </div>
            <span className="text-xs font-extrabold text-slate-700">{summary.featurePct}%</span>
          </div>
        </div>

        <div className="space-y-5">
          {/* Core */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-emerald-50 to-green-50 border-b-2 border-emerald-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-700" />
                <h4 className="font-extrabold text-emerald-900 text-sm">Core Sales Features</h4>
              </div>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-2">
              {coreFeatures.map((f) => (
                <FeatureItem
                  key={f.key}
                  enabled={(data.features as any)[f.key]}
                  label={f.label}
                  icon={f.icon}
                  description={f.desc}
                />
              ))}
            </div>
          </div>

          {/* Credit & Loyalty */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-700" />
                <h4 className="font-extrabold text-amber-900 text-sm">Customer & Loyalty</h4>
              </div>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-2">
              {creditFeatures.map((f) => (
                <FeatureItem
                  key={f.key}
                  enabled={(data.features as any)[f.key]}
                  label={f.label}
                  icon={f.icon}
                  description={f.desc}
                />
              ))}
            </div>
          </div>

          {/* Advanced */}
          <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-700" />
                <h4 className="font-extrabold text-blue-900 text-sm">Advanced & Multi-Shop</h4>
              </div>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-2">
              {advancedFeatures.map((f) => (
                <FeatureItem
                  key={f.key}
                  enabled={(data.features as any)[f.key]}
                  label={f.label}
                  icon={f.icon}
                  description={f.desc}
                />
              ))}
            </div>
          </div>

          {/* Pro */}
          <div className="rounded-3xl bg-white border-2 border-violet-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-violet-700" />
                <h4 className="font-extrabold text-violet-900 text-sm">Premium & Enterprise</h4>
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[9px] font-extrabold uppercase tracking-wider">
                  Pro+
                </span>
              </div>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-2">
              {proFeatures.map((f) => (
                <FeatureItem
                  key={f.key}
                  enabled={(data.features as any)[f.key]}
                  label={f.label}
                  icon={f.icon}
                  description={f.desc}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ UPGRADE CTA ═══ */}
      {summary.enabledCount < summary.totalFeatures && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-emerald-700 text-white p-6 sm:p-8 shadow-2xl">
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-xl ring-2 ring-white/20 shrink-0">
                <Rocket className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300/40 mb-1">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                  Unlock More
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold">
                  {summary.totalFeatures - summary.enabledCount} aur features available
                </h3>
                <p className="text-sm text-white/80 mt-1 font-semibold">
                  Apni dukan ko aur tezi se barhayein — premium features unlock karein
                </p>
              </div>
            </div>
            <Link to="/plan" className="shrink-0">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl">
                <Crown className="h-4 w-4" />
                See All Plans
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ═══ ALREADY UNLIMITED ═══ */}
      {summary.enabledCount === summary.totalFeatures && summary.unlimited === 4 && (
        <section className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 p-6 shadow-lg">
          <div className="text-center">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/40 mb-3">
              <Crown className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-extrabold text-emerald-900">🎉 You're on the Best Plan!</h3>
            <p className="text-sm text-emerald-700 mt-1 font-semibold max-w-md mx-auto">
              All features unlocked aur unlimited usage — apni dukan grow karte rahein!
            </p>
          </div>
        </section>
      )}
    </div>
  );
}