import {
  Package, Palette, Layers, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Ruler, Sparkles,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { CarpetWizardDraft } from '../../hooks/useCarpetWizard';

interface Props {
  draft: CarpetWizardDraft;
  stats: {
    variantCount: number;
    rollCount: number;
    pieceCount: number;
    pieceLineCount: number;
    ftTotal: number;
    totalSqft: number;
    totalCost: number;
    totalSaleValue: number;
    potentialProfit: number;
    profitMargin: number;
  };
  allValid: boolean;
}

export function CarpetWizardSummary({ draft, stats, allValid }: Props) {
  const hasName = !!draft.basic.name.trim();
  const hasSale = Number(draft.basic.salePricePerSqft || 0) > 0;
  const hasStock = stats.rollCount > 0 || stats.pieceCount > 0 || stats.ftTotal > 0;

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      {/* Header card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Carpet'}
          </h3>
          {draft.basic.designCode && (
            <div className="text-xs text-white/70 font-mono mt-1">{draft.basic.designCode}</div>
          )}
          <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] font-extrabold">
            <span className="uppercase text-white/70 tracking-wider">Stock:</span>
            <span className="text-emerald-300">{draft.basic.stockType}</span>
          </div>
          {hasSale && (
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300">
                {formatPKRFull(Number(draft.basic.salePricePerSqft || 0))}
              </div>
              <div className="text-xs font-bold text-white/70">
                / {draft.basic.stockType === 'PIECES' ? 'piece' : draft.basic.stockType === 'FT' ? 'ft' : draft.basic.unit}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Counts */}
      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={Palette} label="Colors" value={stats.variantCount} tone="violet" hint={draft.hasVariants ? 'variants' : 'single'} />
          <StatCell icon={Layers} label="Rolls" value={stats.rollCount} tone="emerald" />
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
          <StatCell icon={Package} label="Pieces" value={stats.pieceCount} tone="violet" hint={stats.pieceLineCount > 0 ? `${stats.pieceLineCount} lines` : undefined} />
          <StatCell icon={Ruler} label="Feet" value={stats.ftTotal.toFixed(1)} tone="blue" hint="running ft" />
        </div>
        {stats.totalSqft > 0 && (
          <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-emerald-50 to-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Package className="h-3 w-3 text-emerald-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">
                Total Area
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-900 tabular-nums">
              {stats.totalSqft.toFixed(0)}
              <span className="text-sm ml-1 font-bold">sqft</span>
            </div>
          </div>
        )}
      </div>

      {/* Finance */}
      {hasStock && hasSale && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Finance
          </div>
          <Row label="Cost value" value={formatPKRFull(stats.totalCost)} tone="slate" />
          <Row label="Sale value" value={formatPKRFull(stats.totalSaleValue)} tone="emerald" />
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" /> Potential profit
              </div>
              <div className={['text-sm font-extrabold tabular-nums', stats.potentialProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
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
        </div>
      )}

      {/* Checklist */}
      <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Checklist
        </div>
        <Chk done={hasName} label="Product ka naam" />
        <Chk done={hasSale} label="Bikri rate" />
        <Chk done={!!draft.basic.stockType} label="Stock type chuni" />
        <Chk done={hasStock} label="Stock added (optional)" />
      </div>

      <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-2.5 text-[10px] text-blue-800 font-extrabold text-center">
        💾 Draft khud save hota hai — safai se close karo, wapas mile ga
      </div>
    </aside>
  );
}

function StatCell({ icon: Icon, label, value, tone, hint }: { icon: any; label: string; value: number | string; tone: string; hint?: string }) {
  const tones: Record<string, string> = {
    violet: 'text-violet-700',
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
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

function Row({ label, value, tone }: { label: string; value: string; tone: string }) {
  const tones: Record<string, string> = { slate: 'text-slate-700', emerald: 'text-emerald-700' };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className={['font-extrabold tabular-nums', tones[tone]].join(' ')}>{value}</span>
    </div>
  );
}

function Chk({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={['h-4 w-4 rounded-md flex items-center justify-center shrink-0', done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300'].join(' ')}>
        {done && <CheckCircle2 className="h-3 w-3" />}
      </div>
      <span className={['font-bold', done ? 'text-emerald-800 line-through' : 'text-slate-600'].join(' ')}>{label}</span>
    </div>
  );
}
