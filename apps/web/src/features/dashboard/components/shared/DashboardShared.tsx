import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { formatPKR } from '@/lib/format';

export const formatPercent = (n: number) => {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#10b981', CARD: '#3b82f6', JAZZCASH: '#f97316',
  EASYPAISA: '#22c55e', BANK_TRANSFER: '#8b5cf6',
};

interface HeroKpiProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  isHighlight?: boolean;
  trend?: number;
}

export function HeroKpiCard({ title, value, subtitle, icon: Icon, color, isHighlight, trend }: HeroKpiProps) {
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isHighlight ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-900 truncate tabular-nums">{value}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500 truncate">{subtitle}</p>}
          {trend !== undefined && trend !== 0 && (
            <div className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {trend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {formatPercent(trend)}
            </div>
          )}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: 'emerald' | 'green' | 'violet' | 'amber' | 'blue' | 'orange' | 'pink' | 'rose' | 'cyan';
}

export function IndustryStatCard({ label, value, sub, icon: Icon, color }: StatCardProps) {
  const iconColors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    green: 'bg-green-100 text-green-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    pink: 'bg-pink-100 text-pink-700',
    rose: 'bg-rose-100 text-rose-700',
    cyan: 'bg-cyan-100 text-cyan-700',
  };
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl ${iconColors[color]} flex items-center justify-center shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div>
        <div className="text-lg font-extrabold text-slate-900 tabular-nums">{value}</div>
        {sub && <div className="text-[10px] text-slate-500 font-bold">{sub}</div>}
      </div>
    </div>
  );
}

interface QuickStatProps {
  title: string;
  value: number | string;
  icon: any;
  tone: string;
  link: string;
  alert?: boolean;
}

export function QuickStat({ title, value, icon: Icon, tone, link, alert }: QuickStatProps) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    pink: 'bg-pink-100 text-pink-700',
    amber: 'bg-amber-100 text-amber-700',
    orange: 'bg-orange-100 text-orange-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <Link to={link} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition block relative">
      {alert && Number(value) > 0 && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase">{title}</p>
          <h3 className="mt-1 text-lg font-extrabold text-slate-900">{value}</h3>
        </div>
        <div className={`h-9 w-9 rounded-xl ${tones[tone]} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

interface PnLCardProps {
  label: string;
  value: string;
  sub?: string;
  color: 'emerald' | 'rose' | 'amber' | 'brand' | 'blue' | 'violet' | 'orange';
  isHighlight?: boolean;
}

export function PnLCard({ label, value, sub, color, isHighlight }: PnLCardProps) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    brand: 'bg-gradient-to-br from-brand-600 to-emerald-700 text-white border-brand-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    violet: 'bg-violet-50 border-violet-200 text-violet-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 ${colors[color]} ${isHighlight ? 'shadow-lg' : ''}`}>
      <div className={`text-xs font-extrabold uppercase tracking-wider ${isHighlight ? 'opacity-90' : 'opacity-80'}`}>{label}</div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className={`text-xs mt-1 ${isHighlight ? 'opacity-90' : 'opacity-70'}`}>{sub}</div>}
    </div>
  );
}

interface HeroProps {
  gradient: string;
  emoji: string;
  industryLabel: string;
  industryBadgeColor: string;
  tenantName?: string;
  netProfit: number;
  salesToday: number;
  cogsToday: number;
  expensesToday: number;
  growthVsYesterday: number;
  onRefresh: () => void;
  isRefetching: boolean;
  posLabel?: string;
  posLink?: string;
}

export function DashboardHero({
  gradient, emoji, industryLabel, industryBadgeColor,
  tenantName, netProfit, salesToday, cogsToday, expensesToday,
  growthVsYesterday, onRefresh, isRefetching,
  posLabel = 'Open POS', posLink = '/pos',
}: HeroProps) {
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} text-white p-6 sm:p-8 shadow-2xl`}>
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <span className="text-base">{emoji}</span>
            {tenantName || 'Your Shop'}
            <span className={`ml-1 px-1.5 py-0.5 rounded ${industryBadgeColor} text-[10px] font-extrabold uppercase`}>
              {industryLabel}
            </span>
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold leading-tight">Aaj ka asli profit</h2>
          <div className="mt-3 flex items-baseline gap-3 flex-wrap">
            <div className="text-4xl sm:text-5xl font-extrabold tabular-nums">{formatPKR(netProfit)}</div>
            {growthVsYesterday !== 0 && (
              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                growthVsYesterday >= 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
              }`}>
                {growthVsYesterday >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPercent(growthVsYesterday)} vs yesterday
              </div>
            )}
          </div>
          <p className="mt-2 text-white/80 text-sm">
            Sales <strong>{formatPKR(salesToday)}</strong> − Cost <strong>{formatPKR(cogsToday)}</strong> − Expenses <strong>{formatPKR(expensesToday)}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefetching}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold backdrop-blur transition disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Refresh
          </button>
          <Link to={posLink}>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-sm font-bold transition">
              {posLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
