import {
  Package, Palette, Smartphone, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import { PTA_STATUS_COLORS, PTA_STATUS_LABELS, type PtaStatus } from '../../api/imei.api';
import type { MobileWizardDraft } from '../../hooks/useMobileWizard';

interface Props {
  draft: MobileWizardDraft;
  stats: {
    variantCount: number;
    imeiCount: number;
    validImeiCount: number;
    accessoryUnits: number;
    totalUnits: number;
    totalCost: number;
    totalSaleValue: number;
    potentialProfit: number;
    profitMargin: number;
    ptaBreakdown: Record<string, number>;
  };
  allValid: boolean;
}

export function MobileWizardSummary({ draft, stats, allValid }: Props) {
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      {/* HEADER */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                Ready to Save
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 text-amber-300" />
                Draft in Progress
              </>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Mobile Product'}
          </h3>
          {draft.basic.modelNumber && (
            <div className="text-xs text-white/70 font-mono mt-1">Model: {draft.basic.modelNumber}</div>
          )}
          <div className="text-[10px] text-white/70 font-extrabold uppercase tracking-wider mt-1">
            Type: <span className="text-blue-300">{draft.basic.productType}</span>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell
            icon={Palette}
            label="Variants"
            value={stats.variantCount}
            tone="violet"
            hint={draft.hasVariants ? undefined : 'No variants'}
          />
          <StatCell
            icon={Smartphone}
            label="IMEIs"
            value={stats.imeiCount}
            tone="blue"
            hint={stats.validImeiCount !== stats.imeiCount ? `${stats.validImeiCount} valid` : undefined}
          />
        </div>
        {stats.accessoryUnits > 0 && (
          <div className="border-t border-slate-100 p-4 bg-slate-50">
            <div className="flex items-center gap-1.5 mb-1">
              <Package className="h-3 w-3 text-emerald-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">
                Accessory Units
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-900 tabular-nums">
              {stats.accessoryUnits}
            </div>
          </div>
        )}
        <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Package className="h-3 w-3 text-blue-700" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">
              Total Units
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-900 tabular-nums">
            {stats.totalUnits}
          </div>
        </div>
      </div>

      {/* PTA breakdown */}
      {Object.keys(stats.ptaBreakdown).length > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            PTA Breakdown
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.ptaBreakdown).map(([status, count]) => {
              const colors = PTA_STATUS_COLORS[status as PtaStatus];
              return (
                <span
                  key={status}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${colors.bg} ${colors.text} border ${colors.border}`}
                >
                  {count} {PTA_STATUS_LABELS[status as PtaStatus]}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* FINANCE */}
      {stats.totalUnits > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Finance
          </div>
          <Row label="Cost value" value={formatPKRFull(stats.totalCost)} tone="slate" />
          <Row label="Sale value" value={formatPKRFull(stats.totalSaleValue)} tone="emerald" />
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                Potential profit
              </div>
              <div className={[
                'text-sm font-extrabold tabular-nums',
                stats.potentialProfit >= 0 ? 'text-emerald-700' : 'text-rose-700',
              ].join(' ')}>
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

      <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[10px] text-slate-500 font-semibold text-center">
        💾 Draft auto-saves — safai se close karo, wapas mile ga
      </div>
    </aside>
  );
}

function StatCell({
  icon: Icon, label, value, tone, hint,
}: { icon: any; label: string; value: number | string; tone: string; hint?: string }) {
  const tones: Record<string, string> = {
    violet: 'text-violet-700',
    blue: 'text-blue-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={['h-3 w-3', tones[tone]].join(' ')} />
        <div className={['text-[10px] uppercase tracking-wider font-extrabold', tones[tone]].join(' ')}>
          {label}
        </div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{hint}</div>}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className={['font-extrabold tabular-nums', tones[tone]].join(' ')}>{value}</span>
    </div>
  );
}
