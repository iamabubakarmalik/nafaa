import {
  Sofa, Boxes, TrendingUp, DollarSign, Shield, Ruler,
  AlertTriangle, CheckCircle2, Sparkles, Leaf, Hammer,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { FurnitureWizardDraft } from '../../hooks/useFurnitureWizard';

interface Props {
  draft: FurnitureWizardDraft;
  stats: {
    variantCount: number;
    totalStock: number;
    stockValue: number;
    stockCost: number;
    potentialProfit: number;
    profitMargin: number;
  };
  allValid: boolean;
}

export function FurnitureWizardSummary({ draft, stats, allValid }: Props) {
  const hasName = !!draft.basic.name.trim();
  const hasPrice = Number(draft.basic.retailPrice || 0) > 0;

  const hasDimensions = draft.dimensions.lengthCm && draft.dimensions.widthCm && draft.dimensions.heightCm;

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-800 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft — incomplete</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Product name...'}
          </h3>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] font-bold text-white/80">
            {draft.basic.sku && <span className="font-mono">{draft.basic.sku}</span>}
            {draft.basic.brand && <span>• {draft.basic.brand}</span>}
          </div>
          {hasPrice && (
            <div className="mt-3">
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300">
                {formatPKRFull(Number(draft.basic.retailPrice || 0))}
              </div>
              <div className="text-xs font-bold text-white/70">retail price</div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {draft.basic.categoryType && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider">
                <Sofa className="h-3 w-3" /> {draft.basic.categoryType.replace(/_/g, ' ')}
              </span>
            )}
            {draft.materials.primaryMaterial && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider">
                {draft.materials.primaryMaterial.replace(/_/g, ' ')}
              </span>
            )}
            {draft.basic.conditionType && draft.basic.conditionType !== 'BRAND_NEW' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/30 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300/40">
                {draft.basic.conditionType.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {hasDimensions && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 flex items-center gap-1">
            <Ruler className="h-3 w-3" /> Dimensions
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniDim label="L" value={String(draft.dimensions.lengthCm || '—')} />
            <MiniDim label="W" value={String(draft.dimensions.widthCm || '—')} />
            <MiniDim label="H" value={String(draft.dimensions.heightCm || '—')} />
          </div>
          {draft.dimensions.seatingCapacity && (
            <div className="mt-2 pt-2 border-t border-slate-100 text-xs font-extrabold text-slate-700">
              🪑 {draft.dimensions.seatingCapacity}-seater
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <Cell icon={Boxes} label="Variants" value={stats.variantCount} hint={draft.hasVariants ? 'variants on' : 'single SKU'} tone="orange" />
          <Cell icon={Boxes} label="Total Stock" value={stats.totalStock} hint="pieces" tone="emerald" />
        </div>

        {draft.delivery.warrantyMonths ? (
          <div className="border-t border-slate-100 p-4 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3 w-3 text-blue-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">Warranty</div>
            </div>
            <div className="text-2xl font-extrabold text-blue-900 tabular-nums">
              {draft.delivery.warrantyMonths} <span className="text-sm">months</span>
            </div>
            <div className="text-[10px] text-blue-700 font-bold">{draft.delivery.warrantyType}</div>
          </div>
        ) : null}
      </div>

      {stats.totalStock > 0 && hasPrice && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Financial preview
          </div>
          <Row label="Cost value" value={formatPKRFull(stats.stockCost)} tone="slate" />
          <Row label="Retail value" value={formatPKRFull(stats.stockValue)} tone="emerald" />
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" /> Potential profit
              </div>
              <div className={['text-sm font-extrabold tabular-nums',
                stats.potentialProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                {formatPKRFull(stats.potentialProfit)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mt-1">
              <span>Margin</span>
              <span className={stats.profitMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                {stats.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {(draft.basic.isFeatured || draft.basic.isBestSeller || draft.basic.isNewArrival || draft.basic.isCustomMade || draft.basic.isEcoFriendly) && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Flags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.basic.isFeatured && <Flag icon="⭐" label="Featured" tone="amber" />}
            {draft.basic.isBestSeller && <Flag icon="🏆" label="Best Seller" tone="orange" />}
            {draft.basic.isNewArrival && <Flag icon="🆕" label="New Arrival" tone="emerald" />}
            {draft.basic.isCustomMade && <Flag icon="🔨" label="Custom Made" tone="violet" />}
            {draft.basic.isEcoFriendly && <Flag icon="🌿" label="Eco-Friendly" tone="green" />}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Checklist
        </div>
        <Chk done={hasName} label="Product name" />
        <Chk done={hasPrice} label="Retail price" />
        <Chk done={!!draft.basic.categoryType} label="Category" />
        <Chk done={!!draft.materials.primaryMaterial} label="Primary material" />
        <Chk done={!!hasDimensions} label="Dimensions" />
        <Chk done={stats.totalStock > 0} label="Stock added" />
      </div>

      <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-2.5 text-[10px] text-amber-800 font-extrabold text-center">
        💾 Draft auto-saved — safe to close and return later
      </div>
    </aside>
  );
}

function MiniDim({ label, value }: any) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
      <div className="text-[9px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-lg font-extrabold text-slate-900 tabular-nums">{value}</div>
      <div className="text-[9px] text-slate-500 font-bold">cm</div>
    </div>
  );
}

function Cell({ icon: Icon, label, value, tone, hint }: any) {
  const tones: Record<string, string> = { orange: 'text-orange-700', emerald: 'text-emerald-700' };
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

function Chk({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={['h-4 w-4 rounded-md flex items-center justify-center shrink-0',
        done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300'].join(' ')}>
        {done && <CheckCircle2 className="h-3 w-3" />}
      </div>
      <span className={['font-bold', done ? 'text-emerald-800 line-through' : 'text-slate-600'].join(' ')}>{label}</span>
    </div>
  );
}

function Flag({ icon, label, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    violet: 'bg-violet-100 text-violet-800 border-violet-300',
    green: 'bg-green-100 text-green-800 border-green-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${tones[tone]}`}>
      {icon} {label}
    </span>
  );
}
