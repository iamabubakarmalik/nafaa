import {
  Shirt, Palette, Package, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Boxes, Star, Sparkles, Zap,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { GarmentWizardDraft } from '../../hooks/useGarmentWizard';

interface Props {
  draft: GarmentWizardDraft;
  stats: {
    variantCount: number;
    uniqueSizes: number;
    uniqueColors: number;
    totalStock: number;
    stockValue: number;
    stockCost: number;
    potentialProfit: number;
    profitMargin: number;
  };
  allValid: boolean;
}

export function GarmentWizardSummary({ draft, stats, allValid }: Props) {
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-5 shadow-xl overflow-hidden relative">
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
            {draft.basic.name || 'Untitled Garment'}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.basic.isNewArrival && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-extrabold uppercase border border-emerald-300/40">
                <Sparkles className="h-2 w-2" /> New
              </span>
            )}
            {draft.basic.isBestSeller && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[9px] font-extrabold uppercase border border-amber-300/40">
                <Star className="h-2 w-2 fill-current" /> Best
              </span>
            )}
            {draft.basic.isOnSale && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 text-[9px] font-extrabold uppercase border border-rose-300/40">
                <Zap className="h-2 w-2" /> Sale
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={Boxes} label="Variants" value={stats.variantCount} tone="pink"
            hint={draft.hasVariants ? `${stats.uniqueSizes} sizes × ${stats.uniqueColors} colors` : 'no variants'} />
          <StatCell icon={Package} label="Total Stock" value={stats.totalStock} tone="emerald"
            hint={draft.basic.unit} />
        </div>
        {draft.basic.gender && (
          <div className="border-t border-slate-100 p-3 bg-fuchsia-50 flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold text-fuchsia-700">Gender</span>
            <span className="text-sm font-extrabold text-fuchsia-900">{draft.basic.gender}</span>
          </div>
        )}
        {draft.basic.categoryType && (
          <div className="border-t border-slate-100 p-3 bg-slate-50 flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold text-slate-600">Category</span>
            <span className="text-sm font-extrabold text-slate-900">{draft.basic.categoryType.replace(/_/g, ' ')}</span>
          </div>
        )}
      </div>

      {Number(draft.basic.salePrice || 0) > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Finance
          </div>
          <Row label="Sale price" value={formatPKRFull(Number(draft.basic.salePrice || 0))} tone="emerald" />
          <Row label="Cost price" value={formatPKRFull(Number(draft.basic.costPrice || 0))} tone="slate" />
          {stats.totalStock > 0 && (
            <>
              <Row label="Stock value" value={formatPKRFull(stats.stockValue)} tone="emerald" />
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    Potential profit
                  </div>
                  <div className={['text-sm font-extrabold tabular-nums',
                    stats.potentialProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                    {formatPKRFull(stats.potentialProfit)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>Margin</span>
                  <span className={stats.profitMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {stats.profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </>
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
    pink: 'text-pink-700', emerald: 'text-emerald-700',
    amber: 'text-amber-700', fuchsia: 'text-fuchsia-700',
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
