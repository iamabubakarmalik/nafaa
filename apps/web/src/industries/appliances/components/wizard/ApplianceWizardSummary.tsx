import {
  Home, Boxes, Barcode, TrendingUp, DollarSign, Shield,
  AlertTriangle, CheckCircle2, Sparkles, HardHat, Truck, Zap,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { ApplianceWizardDraft } from '../../hooks/useApplianceWizard';

interface Props {
  draft: ApplianceWizardDraft;
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

export function ApplianceWizardSummary({ draft, stats, allValid }: Props) {
  const hasName = !!draft.basic.name.trim();
  const hasPrice = Number(draft.basic.retailPrice || 0) > 0;

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      {/* Header card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl" />
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
            {draft.basic.modelYear && <span>• {draft.basic.modelYear}</span>}
          </div>
          {hasPrice && (
            <div className="mt-3">
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300">
                {formatPKRFull(Number(draft.basic.retailPrice || 0))}
              </div>
              <div className="text-xs font-bold text-white/70">retail price</div>
              {draft.basic.emiStartingFrom && (
                <div className="mt-1 text-[10px] font-bold text-cyan-200">
                  EMI from {formatPKRFull(Number(draft.basic.emiStartingFrom))}/month
                </div>
              )}
            </div>
          )}
          {draft.basic.categoryType && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/15 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider">
              <Home className="h-3 w-3" />
              {draft.basic.categoryType.replace(/_/g, ' ')}
            </div>
          )}
        </div>
      </div>

      {/* Energy & installation flags */}
      {(draft.specs.isInverter || draft.specs.isEnergyStar || draft.installation.requiresInstallation || draft.installation.freeDelivery) && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">Key highlights</div>
          <div className="flex flex-wrap gap-1.5">
            {draft.specs.isInverter && <Flag icon="⚡" label="Inverter" tone="blue" />}
            {draft.specs.isEnergyStar && <Flag icon="⭐" label="Energy Star" tone="emerald" />}
            {draft.installation.installationCovered && <Flag icon="🎁" label="Free Install" tone="amber" />}
            {draft.installation.freeDelivery && <Flag icon="🚚" label="Free Delivery" tone="violet" />}
            {draft.installation.requiresGasConnection && <Flag icon="🔥" label="Gas" tone="orange" />}
            {draft.installation.requiresPlumbing && <Flag icon="💧" label="Plumbing" tone="sky" />}
          </div>
        </div>
      )}

      {/* Counts */}
      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <Cell icon={Boxes} label="Variants" value={stats.variantCount} hint={draft.hasVariants ? 'variants on' : 'no variants'} tone="violet" />
          <Cell icon={Barcode} label="Serials" value={stats.serialCount} hint={draft.hasSerials ? 'tracked' : 'not tracked'} tone="amber" />
        </div>
        {draft.warranty.warrantyMonths ? (
          <div className="border-t border-slate-100 p-4 bg-gradient-to-br from-cyan-50 to-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3 w-3 text-cyan-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-700">Warranty</div>
            </div>
            <div className="text-2xl font-extrabold text-cyan-900 tabular-nums">
              {draft.warranty.warrantyMonths} <span className="text-sm">months</span>
            </div>
            {draft.warranty.compressorWarrantyMonths ? (
              <div className="text-[10px] text-blue-700 font-bold mt-0.5">
                + Compressor: {draft.warranty.compressorWarrantyMonths >= 999 ? 'Lifetime' : `${draft.warranty.compressorWarrantyMonths}m`}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Boxes className="h-3 w-3 text-emerald-700" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Total Stock</div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-900 tabular-nums">{stats.totalStock} <span className="text-sm">pcs</span></div>
        </div>
      </div>

      {/* Installation summary */}
      {draft.installation.requiresInstallation && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <HardHat className="h-4 w-4 text-amber-700" />
            <div className="text-xs font-extrabold text-amber-800">Installation needed</div>
          </div>
          {draft.installation.installationCharge ? (
            <div className="text-sm font-extrabold text-slate-900">
              Charge: {formatPKRFull(Number(draft.installation.installationCharge))}
            </div>
          ) : null}
          {draft.installation.installationTimeHours ? (
            <div className="text-[10px] font-bold text-slate-600">
              Approx {draft.installation.installationTimeHours} hours
            </div>
          ) : null}
        </div>
      )}

      {/* Finance */}
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

      {/* Checklist */}
      <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Checklist
        </div>
        <Chk done={hasName} label="Product name" />
        <Chk done={hasPrice} label="Retail price" />
        <Chk done={!!draft.basic.categoryType} label="Category type" />
        <Chk done={!!draft.basic.applianceBrandId} label="Brand" />
        <Chk done={!!draft.warranty.warrantyMonths} label="Warranty months" />
        <Chk done={stats.totalStock > 0} label="Stock added" />
      </div>

      <div className="rounded-xl bg-cyan-50 border-2 border-cyan-200 p-2.5 text-[10px] text-cyan-800 font-extrabold text-center">
        💾 Draft auto-saved — safai se close karo, wapas mile ga
      </div>
    </aside>
  );
}

function Cell({ icon: Icon, label, value, tone, hint }: any) {
  const tones: Record<string, string> = {
    violet: 'text-violet-700', amber: 'text-amber-700',
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
    rose: 'bg-rose-100 text-rose-800 border-rose-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    sky: 'bg-sky-100 text-sky-800 border-sky-300',
    violet: 'bg-violet-100 text-violet-800 border-violet-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${tones[tone]}`}>
      {icon} {label}
    </span>
  );
}
