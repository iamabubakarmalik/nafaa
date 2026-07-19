import {
  Package, Wrench, Car, TrendingUp, DollarSign, AlertTriangle,
  CheckCircle2, ShieldCheck, Hash, Zap, AlertCircle, Globe,
} from 'lucide-react';
import { formatPKRFull } from '@/lib/format';
import type { AutoPartsWizardDraft } from '../../hooks/useAutoPartsWizard';

interface Props {
  draft: AutoPartsWizardDraft;
  stats: {
    profit: number;
    margin: number;
    stock: number;
    stockValue: number;
    stockCost: number;
    alternateNumberCount: number;
    fitmentCount: number;
    isUniversal: boolean;
  };
  allValid: boolean;
}

export function AutoPartsWizardSummary({ draft, stats, allValid }: Props) {
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-slate-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Auto Part'}
          </h3>
          {draft.details.partNumber && (
            <div className="text-xs text-white/70 font-mono mt-1">Part #: {draft.details.partNumber}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.details.condition && (
              <span className="px-1.5 py-0.5 rounded bg-white/15 text-white text-[9px] font-extrabold uppercase border border-white/20">
                {draft.details.condition}
              </span>
            )}
            {draft.details.isFastMoving && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 text-[9px] font-extrabold uppercase border border-red-300/40">
                <Zap className="h-2 w-2" /> Fast Moving
              </span>
            )}
            {draft.details.isCritical && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 text-[9px] font-extrabold uppercase border border-rose-300/40">
                <AlertCircle className="h-2 w-2" /> Critical
              </span>
            )}
            {stats.isUniversal && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-extrabold uppercase border border-emerald-300/40">
                <Globe className="h-2 w-2" /> Universal
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={Hash} label="Alt Numbers" value={stats.alternateNumberCount} tone="blue" />
          <StatCell icon={Car} label="Fitments" value={stats.isUniversal ? '∞' : stats.fitmentCount} tone="fuchsia" />
        </div>
        {Number(draft.details.warrantyMonths) > 0 && (
          <div className="border-t border-slate-100 p-4 bg-emerald-50">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-3 w-3 text-emerald-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Warranty</div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-900 tabular-nums">
              {draft.details.warrantyMonths} <span className="text-sm">months</span>
            </div>
            {draft.details.warrantyKm && Number(draft.details.warrantyKm) > 0 && (
              <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                or {Number(draft.details.warrantyKm).toLocaleString()} km
              </div>
            )}
          </div>
        )}
        <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="h-3 w-3 text-slate-700" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-700">
              Stock ({draft.basic.unit || 'pcs'})
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {stats.stock}
          </div>
        </div>
      </div>

      {stats.stock > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Finance
          </div>
          <Row label="Cost value" value={formatPKRFull(stats.stockCost)} tone="slate" />
          <Row label="Sale value" value={formatPKRFull(stats.stockValue)} tone="emerald" />
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                Profit per unit
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

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[10px] text-slate-500 font-semibold text-center">
        💾 Draft auto-saves — safai se close karo, wapas mile ga
      </div>
    </aside>
  );
}

function StatCell({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'text-blue-700', fuchsia: 'text-fuchsia-700',
    emerald: 'text-emerald-700', amber: 'text-amber-700',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={['h-3 w-3', tones[tone]].join(' ')} />
        <div className={['text-[10px] uppercase tracking-wider font-extrabold', tones[tone]].join(' ')}>{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
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
