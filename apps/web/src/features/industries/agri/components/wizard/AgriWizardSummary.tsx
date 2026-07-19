import {
  Wheat, FlaskConical, ShieldCheck, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Leaf, Sprout, AlertCircle, Award,
} from 'lucide-react';
import { formatPKRFull } from '@/lib/format';
import type { AgriWizardDraft } from '../../hooks/useAgriWizard';

interface Props {
  draft: AgriWizardDraft;
  stats: {
    targetCropCount: number;
    targetPestCount: number;
    targetAnimalCount: number;
    stockValue: number;
    stockCost: number;
    profit: number;
    margin: number;
    hasOrganicCert: boolean;
    hasGovtReg: boolean;
    isRestricted: boolean;
  };
  allValid: boolean;
}

export function AgriWizardSummary({ draft, stats, allValid }: Props) {
  const catEmoji: Record<string, string> = {
    SEEDS: '🌱', FERTILIZER: '🧪', PESTICIDE: '💊', HERBICIDE: '🌿',
    FUNGICIDE: '🍄', INSECTICIDE: '🐛', ANIMAL_FEED: '🐄', POULTRY_FEED: '🐔',
    CATTLE_FEED: '🐮', FISH_FEED: '🐟', VETERINARY_MEDICINE: '💉',
    FARM_TOOLS: '🔧', IRRIGATION: '💧', MACHINERY_PART: '⚙️',
    ORGANIC_INPUT: '🍃', OTHER: '📦',
  };

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-lime-900 to-green-800 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-lime-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Agri Product'}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/15 text-white text-[9px] font-extrabold uppercase border border-white/20">
              {catEmoji[draft.basic.agriCategory] || '🌾'} {draft.basic.agriCategory.replace(/_/g, ' ')}
            </span>
            {stats.hasOrganicCert && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-extrabold uppercase border border-emerald-300/40">
                <Leaf className="h-2 w-2" /> Organic
              </span>
            )}
            {stats.isRestricted && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 text-[9px] font-extrabold uppercase border border-rose-300/40 animate-pulse">
                <AlertCircle className="h-2 w-2" /> Restricted
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <StatCell icon={Sprout} label="Crops" value={stats.targetCropCount} tone="green" />
          <StatCell icon={AlertCircle} label="Pests" value={stats.targetPestCount} tone="amber" />
          <StatCell icon={Wheat} label="Animals" value={stats.targetAnimalCount} tone="violet" />
        </div>
        {stats.hasGovtReg && (
          <div className="border-t border-slate-100 p-3 bg-blue-50">
            <div className="flex items-center gap-1.5">
              <Award className="h-3 w-3 text-blue-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">
                Govt Registered
              </div>
            </div>
          </div>
        )}
      </div>

      {Number(draft.basic.salePrice || 0) > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Finance
          </div>
          <Row label="Sale price" value={formatPKRFull(Number(draft.basic.salePrice || 0))} tone="emerald" />
          {Number(draft.basic.costPrice || 0) > 0 && (
            <Row label="Cost" value={formatPKRFull(Number(draft.basic.costPrice || 0))} tone="slate" />
          )}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" /> Profit per {draft.basic.baseUnit}
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

      {Number(draft.safety.currentStock || 0) > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-lime-50 to-white border-2 border-lime-200 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Wheat className="h-3 w-3 text-lime-700" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-lime-700">
              Stock Value
            </div>
          </div>
          <div className="text-2xl font-extrabold text-lime-900 tabular-nums">
            {formatPKRFull(stats.stockValue)}
          </div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">
            {draft.safety.currentStock} {draft.basic.baseUnit} in stock
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
    green: 'text-green-700', amber: 'text-amber-700',
    violet: 'text-violet-700', lime: 'text-lime-700',
  };
  return (
    <div className="p-3">
      <div className="flex items-center gap-1 mb-1">
        <Icon className={['h-3 w-3', tones[tone]].join(' ')} />
        <div className={['text-[9px] uppercase tracking-wider font-extrabold', tones[tone]].join(' ')}>{label}</div>
      </div>
      <div className="text-xl font-extrabold text-slate-900 tabular-nums">{value}</div>
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
