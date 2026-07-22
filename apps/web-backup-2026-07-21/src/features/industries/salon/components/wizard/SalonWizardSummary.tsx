import {
  Scissors, Clock, Users, DollarSign, TrendingUp, Award,
  AlertTriangle, CheckCircle2, Star, Zap, Timer,
} from 'lucide-react';
import { formatPKRFull } from '@/lib/format';
import type { SalonWizardDraft } from '../../hooks/useSalonWizard';

interface Props {
  draft: SalonWizardDraft;
  stats: {
    price: number;
    cost: number;
    profit: number;
    margin: number;
    effectivePrice: number;
    hasDiscount: boolean;
    discountPct: number;
    commission: number;
    targetCount: number;
    totalDuration: number;
  };
  allValid: boolean;
}

export function SalonWizardSummary({ draft, stats, allValid }: Props) {
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      {/* HEADER */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Salon Service'}
          </h3>
          {draft.basic.code && (
            <div className="text-xs text-white/70 font-mono mt-1">Code: {draft.basic.code}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.basic.isFeatured && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[9px] font-extrabold uppercase border border-amber-300/40">
                <Star className="h-2 w-2 fill-current" /> Featured
              </span>
            )}
            {draft.basic.isPopular && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 text-[9px] font-extrabold uppercase border border-red-300/40">
                <TrendingUp className="h-2 w-2" /> Popular
              </span>
            )}
            {stats.hasDiscount && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-extrabold uppercase border border-emerald-300/40">
                <Zap className="h-2 w-2" /> {stats.discountPct.toFixed(0)}% OFF
              </span>
            )}
          </div>
        </div>
      </div>

      {/* DURATION + AUDIENCE */}
      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={Clock} label="Duration" value={`${draft.basic.durationMinutes || 0}m`} tone="blue"
            hint={stats.totalDuration > Number(draft.basic.durationMinutes || 0) ? `+${stats.totalDuration - Number(draft.basic.durationMinutes || 0)}m buffer` : undefined} />
          <StatCell icon={Users} label="Audience" value={stats.targetCount} tone="pink"
            hint={[draft.basic.forMen && 'Men', draft.basic.forWomen && 'Women', draft.basic.forKids && 'Kids'].filter(Boolean).join(', ') || 'None'} />
        </div>
        <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-pink-50 to-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Timer className="h-3 w-3 text-pink-700" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-pink-700">
              Total Chair Time
            </div>
          </div>
          <div className="text-3xl font-extrabold text-pink-900 tabular-nums">
            {stats.totalDuration} <span className="text-lg">min</span>
          </div>
        </div>
      </div>

      {/* PRICING */}
      {stats.price > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Pricing
          </div>
          {stats.hasDiscount && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold line-through">Regular</span>
              <span className="font-bold tabular-nums text-slate-400 line-through">{formatPKRFull(stats.price)}</span>
            </div>
          )}
          <Row label={stats.hasDiscount ? 'Sale price' : 'Price'} value={formatPKRFull(stats.effectivePrice)} tone="emerald" />
          {stats.cost > 0 && (
            <Row label="Cost" value={formatPKRFull(stats.cost)} tone="slate" />
          )}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                Profit
              </div>
              <div className={['text-sm font-extrabold tabular-nums',
                stats.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                {formatPKRFull(stats.profit)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>Margin</span>
              <span className={stats.margin >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {stats.margin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* COMMISSION */}
      {stats.commission > 0 && (
        <div className="rounded-2xl bg-white border-2 border-amber-200 shadow-sm p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 flex items-center gap-1">
            <Award className="h-3 w-3" /> Staff Commission
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Per service</span>
            <span className="text-lg font-extrabold text-amber-700 tabular-nums">
              {formatPKRFull(stats.commission)}
            </span>
          </div>
          {Number(draft.basic.commissionPct || 0) > 0 && (
            <div className="text-[10px] text-slate-500 font-bold">
              {draft.basic.commissionPct}% of {formatPKRFull(stats.effectivePrice)}
            </div>
          )}
          {Number(draft.basic.commissionFixed || 0) > 0 && (
            <div className="text-[10px] text-slate-500 font-bold">
              + {formatPKRFull(Number(draft.basic.commissionFixed || 0))} fixed
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[10px] text-slate-500 font-semibold text-center">
        💾 Draft auto-saves — safai se close karo, wapas mile ga
      </div>
    </aside>
  );
}

function StatCell({ icon: Icon, label, value, tone, hint }: any) {
  const tones: Record<string, string> = {
    pink: 'text-pink-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={['h-3 w-3', tones[tone]].join(' ')} />
        <div className={['text-[10px] uppercase tracking-wider font-extrabold', tones[tone]].join(' ')}>{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{hint}</div>}
    </div>
  );
}

function Row({ label, value, tone }: any) {
  const tones: Record<string, string> = { slate: 'text-slate-700', emerald: 'text-emerald-700' };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className={['font-extrabold tabular-nums', tones[tone]].join(' ')}>{value}</span>
    </div>
  );
}
