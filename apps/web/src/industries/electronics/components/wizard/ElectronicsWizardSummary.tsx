import { useQuery } from '@tanstack/react-query';
import {
  Boxes, Barcode, TrendingUp, DollarSign, Shield,
  AlertTriangle, CheckCircle2, Sparkles, Tag, Check,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import type { ElectronicsWizardDraft } from '../../hooks/useElectronicsWizard';

/* ═════════════════════════════════════════════════════════════
   📋 WIZARD SUMMARY SIDEBAR (FULL BEST v2)
   🌙 Dark mode • live stats • checklist • sticky on desktop
   ═════════════════════════════════════════════════════════════ */

interface Props {
  draft: ElectronicsWizardDraft;
  stats: {
    variantCount: number;
    serialCount: number;
    totalStock: number;
    stockValue: number;
    stockCost: number;
    potentialProfit: number;
    profitMargin: number;
  };
  allValid: boolean;
}

export function ElectronicsWizardSummary({ draft, stats, allValid }: Props) {
  const hasName = !!draft.basic.name.trim();
  const hasPrice = Number(draft.basic.retailPrice || 0) > 0;

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const categoryName = (cats as any[]).find((c) => c.id === draft.basic.categoryId)?.name ?? '';

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      {/* Header card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-900 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft — kuch baqi</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Product name...'}
          </h3>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] font-bold text-white/80">
            {draft.basic.modelNumber && <span className="font-mono">Model: {draft.basic.modelNumber}</span>}
            {draft.basic.sku && <span className="font-mono">• {draft.basic.sku}</span>}
          </div>
          {hasPrice && (
            <div className="mt-3">
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300">
                {formatPKRFull(Number(draft.basic.retailPrice || 0))}
              </div>
              <div className="text-xs font-bold text-white/70">retail price</div>
            </div>
          )}
          {categoryName && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/15 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider">
              <Tag className="h-3 w-3" />
              {categoryName}
            </div>
          )}
          {draft.basic.conditionType && draft.basic.conditionType !== 'BRAND_NEW' && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/30 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300/40">
              {draft.basic.conditionType.replace(/_/g, ' ')}
            </div>
          )}
        </div>
      </div>

      {/* Counts */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
          <Cell icon={Boxes} label="Variants" value={stats.variantCount} hint={draft.hasVariants ? 'variants on' : 'no variants'} tone="violet" />
          <Cell icon={Barcode} label="Serials" value={stats.serialCount} hint={draft.hasSerials ? 'tracked' : 'not tracked'} tone="amber" />
        </div>
        {draft.warranty.warrantyMonths ? (
          <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-gradient-to-br from-blue-50 to-white dark:from-blue-500/10 dark:to-transparent">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3 w-3 text-blue-700 dark:text-blue-400" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700 dark:text-blue-400">Warranty</div>
            </div>
            <div className="text-2xl font-extrabold text-blue-900 dark:text-blue-200 tabular-nums">
              {draft.warranty.warrantyMonths} <span className="text-sm">months</span>
            </div>
            <div className="text-[10px] text-blue-700 dark:text-blue-400 font-bold">{draft.warranty.warrantyType}</div>
          </div>
        ) : null}
        <div className="border-t-2 border-slate-100 dark:border-slate-800 p-4 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-transparent">
          <div className="flex items-center gap-1.5 mb-1">
            <Boxes className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-400">Total Stock</div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-900 dark:text-emerald-200 tabular-nums">{stats.totalStock} <span className="text-sm">pcs</span></div>
        </div>
      </div>

      {/* Finance */}
      {stats.totalStock > 0 && hasPrice && (
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Financial preview
          </div>
          <Row label="Cost value" value={formatPKRFull(stats.stockCost)} tone="slate" />
          <Row label="Retail value" value={formatPKRFull(stats.stockValue)} tone="emerald" />
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Potential profit
              </div>
              <div className={['text-sm font-extrabold tabular-nums',
                stats.potentialProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'].join(' ')}>
                {formatPKRFull(stats.potentialProfit)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
              <span>Margin</span>
              <span className={stats.profitMargin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                {stats.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Marketing flags */}
      {(draft.basic.isFeatured || draft.basic.isBestSeller || draft.basic.isNewArrival || draft.basic.isTrending) && (
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-3">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Marketing flags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.basic.isFeatured && <Flag icon="⭐" label="Featured" tone="amber" />}
            {draft.basic.isBestSeller && <Flag icon="🏆" label="Best Seller" tone="orange" />}
            {draft.basic.isNewArrival && <Flag icon="🆕" label="New Arrival" tone="emerald" />}
            {draft.basic.isTrending && <Flag icon="🔥" label="Trending" tone="rose" />}
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Checklist
        </div>
        <Chk done={hasName} label="Product name" />
        <Chk done={hasPrice} label="Retail price" />
        <Chk done={!!draft.basic.electronicsBrandId} label="Brand" />
        <Chk done={stats.totalStock > 0} label="Stock added" />
      </div>

      <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-2.5 text-[10px] text-blue-800 dark:text-blue-300 font-extrabold text-center">
        💾 Draft auto-saved — safai se close karo, wapas mile ga
      </div>
    </aside>
  );
}

/* ══════════ HELPERS ══════════ */
function Cell({ icon: Icon, label, value, tone, hint }: any) {
  const tones: Record<string, string> = {
    violet: 'text-violet-700 dark:text-violet-400',
    amber: 'text-amber-700 dark:text-amber-400',
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
  const tones: Record<string, string> = {
    slate: 'text-slate-700 dark:text-slate-200',
    emerald: 'text-emerald-700 dark:text-emerald-400',
  };
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
      <div className={['h-4 w-4 rounded-md flex items-center justify-center shrink-0',
        done ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600'].join(' ')}>
        {done && <Check className="h-3 w-3" />}
      </div>
      <span className={['font-bold', done ? 'text-emerald-800 dark:text-emerald-300 line-through' : 'text-slate-600 dark:text-slate-400'].join(' ')}>{label}</span>
    </div>
  );
}

function Flag({ icon, label, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-500/40',
    orange: 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-500/40',
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-500/40',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${tones[tone]}`}>
      {icon} {label}
    </span>
  );
}
