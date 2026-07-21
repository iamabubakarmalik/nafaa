import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { formatPKR } from '@/lib/format';

export const dayLabel = (date: string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(d);
};

export const PIE_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
];

interface ReportsHeroProps {
  gradient: string;
  emoji: string;
  industryLabel: string;
  title: string;
  subtitle: string;
  days: number;
  setDays: (d: number) => void;
  extraActions?: React.ReactNode;
}

export function ReportsHero({
  gradient, emoji, industryLabel, title, subtitle, days, setDays, extraActions,
}: ReportsHeroProps) {
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} text-white p-6 sm:p-8 shadow-2xl`}>
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <span className="text-base">{emoji}</span>
            <Sparkles className="h-3 w-3 text-amber-300" />
            {industryLabel} Business Intelligence
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{title}</h1>
          <p className="mt-2 text-sm text-white/80">{subtitle}</p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {extraActions}
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                days === d
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur'
              }`}
            >
              {d} days
            </button>
          ))}
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

export function TabSwitcher({ tabs, active, onChange, color = 'violet' }: TabSwitcherProps) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-600 border-violet-600 shadow-violet-500/30 hover:border-violet-300',
    orange: 'bg-orange-600 border-orange-600 shadow-orange-500/30 hover:border-orange-300',
    blue: 'bg-blue-600 border-blue-600 shadow-blue-500/30 hover:border-blue-300',
    emerald: 'bg-emerald-600 border-emerald-600 shadow-emerald-500/30 hover:border-emerald-300',
    sky: 'bg-sky-600 border-sky-600 shadow-sky-500/30 hover:border-sky-300',
  };
  const activeCls = colorMap[color] || colorMap.violet;
  const hoverCls = activeCls.split('hover:')[1];

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
                ? `${activeCls.split(' ')[0]} text-white ${activeCls.split(' ')[1]} shadow-lg ${activeCls.split(' ')[2]}`
                : `bg-white text-slate-700 border-slate-200 hover:${hoverCls}`
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

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: any;
  color: 'emerald' | 'violet' | 'blue' | 'amber' | 'orange' | 'pink' | 'rose' | 'cyan' | 'sky';
  isHighlight?: boolean;
  sub?: string;
}

export function KpiCard({ label, value, icon: Icon, color, isHighlight, sub }: KpiCardProps) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    orange: 'from-orange-500 to-red-600 shadow-orange-500/30',
    pink: 'from-pink-500 to-rose-600 shadow-pink-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
    cyan: 'from-cyan-500 to-teal-600 shadow-cyan-500/30',
    sky: 'from-sky-500 to-cyan-600 shadow-sky-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isHighlight ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider font-bold text-slate-500">{label}</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums truncate">{value}</h3>
          {sub && <p className="text-xs text-slate-600 font-semibold mt-1">{sub}</p>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: any;
  fullWidth?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
  color?: string;
}

export function ChartCard({ title, subtitle, icon: Icon, children, action, color = 'violet' }: ChartCardProps) {
  const iconBg: Record<string, string> = {
    violet: 'bg-violet-100 text-violet-700',
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
  };
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`h-9 w-9 rounded-xl ${iconBg[color] || iconBg.violet} flex items-center justify-center`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="h-[320px]">{children}</div>
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-slate-500">
      <div className="text-center">
        <div className="h-10 w-10 rounded-2xl bg-slate-100 mx-auto mb-2 flex items-center justify-center">
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </div>
        <p>{message}</p>
      </div>
    </div>
  );
}

interface PnLLineProps {
  label: string;
  value: number;
  type: 'positive' | 'negative' | 'bold' | 'highlight';
  sub?: string;
}

export function PnLLine({ label, value, type, sub }: PnLLineProps) {
  if (type === 'highlight') {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300">
        <div>
          <div className="font-extrabold text-emerald-900">{label}</div>
          {sub && <div className="text-[10px] text-emerald-700 font-bold">{sub}</div>}
        </div>
        <div className={`font-extrabold text-xl tabular-nums ${value >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {formatPKR(value)}
        </div>
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-between py-2 ${type === 'bold' ? 'border-t border-slate-200 pt-3 font-bold' : ''}`}>
      <div>
        <span className={`text-sm ${type === 'bold' ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{label}</span>
        {sub && <span className="ml-2 text-[10px] text-slate-500 font-bold">({sub})</span>}
      </div>
      <span className={`font-bold tabular-nums ${
        type === 'positive' ? 'text-emerald-700' :
        type === 'negative' ? 'text-rose-700' :
        'text-slate-900'
      }`}>
        {value < 0 ? '-' : ''}{formatPKR(Math.abs(value))}
      </span>
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string | number;
  color: 'blue' | 'rose' | 'emerald' | 'amber' | 'violet' | 'pink' | 'orange' | 'cyan';
  icon: any;
}

export function MiniStat({ label, value, color, icon: Icon }: MiniStatProps) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    violet: 'bg-violet-50 border-violet-200 text-violet-900',
    pink: 'bg-pink-50 border-pink-200 text-pink-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-900',
  };
  return (
    <div className={`rounded-xl border-2 ${colors[color]} p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-70" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">{label}</div>
      </div>
      <div className="text-lg font-extrabold tabular-nums">{value}</div>
    </div>
  );
}
