import { Link } from 'react-router-dom';
import { Crown, Phone, MapPin, Mail, MessageCircle, Eye, Edit3, Trash2, Star } from 'lucide-react';
import { formatPKR } from '@core/lib/format';

export const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

export const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export const formatRelative = (v: string) => {
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

interface HeroProps {
  gradient: string;
  emoji: string;
  industryLabel: string;
  industryBadgeColor: string;
  title: string;
  subtitle: string;
  actionButton?: React.ReactNode;
}

export function CustomersHero({ gradient, emoji, industryLabel, industryBadgeColor, title, subtitle, actionButton }: HeroProps) {
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} text-white p-6 shadow-2xl`}>
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="relative flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <span className="text-base">{emoji}</span>
            {industryLabel}
            <span className={`ml-1 px-1.5 py-0.5 rounded ${industryBadgeColor} text-[10px] font-extrabold uppercase`}>
              {industryLabel}
            </span>
          </div>
          <h2 className="mt-3 text-3xl font-extrabold">{title}</h2>
          <p className="mt-2 text-sm text-white/80">{subtitle}</p>
        </div>
        {actionButton}
      </div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  color: string;
  isHighlight?: boolean;
}

export function CustomerStatCard({ label, value, sub, icon: Icon, color, isHighlight }: StatCardProps) {
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm ${
      isHighlight ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
          {sub && <div className="text-xs text-slate-600 font-semibold mt-1">{sub}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

interface CustomerCardProps {
  customer: any;
  themeColor: 'blue' | 'orange' | 'emerald' | 'sky' | 'pink' | 'red' | 'cyan' | 'fuchsia' | 'purple' | 'violet' | 'rose' | 'amber';
  extraBadges?: React.ReactNode;
  onDelete?: (id: string) => void;
}

export function CustomerCard({ customer: c, themeColor, extraBadges, onDelete }: CustomerCardProps) {
  const themes = {
    blue: 'hover:border-blue-300 group-hover:text-blue-700',
    orange: 'hover:border-orange-300 group-hover:text-orange-700',
    emerald: 'hover:border-emerald-300 group-hover:text-emerald-700',
    sky: 'hover:border-sky-300 group-hover:text-sky-700',
  pink: 'hover:border-pink-300',
  red: 'hover:border-red-300',
  cyan: 'hover:border-cyan-300',
  fuchsia: 'hover:border-fuchsia-300',
  purple: 'hover:border-purple-300',
  violet: 'hover:border-violet-300',
  rose: 'hover:border-rose-300',
  amber: 'hover:border-amber-300',
};
  const gradients = {
    blue: 'from-blue-500 to-cyan-600',
    orange: 'from-orange-500 to-red-600',
    emerald: 'from-emerald-500 to-teal-600',
    sky: 'from-sky-500 to-cyan-600',
  pink: 'from-pink-500 to-fuchsia-600',
  red: 'from-red-500 to-orange-600',
  cyan: 'from-cyan-500 to-blue-600',
  fuchsia: 'from-fuchsia-500 to-pink-600',
  purple: 'from-purple-500 to-violet-600',
  violet: 'from-violet-500 to-purple-600',
  rose: 'from-rose-500 to-pink-600',
  amber: 'from-amber-500 to-orange-600',
};

  return (
    <div className={`group rounded-2xl bg-white border-2 border-slate-200 ${themes[themeColor]} hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden`}>
      <Link to={`/customers/${c.id}`} className="block p-5">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} className="h-14 w-14 rounded-2xl object-cover shadow" alt={c.name} />
            ) : (
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-extrabold shadow ${
                c.isVip
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                  : `bg-gradient-to-br ${gradients[themeColor]} text-white`
              }`}>
                {c.name.charAt(0).toUpperCase()}
              </div>
            )}
            {c.isVip && (
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 truncate transition">
              {c.name}
            </h3>
            {c.phone && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 font-semibold">
                <Phone className="h-3 w-3" />
                {c.phone}
              </div>
            )}
            {c.city && (
              <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                <MapPin className="h-3 w-3" />
                {c.city}{c.area && `, ${c.area}`}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-2">
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Spent</div>
            <div className="text-sm font-extrabold text-emerald-700 truncate">{formatPKR(c.totalSpent)}</div>
          </div>
          <div className={`rounded-lg px-2.5 py-2 border ${c.balance > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${c.balance > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Khata</div>
            <div className={`text-sm font-extrabold truncate ${c.balance > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
              {formatPKR(c.balance)}
            </div>
          </div>
        </div>

        {(c.loyaltyPoints > 0 || extraBadges) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {c.loyaltyPoints > 0 && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                {c.loyaltyPoints.toLocaleString()} pts
              </div>
            )}
            {extraBadges}
          </div>
        )}
      </Link>

      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition">
        <div className="flex items-center gap-1">
          {c.phone && (
            <a
              href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
          {c.phone && (
            <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center">
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center">
              <Mail className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link to={`/customers/${c.id}`} onClick={(e) => e.stopPropagation()}
            className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <Link to={`/customers/${c.id}/edit`} onClick={(e) => e.stopPropagation()}
            className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </Link>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete ${c.name}?`)) onDelete(c.id);
              }}
              className="h-7 w-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
