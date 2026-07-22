import {
  Package, TrendingUp, DollarSign, AlertTriangle, CheckCircle2,
  Layers, Truck, ShieldCheck, Star, Zap,
} from 'lucide-react';
import { formatPKRFull } from '@/lib/format';
import type { HardwareWizardDraft } from '../../hooks/useHardwareWizard';

interface Props {
  draft: HardwareWizardDraft;
  stats: {
    bulkTierCount: number;
    hasReorder: boolean;
    profit: number;
    margin: number;
    stockValue: number;
    stockCost: number;
    potentialProfit: number;
    minBulkPrice: number;
  };
  allValid: boolean;
}

export function HardwareWizardSummary({ draft, stats, allValid }: Props) {
  const salePrice = Number(draft.basic.salePrice || 0);
  const initialStock = Number(draft.basic.initialStock || 0);

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Hardware Product'}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.basic.isFeatured && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[9px] font-extrabold uppercase border border-amber-300/40">
                <Star className="h-2 w-2 fill-current" /> Featured
              </span>
            )}
            {draft.basic.isBestSeller && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-extrabold uppercase border border-emerald-300/40">
                <TrendingUp className="h-2 w-2" /> Best Seller
              </span>
            )}
            {draft.basic.isFastMoving && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 text-[9px] font-extrabold uppercase border border-red-300/40">
                <Zap className="h-2 w-2" /> Fast
              </span>
            )}
            {draft.basic.requiresTruck && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-500/30 text-slate-200 text-[9px] font-extrabold uppercase border border-slate-300/40">
                <Truck className="h-2 w-2" /> Truck
              </span>
            )}
            {draft.basic.hasIsoCertification && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 text-[9px] font-extrabold uppercase border border-blue-300/40">
                <ShieldCheck className="h-2 w-2" /> ISO
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={Layers} label="Bulk Tiers" value={stats.bulkTierCount} tone="amber"
            hint={stats.bulkTierCount > 0 ? `min ${formatPKRFull(stats.minBulkPrice)}` : 'no tiers'} />
          <StatCell icon={AlertTriangle} label="Reorder" value={stats.hasReorder ? 'ON' : 'OFF'} tone="rose" />
        </div>
        <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="h-3 w-3 text-amber-700" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">
              Initial Stock ({draft.basic.unit || 'pcs'})
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-900 tabular-nums">
            {initialStock}
          </div>
        </div>
      </div>

      {salePrice > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Finance
          </div>
          <Row label="Sale price" value={formatPKRFull(salePrice)} tone="emerald" />
          {Number(draft.basic.costPrice || 0) > 0 && (
            <Row label="Cost" value={formatPKRFull(Number(draft.basic.costPrice || 0))} tone="slate" />
          )}
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
          {stats.stockValue > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <Row label="Stock value" value={formatPKRFull(stats.stockValue)} tone="emerald" />
              <Row label="Potential profit" value={formatPKRFull(stats.potentialProfit)} tone="amber" />
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
    amber: 'text-amber-700',
    rose: 'text-rose-700',
    emerald: 'text-emerald-700',
    orange: 'text-orange-700',
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
  const tones: Record<string, string> = {
    slate: 'text-slate-700', emerald: 'text-emerald-700', amber: 'text-amber-700',
  };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className={['font-extrabold tabular-nums', tones[tone]].join(' ')}>{value}</span>
    </div>
  );
}
