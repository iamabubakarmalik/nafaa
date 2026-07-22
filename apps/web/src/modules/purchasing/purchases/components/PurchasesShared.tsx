import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowRight, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { formatPKR } from '@core/lib/format';

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

export const formatPercent = (n: number) => {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
};

export const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#10b981', CARD: '#3b82f6', JAZZCASH: '#f97316',
  EASYPAISA: '#22c55e', BANK_TRANSFER: '#8b5cf6',
};

interface HeroProps {
  gradient: string;
  emoji: string;
  industryLabel: string;
  industryBadgeColor: string;
  title: string;
  subtitle: string;
  onRefresh: () => void;
  isRefetching: boolean;
  extraActions?: React.ReactNode;
}

export function PurchasesHero({
  gradient, emoji, industryLabel, industryBadgeColor,
  title, subtitle, onRefresh, isRefetching, extraActions,
}: HeroProps) {
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} text-white p-6 sm:p-8 shadow-2xl`}>
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <span className="text-base">{emoji}</span>
            <Sparkles className="h-3 w-3 text-amber-300" />
            <span className={`px-1.5 py-0.5 rounded ${industryBadgeColor} text-[10px] font-extrabold uppercase`}>
              {industryLabel}
            </span>
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{title}</h2>
          <p className="mt-2 text-sm text-white/80">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {extraActions}
          <button
            onClick={onRefresh}
            disabled={isRefetching}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 backdrop-blur"
          >
            <svg className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
    </section>
  );
}

interface TabConfig {
  id: string;
  label: string;
  icon: any;
}

interface TabSwitcherProps {
  tabs: TabConfig[];
  active: string;
  onChange: (id: string) => void;
  color?: string;
}

export function TabSwitcher({ tabs, active, onChange, color = 'orange' }: TabSwitcherProps) {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-600 text-white border-orange-600 shadow-orange-500/30',
    blue: 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30',
    emerald: 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/30',
    sky: 'bg-sky-600 text-white border-sky-600 shadow-sky-500/30',
    violet: 'bg-violet-600 text-white border-violet-600 shadow-violet-500/30',
  };

  return (
    <section className="flex gap-2 overflow-x-auto pb-2">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition border-2 ${
              isActive
                ? `${colorMap[color]} shadow-lg`
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </button>
        );
      })}
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: 'orange' | 'violet' | 'amber' | 'rose' | 'emerald' | 'blue' | 'sky' | 'cyan';
  trend?: number;
  isAlert?: boolean;
  isHighlight?: boolean;
}

export function PurchaseStatCard({ label, value, sub, icon: Icon, color, trend, isAlert, isHighlight }: StatCardProps) {
  const colors: Record<string, string> = {
    orange: 'from-orange-500 to-orange-700 shadow-orange-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    sky: 'from-sky-500 to-cyan-600 shadow-sky-500/30',
    cyan: 'from-cyan-500 to-teal-600 shadow-cyan-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isAlert ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300' :
      isHighlight ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300' :
      'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
          {sub && <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>}
          {trend !== undefined && trend !== 0 && (
            <div className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {trend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {formatPercent(trend)}
            </div>
          )}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

interface ComparisonProps {
  title: string;
  currentLabel: string;
  currentValue: number;
  previousLabel: string;
  previousValue: number;
  growth: number;
  icon: any;
  themeColor?: string;
}

export function ComparisonCard({ title, currentLabel, currentValue, previousLabel, previousValue, growth, icon: Icon, themeColor = 'orange' }: ComparisonProps) {
  const isUp = growth >= 0;
  const themes: Record<string, string> = {
    orange: 'from-orange-50 to-amber-50 border-orange-200 text-orange-700 text-orange-900',
    blue: 'from-blue-50 to-cyan-50 border-blue-200 text-blue-700 text-blue-900',
    emerald: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-700 text-emerald-900',
    sky: 'from-sky-50 to-cyan-50 border-sky-200 text-sky-700 text-sky-900',
  };
  const parts = (themes[themeColor] || themes.orange).split(' ');
  const bg = parts.slice(0, 2).join(' ');
  const border = parts[2];
  const textLabel = parts[3];
  const textValue = parts[4];

  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-xl bg-gradient-to-br ${bg} border ${border} p-3`}>
          <div className={`text-[10px] uppercase font-bold ${textLabel}`}>{currentLabel}</div>
          <div className={`text-xl font-extrabold mt-1 tabular-nums ${textValue}`}>{formatPKR(currentValue)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <div className="text-[10px] uppercase font-bold text-slate-600">{previousLabel}</div>
          <div className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">{formatPKR(previousValue)}</div>
        </div>
      </div>
      {growth !== 0 && (
        <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-extrabold ${
          isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {formatPercent(growth)} vs {previousLabel.toLowerCase()}
        </div>
      )}
    </div>
  );
}
