import {
  Layers, ShoppingBag, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Boxes, Calendar, Sparkles,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { RetailWizardDraft } from '../../hooks/useRetailWizard';

interface Props {
  draft: RetailWizardDraft;
  stats: {
    unitCount: number;
    variantCount: number;
    batchCount: number;
    totalStock: number;
    stockValue: number;
    stockCost: number;
    potentialProfit: number;
    profitMargin: number;
  };
  allValid: boolean;
}

/* ═════════════════════════════════════════════════════════════
   WIZARD SUMMARY SIDEBAR (FULL BEST v2)
   🌙 Dark mode perfect • ✅ Live checklist • 💰 Profit preview
   ═════════════════════════════════════════════════════════════ */

export function RetailWizardSummary({ draft, stats, allValid }: Props) {
  const U = draft.basic.baseUnit || 'pcs';
  const hasName = !!draft.basic.name.trim();
  const hasSale = Number(draft.basic.salePrice || 0) > 0;

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      {/* Header card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 dark:from-slate-950 dark:via-sky-950 dark:to-cyan-900 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Save karne ke liye ready</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft — kuch baqi hai</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Product ka naam...'}
          </h3>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] font-bold text-white/80">
            {draft.basic.sku && <span className="font-mono">SKU: {draft.basic.sku}</span>}
            {draft.basic.barcode && <span className="font-mono">• {draft.basic.barcode}</span>}
          </div>
          {hasSale && (
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300">
                {formatPKRFull(Number(draft.basic.salePrice || 0))}
              </div>
              <div className="text-xs font-bold text-white/70">/ {U}</div>
            </div>
          )}
        </div>
      </div>

      {/* Counts */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
          <Cell icon={Layers} label="Units" value={stats.unitCount} hint={draft.hasMultiUnits ? 'multi-unit on' : 'single'} tone="sky" />
          <Cell icon={Boxes} label="Variants" value={stats.variantCount} hint={draft.hasVariants ? 'variants on' : 'no variants'} tone="violet" />
        </div>
        {draft.trackBatches && (
          <div className="border-t border-slate-100 dark:border-slate-800">
            <Cell icon={Calendar} label="Batches" value={stats.batchCount} hint="expiry tracking on" tone="amber" />
          </div>
        )}
        <div className="border-t-2 border-slate-100 dark:border-slate-800 p-4 bg-gradient-to-br from-sky-50 to-white dark:from-sky-500/10 dark:to-slate-900">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingBag className="h-3 w-3 text-sky-700 dark:text-sky-400" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-sky-700 dark:text-sky-400">
              Kul Stock ({U})
            </div>
          </div>
          <div className="text-3xl font-extrabold text-sky-900 dark:text-sky-200 tabular-nums">{stats.totalStock}</div>
        </div>
      </div>

      {/* Finance */}
      {stats.totalStock > 0 && hasSale && (
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Paisay
          </div>
          <Row label="Kharid value" value={formatPKRFull(stats.stockCost)} tone="slate" />
          <Row label="Bikri value" value={formatPKRFull(stats.stockValue)} tone="emerald" />
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Sambhava faida
              </div>
              <div className={['text-sm font-extrabold tabular-nums',
                stats.potentialProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'].join(' ')}>
                {formatPKRFull(stats.potentialProfit)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span>Margin</span>
              <span className={stats.profitMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                {stats.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-300 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Checklist
        </div>
        <Chk done={hasName} label="Product ka naam" />
        <Chk done={hasSale} label="Bikri rate" />
        <Chk done={!!draft.basic.baseUnit} label="Unit chuna" />
        <Chk done={stats.totalStock > 0} label="Stock likha" />
      </div>

      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-2.5 text-[10px] text-emerald-800 dark:text-emerald-300 font-extrabold text-center">
        💾 Draft khud save hota hai — safai se close karo, wapas mile ga
      </div>
    </aside>
  );
}

function Cell({ icon: Icon, label, value, tone, hint }: {
  icon: any; label: string; value: number | string; tone: string; hint?: string;
}) {
  const tones: Record<string, string> = {
    sky: 'text-sky-700 dark:text-sky-400', violet: 'text-violet-700 dark:text-violet-400',
    amber: 'text-amber-700 dark:text-amber-400', emerald: 'text-emerald-700 dark:text-emerald-400',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={['h-3 w-3', tones[tone]].join(' ')} />
        <div className={['text-[10px] uppercase tracking-wider font-extrabold', tones[tone]].join(' ')}>{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">{hint}</div>}
    </div>
  );
}
function Row({ label, value, tone }: { label: string; value: string; tone: string }) {
  const tones: Record<string, string> = { slate: 'text-slate-700 dark:text-slate-200', emerald: 'text-emerald-700 dark:text-emerald-400' };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 dark:text-slate-400 font-semibold">{label}</span>
      <span className={['font-extrabold tabular-nums', tones[tone]].join(' ')}>{value}</span>
    </div>
  );
}
function Chk({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={['h-4 w-4 rounded-md flex items-center justify-center shrink-0 transition',
        done ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600'].join(' ')}>
        {done && <CheckCircle2 className="h-3 w-3" />}
      </div>
      <span className={['font-bold', done ? 'text-emerald-800 dark:text-emerald-300 line-through' : 'text-slate-600 dark:text-slate-300'].join(' ')}>{label}</span>
    </div>
  );
}
