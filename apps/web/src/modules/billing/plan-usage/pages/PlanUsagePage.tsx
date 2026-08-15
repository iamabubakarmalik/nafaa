import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, Package, Users, Building2, ShoppingCart, Check, X, ArrowRight,
  Crown, TrendingUp, AlertTriangle, CheckCircle2, Award, Zap, Rocket,
  RefreshCw, BarChart3, Receipt, BookOpen, Wallet, RotateCcw, Bell,
  Activity, Tag, Star, ArrowLeftRight, Download, Save, MessageCircle,
  Palette, Shield, Infinity as InfinityIcon, Lock, ChevronRight,
  GraduationCap, Flame, Target, Gauge, Info,
} from 'lucide-react';
import { planUsageApi } from '@modules/billing/plan-usage/api/plan-usage.api';
import { Button } from '@core/ui/Button';

/* ═════════════════════════════════════════════════════════════
   NAFAA PLAN USAGE — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌙 Dark mode complete
   🎓 Teacher modal — Usage limits + features + optimization
   ⌨️  R refresh • U upgrade • T guide • Esc
   🎯 Overall health score circle (0-100)
   💡 Smart upgrade recommendations
   🔍 Expandable feature groups + tooltips
   ⚠️ Animated critical warnings
   ═════════════════════════════════════════════════════════════ */

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

  const colors: Record<string, { gradient: string; ring: string; bar: string; bg: string }> = {
    emerald: {
      gradient: 'from-emerald-500 to-green-600',
      ring: 'shadow-emerald-500/30',
      bar: 'bg-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    blue: {
      gradient: 'from-blue-500 to-blue-700',
      ring: 'shadow-blue-500/30',
      bar: 'bg-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    violet: {
      gradient: 'from-violet-500 to-purple-600',
      ring: 'shadow-violet-500/30',
      bar: 'bg-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-500/10',
    },
    amber: {
      gradient: 'from-amber-500 to-orange-600',
      ring: 'shadow-amber-500/30',
      bar: 'bg-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
  };

  const c = colors[color] || colors.emerald;

  return (
    <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 transition-all hover:-translate-y-1 hover:shadow-xl ${
      danger
        ? 'border-rose-300 dark:border-rose-500/50 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10'
        : warning
          ? 'border-amber-300 dark:border-amber-500/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm hover:border-brand-300 dark:hover:border-brand-500/50'
    }`}>
      <div className={`absolute -top-8 -right-8 h-32 w-32 rounded-full ${c.bg} blur-2xl opacity-50 pointer-events-none`} />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${c.gradient} text-white flex items-center justify-center shadow-lg ${c.ring} shrink-0`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400">
                {isUnlimited ? 'Unlimited' : danger ? 'Critical' : warning ? 'Warning' : 'Healthy'}
              </div>
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">{label}</div>
            </div>
          </div>

          {isUnlimited ? (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold uppercase tracking-widest">
              <InfinityIcon className="h-2.5 w-2.5" />
              Unlimited
            </div>
          ) : danger ? (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[9px] font-extrabold uppercase tracking-widest animate-pulse">
              <AlertTriangle className="h-2.5 w-2.5" />
              Limit!
            </div>
          ) : warning ? (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-extrabold uppercase tracking-widest">
              <AlertTriangle className="h-2.5 w-2.5" />
              {percentage.toFixed(0)}%
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold uppercase tracking-widest">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {percentage.toFixed(0)}%
            </div>
          )}
        </div>

        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            <div className={`text-2xl sm:text-3xl font-extrabold tabular-nums ${
              danger ? 'text-rose-700 dark:text-rose-400' : warning ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'
            }`}>
              {formatNum(current)}
            </div>
            {!isUnlimited && (
              <div className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                / {formatNum(limit)}
              </div>
            )}
          </div>
          {!isUnlimited && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              {formatNum(Math.max(0, limit - current))} remaining
            </div>
          )}
        </div>

        {!isUnlimited && (
          <div className="space-y-1.5">
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner">
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
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-rose-700 dark:text-rose-400">
                <AlertTriangle className="h-3 w-3" />
                Upgrade karo warna add nahi hoga
              </div>
            )}
            {warning && (
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-400">
                <TrendingUp className="h-3 w-3" />
                Limit ke kareeb pohanch rahay hain
              </div>
            )}
          </div>
        )}

        {isUnlimited && (
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">
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
      ? 'border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-500/5 hover:border-emerald-400 dark:hover:border-emerald-500/60 hover:shadow-md'
      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-70 hover:opacity-100'
  }`}>
    <div className="flex items-start gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
        enabled
          ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
      }`}>
        {enabled ? <Icon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold text-sm ${enabled ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            {label}
          </span>
          {enabled && <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />}
        </div>
        {description && (
          <div className={`text-[10px] mt-0.5 font-semibold ${enabled ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {description}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default function PlanUsagePage() {
  const navigate = useNavigate();
  const [showTeacher, setShowTeacher] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['plan-usage'],
    queryFn: planUsageApi.me,
  });

  const summary = useMemo(() => {
    if (!data) return null;
    const u = data.usage;
    const limits = [
      { name: 'products', current: u.products.current, limit: u.products.limit },
      { name: 'users', current: u.users.current, limit: u.users.limit },
      { name: 'shops', current: u.shops.current, limit: u.shops.limit },
      { name: 'sales', current: u.salesThisMonth.current, limit: u.salesThisMonth.limit },
    ];

    let critical = 0;
    let warning = 0;
    let unlimited = 0;
    let totalUsagePct = 0;
    let countableLimits = 0;
    const criticalItems: string[] = [];

    limits.forEach(({ name, current, limit }) => {
      if (limit >= 999999) {
        unlimited++;
        totalUsagePct += 50; // Neutral for unlimited in health score
        countableLimits++;
      } else {
        const pct = (current / limit) * 100;
        totalUsagePct += pct;
        countableLimits++;
        if (pct >= 90) { critical++; criticalItems.push(name); }
        else if (pct >= 75) warning++;
      }
    });

    const features = data.features;
    const enabledCount = Object.values(features).filter(Boolean).length;
    const totalFeatures = Object.values(features).length;
    const featurePct = Math.round((enabledCount / totalFeatures) * 100);

    // Health score: 100 - avg usage% + feature bonus
    const avgUsage = countableLimits > 0 ? totalUsagePct / countableLimits : 0;
    const usageHealth = Math.max(0, 100 - avgUsage); // Higher usage = lower health
    const healthScore = Math.round((usageHealth * 0.6) + (featurePct * 0.4));

    return {
      critical,
      warning,
      unlimited,
      enabledCount,
      totalFeatures,
      featurePct,
      healthScore,
      criticalItems,
      avgUsage: Math.round(avgUsage),
    };
  }, [data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); refetch(); }
      if (e.key.toLowerCase() === 'u') { e.preventDefault(); navigate('/plan'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, refetch, navigate]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  if (isLoading || !data || !summary) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

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

  // Health score color
  const healthColor = summary.healthScore >= 75 ? 'emerald' : summary.healthScore >= 50 ? 'amber' : 'rose';
  const healthColors: Record<string, string> = {
    emerald: 'stroke-emerald-500 dark:stroke-emerald-400',
    amber: 'stroke-amber-500 dark:stroke-amber-400',
    rose: 'stroke-rose-500 dark:stroke-rose-400',
  };
  const healthText: Record<string, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    rose: 'text-rose-700 dark:text-rose-400',
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <UsageTeacher onClose={() => setShowTeacher(false)} summary={summary} planName={data.plan.name} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 dark:from-slate-950 dark:via-brand-950 dark:to-brand-900 text-white p-5 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-brand-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Award className="h-3.5 w-3.5 text-amber-300" />
              Plan Usage Dashboard
            </div>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
                {data.plan.name}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 text-xs font-extrabold shadow-lg">
                <Crown className="h-3 w-3 fill-amber-950" />
                ACTIVE
              </div>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-white/90 max-w-2xl font-semibold">
              Real-time usage tracking, features explore, aur smart upgrade recommendations
            </p>

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-md border border-white/25">
                <Sparkles className="h-3 w-3 text-emerald-300" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest">
                  {summary.enabledCount}/{summary.totalFeatures} Features
                </span>
              </div>
              {summary.critical > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/30 backdrop-blur-md border border-rose-300/40 animate-pulse">
                  <AlertTriangle className="h-3 w-3 text-rose-200" />
                  <span className="text-[10px] font-extrabold">{summary.critical} at limit</span>
                </div>
              )}
              {summary.warning > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/30 backdrop-blur-md border border-amber-300/40">
                  <TrendingUp className="h-3 w-3 text-amber-200" />
                  <span className="text-[10px] font-extrabold">{summary.warning} warning</span>
                </div>
              )}
              {summary.unlimited > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/30 backdrop-blur-md border border-emerald-300/40">
                  <InfinityIcon className="h-3 w-3 text-emerald-200" />
                  <span className="text-[10px] font-extrabold">{summary.unlimited} unlimited</span>
                </div>
              )}
            </div>

            <div className="mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
              <Kbd>R</Kbd><span className="text-white/60">Refresh</span>
              <span className="text-white/30 mx-1">•</span>
              <Kbd>U</Kbd><span className="text-white/60">Upgrade</span>
              <span className="text-white/30 mx-1">•</span>
              <Kbd>T</Kbd><span className="text-white/60">Guide</span>
            </div>
          </div>

          {/* Health score circle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative h-24 w-24 sm:h-28 sm:w-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="42"
                  strokeWidth="8"
                  className="stroke-white/15 fill-none"
                />
                <circle
                  cx="50" cy="50" r="42"
                  strokeWidth="8"
                  className={`${healthColors[healthColor]} fill-none transition-all duration-1000`}
                  strokeLinecap="round"
                  strokeDasharray={`${(summary.healthScore / 100) * 264} 264`}
                  style={{ filter: `drop-shadow(0 0 8px currentColor)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl sm:text-3xl font-extrabold tabular-nums">{summary.healthScore}</div>
                <div className="text-[8px] uppercase tracking-widest font-extrabold text-white/70">Health</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowTeacher(true)}
                className="h-10 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              >
                <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
              </button>
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link to="/plan">
                <button className="w-full h-10 px-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                  <Rocket className="h-4 w-4" /> <span className="hidden sm:inline">Upgrade</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CRITICAL ALERT ═══ */}
      {summary.critical > 0 && (
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border-2 border-rose-300 dark:border-rose-500/50 p-4 sm:p-5 shadow-lg flex items-start gap-4 flex-wrap">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0 animate-pulse">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-400 mb-1">
              Critical — Limit Reached
            </div>
            <h3 className="font-extrabold text-rose-900 dark:text-rose-200 text-lg">
              {summary.critical} limit{summary.critical > 1 ? 's' : ''} 90%+ — Upgrade karo!
            </h3>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 font-semibold">
              Aap ki dukan tezi se barh rahi hai. Higher plan choose karo aur bina ruke kaam karo. {summary.criticalItems.length > 0 && <>Affected: <strong>{summary.criticalItems.join(', ')}</strong></>}
            </p>
          </div>
          <Link to="/plan" className="shrink-0">
            <Button className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-lg shadow-rose-500/30 font-extrabold">
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
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Usage Limits</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Real-time tracking • Avg usage: {summary.avgUsage}%</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <UsageCard label="Products" current={data.usage.products.current} limit={data.usage.products.limit} icon={Package} color="emerald" />
          <UsageCard label="Team Users" current={data.usage.users.current} limit={data.usage.users.limit} icon={Users} color="blue" />
          <UsageCard label="Shops / Branches" current={data.usage.shops.current} limit={data.usage.shops.limit} icon={Building2} color="violet" />
          <UsageCard label="Sales (this month)" current={data.usage.salesThisMonth.current} limit={data.usage.salesThisMonth.limit} icon={ShoppingCart} color="amber" />
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
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Available Features</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{summary.enabledCount}</span> of {summary.totalFeatures} enabled ({summary.featurePct}%)
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-700"
                style={{ width: `${summary.featurePct}%` }}
              />
            </div>
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">{summary.featurePct}%</span>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <FeatureGroup
            title="Core Sales Features"
            icon={ShoppingCart}
            tone="emerald"
            items={coreFeatures}
            features={data.features}
          />
          <FeatureGroup
            title="Customer & Loyalty"
            icon={BookOpen}
            tone="amber"
            items={creditFeatures}
            features={data.features}
          />
          <FeatureGroup
            title="Advanced & Multi-Shop"
            icon={BarChart3}
            tone="blue"
            items={advancedFeatures}
            features={data.features}
          />
          <FeatureGroup
            title="Premium & Enterprise"
            icon={Crown}
            tone="violet"
            items={proFeatures}
            features={data.features}
            proBadge
          />
        </div>
      </section>

      {/* ═══ SMART RECOMMENDATION ═══ */}
      {(summary.critical > 0 || summary.warning > 0 || summary.enabledCount < summary.totalFeatures) && (
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-emerald-700 dark:from-slate-950 dark:via-brand-950 dark:to-emerald-900 text-white p-5 sm:p-8 shadow-2xl">
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-xl ring-2 ring-white/20 shrink-0">
                {summary.critical > 0 ? <AlertTriangle className="h-8 w-8" /> : <Rocket className="h-8 w-8" />}
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 backdrop-blur-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest border border-amber-300/40 mb-1">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                  Smart Recommendation
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold">
                  {summary.critical > 0
                    ? `${summary.critical} limit${summary.critical > 1 ? 's' : ''} par pohnch gaye!`
                    : summary.warning > 0
                      ? `${summary.warning} limit ke kareeb`
                      : `${summary.totalFeatures - summary.enabledCount} aur features available`}
                </h3>
                <p className="text-xs sm:text-sm text-white/90 mt-1 font-semibold max-w-xl">
                  {summary.critical > 0
                    ? 'Foran upgrade karo warna nayi entries block ho sakti hain. Business growth ka waqt hai!'
                    : summary.warning > 0
                      ? 'Trend dekh ke lagta hai jaldi limit hit karoge. Ab upgrade sasta option hai future problems se.'
                      : 'Premium features unlock karo — profit reports, multi-shop, WhatsApp receipts, aur bahut kuch.'}
                </p>
              </div>
            </div>
            <Link to="/plan" className="shrink-0">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 shadow-xl font-extrabold">
                <Crown className="h-4 w-4" />
                See All Plans
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* ═══ CELEBRATE UNLIMITED ═══ */}
      {summary.enabledCount === summary.totalFeatures && summary.unlimited === 4 && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-2 border-emerald-300 dark:border-emerald-500/50 p-6 shadow-lg">
          <div className="text-center">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/40 mb-3">
              <Crown className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">🎉 You're on the Best Plan!</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1 font-semibold max-w-md mx-auto">
              All features unlocked aur unlimited usage — apni dukan grow karte raho!
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   FEATURE GROUP
   ═════════════════════════════════════════════════════════════ */
function FeatureGroup({ title, icon: Icon, tone, items, features, proBadge }: any) {
  const tones: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    emerald: {
      bg: 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/40',
      text: 'text-emerald-900 dark:text-emerald-200',
      iconBg: 'text-emerald-700 dark:text-emerald-400',
    },
    amber: {
      bg: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10',
      border: 'border-amber-200 dark:border-amber-500/40',
      text: 'text-amber-900 dark:text-amber-200',
      iconBg: 'text-amber-700 dark:text-amber-400',
    },
    blue: {
      bg: 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10',
      border: 'border-blue-200 dark:border-blue-500/40',
      text: 'text-blue-900 dark:text-blue-200',
      iconBg: 'text-blue-700 dark:text-blue-400',
    },
    violet: {
      bg: 'bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10',
      border: 'border-violet-200 dark:border-violet-500/40',
      text: 'text-violet-900 dark:text-violet-200',
      iconBg: 'text-violet-700 dark:text-violet-400',
    },
  };
  const t = tones[tone];
  const enabledInGroup = items.filter((f: any) => features[f.key]).length;

  return (
    <div className={`rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm overflow-hidden ${tone === 'violet' ? 'border-violet-200 dark:border-violet-500/40' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className={`px-5 py-3 ${t.bg} border-b-2 ${t.border} flex items-center justify-between gap-2 flex-wrap`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${t.iconBg}`} />
          <h4 className={`font-extrabold ${t.text} text-sm`}>{title}</h4>
          {proBadge && (
            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[9px] font-extrabold uppercase tracking-widest">
              Pro+
            </span>
          )}
        </div>
        <span className={`text-[10px] font-extrabold ${t.iconBg} tabular-nums`}>
          {enabledInGroup}/{items.length}
        </span>
      </div>
      <div className="p-4 grid sm:grid-cols-2 gap-2">
        {items.map((f: any) => (
          <FeatureItem
            key={f.key}
            enabled={features[f.key]}
            label={f.label}
            icon={f.icon}
            description={f.desc}
          />
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   USAGE TEACHER MODAL
   ═════════════════════════════════════════════════════════════ */
function UsageTeacher({ onClose, summary, planName }: { onClose: () => void; summary: any; planName: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-brand-300 dark:border-brand-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-brand-200 dark:border-brand-500/30 bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-500/15 dark:to-emerald-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-brand-900 dark:text-brand-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Plan Usage — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Ye page tumhari <span className="text-brand-700 dark:text-brand-400">{planName}</span> plan ka control room hai.</strong> Kya use ho raha, kya limits hain, kaunse features enabled — sab yahan real-time.
          </p>

          {/* Your health score */}
          <div className={`rounded-2xl border-2 p-4 ${
            summary.healthScore >= 75
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
              : summary.healthScore >= 50
                ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'
                : 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
          }`}>
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-2">
              <Gauge className="h-3 w-3" /> Aap Ka Health Score
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-4xl font-extrabold tabular-nums ${
                  summary.healthScore >= 75 ? 'text-emerald-700 dark:text-emerald-400' :
                  summary.healthScore >= 50 ? 'text-amber-700 dark:text-amber-400' :
                  'text-rose-700 dark:text-rose-400'
                }`}>
                  {summary.healthScore}
                </div>
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-1">
                  {summary.healthScore >= 75 ? '🎉 Excellent — thoda margin hai grow karne ke liye' :
                   summary.healthScore >= 50 ? '⚠️ Fair — limits pe pressure barh raha hai' :
                   '🔴 Poor — foran upgrade zaroori'}
                </div>
              </div>
              <div className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div>Usage: <strong>{summary.avgUsage}%</strong></div>
                <div>Features: <strong>{summary.featurePct}%</strong></div>
              </div>
            </div>
          </div>

          {/* 4 usage metrics explained */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Package className="h-3 w-3" /> 4 Main Limits
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                📦 <strong>Products:</strong> Kitne unique items catalog me. 90%+ hit = purane inactive delete karo ya upgrade.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                👥 <strong>Users:</strong> Team members jo login karte hain. Salesman/manager add karne se pehle check karo.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                🏪 <strong>Shops:</strong> Branches/outlets count. Multi-shop features Pro+ me milta hai.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                🛒 <strong>Sales/month:</strong> Har mahine ke transactions. Har naye mahine reset hoti hai — end-of-month watch karo.
              </div>
            </div>
          </div>

          {/* Color coding */}
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Target className="h-3 w-3" /> Color Coding
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 p-2">
                🟢 <strong>Healthy ({'<'}75%):</strong> Sab theek. Aaram se grow karo.
              </div>
              <div className="rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 p-2">
                🟡 <strong>Warning (75-89%):</strong> Alert! Trend dekho — jaldi upgrade plan karo.
              </div>
              <div className="rounded-lg bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 p-2">
                🔴 <strong>Critical (90%+):</strong> Nayi entries block ho sakti hain! Foran upgrade karo.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2">
                ♾️ <strong>Unlimited:</strong> Enterprise plan — grow karte raho, koi ceiling nahi.
              </div>
            </div>
          </div>

          {/* Optimization tips */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Optimization Tips
            </div>
            <TipRow><strong>🧹 Cleanup regularly:</strong> Purane inactive products/customers delete karo. Space free ho jayega.</TipRow>
            <TipRow><strong>📊 Trend track karo:</strong> Har hafte ye page dekho. Pattern samajh me aata hai — kab upgrade lena hai.</TipRow>
            <TipRow><strong>🎯 Warning pe upgrade:</strong> Critical pe pohnchne se pehle upgrade karo — business ruk nahi payega.</TipRow>
            <TipRow><strong>💎 Feature unlock:</strong> Locked features (🔒 icon) higher plans me. Har feature card pe description hai.</TipRow>
            <TipRow><strong>🎨 Multi-shop planning:</strong> Agar branch open karna ho, Pro plan zaroor le lo (upto 3 shops).</TipRow>
            <TipRow><strong>💰 Yearly billing:</strong> Upgrade karte waqt yearly choose karo — 15% saving milti hai.</TipRow>
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            💡 <strong>Pro tip:</strong> Health score 75+ maintain karo. Neeche jaye to upgrade ka time hai. Business ruk jane se behtar hai thoda extra pay karna — Nafaa ke saath grow karo!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 font-extrabold shadow-lg shadow-brand-500/40 h-12"
            onClick={onClose}
          >
            <Rocket className="h-4 w-4" /> Samajh Gaya — Grow Karo!
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
