import {
  Beef, ShieldCheck, MapPin, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Star, Snowflake, Award,
  Leaf, Package,
} from 'lucide-react';
import { formatPKRFull } from '@/lib/format';
import type { MeatWizardDraft } from '../../hooks/useMeatWizard';

interface Props {
  draft: MeatWizardDraft;
  stats: {
    pricePerKg: number;
    cost: number;
    profit: number;
    margin: number;
    certCount: number;
    hasFarmInfo: boolean;
    hasNutrition: boolean;
  };
  allValid: boolean;
}

const ANIMAL_EMOJI: Record<string, string> = {
  BEEF: '🐄', MUTTON: '🐑', GOAT: '🐐', LAMB: '🐏',
  CHICKEN: '🐔', DUCK: '🦆', TURKEY: '🦃', QUAIL: '🐦',
  CAMEL: '🐫', BUFFALO: '🐃', FISH: '🐟', PRAWN: '🦐',
};

export function MeatWizardSummary({ draft, stats, allValid }: Props) {
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-rose-800 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-red-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-3xl">{ANIMAL_EMOJI[draft.basic.animalType] || '🥩'}</span>
            <h3 className="font-extrabold text-xl leading-tight line-clamp-2 flex-1">
              {draft.basic.name || 'Untitled Meat Product'}
            </h3>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.halalQuality.isHalalCertified && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-extrabold uppercase border border-emerald-300/40">
                <ShieldCheck className="h-2 w-2" /> HALAL
              </span>
            )}
            {draft.halalQuality.isOrganic && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/30 text-green-200 text-[9px] font-extrabold uppercase border border-green-300/40">
                <Leaf className="h-2 w-2" /> ORGANIC
              </span>
            )}
            {draft.halalQuality.isFrozen && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 text-[9px] font-extrabold uppercase border border-blue-300/40">
                <Snowflake className="h-2 w-2" /> FROZEN
              </span>
            )}
            {draft.basic.isBoneless && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-500/30 text-slate-100 text-[9px] font-extrabold uppercase border border-slate-300/40">
                BONELESS
              </span>
            )}
            {draft.origin.isPopular && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 text-[9px] font-extrabold uppercase border border-red-300/40">
                <TrendingUp className="h-2 w-2" /> POPULAR
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={ShieldCheck} label="Certifications" value={stats.certCount} tone="emerald" />
          <StatCell icon={Award} label="Grade" value={draft.halalQuality.qualityGrade.replace('_', ' ')} tone="amber" small />
        </div>
        <div className="border-t border-slate-100 grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={MapPin} label="Farm Info" value={stats.hasFarmInfo ? 'Yes' : 'No'} tone="blue" small />
          <StatCell icon={Package} label="Nutrition" value={stats.hasNutrition ? 'Yes' : 'No'} tone="violet" small />
        </div>
        <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-red-50 to-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Beef className="h-3 w-3 text-red-700" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-red-700">
              Cut Category
            </div>
          </div>
          <div className="text-lg font-extrabold text-red-900 leading-tight">
            {draft.basic.cutCategory.replace(/_/g, ' ')}
          </div>
          <div className="text-[10px] text-red-700 font-bold mt-0.5">
            {draft.basic.freshnessType.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {stats.pricePerKg > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Pricing per kg
          </div>
          <Row label="Sale price/kg" value={formatPKRFull(stats.pricePerKg)} tone="emerald" />
          {stats.cost > 0 && <Row label="Cost/kg" value={formatPKRFull(stats.cost)} tone="slate" />}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                Profit per kg
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

function StatCell({ icon: Icon, label, value, tone, small }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    violet: 'text-violet-700',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={['h-3 w-3', tones[tone]].join(' ')} />
        <div className={['text-[10px] uppercase tracking-wider font-extrabold', tones[tone]].join(' ')}>{label}</div>
      </div>
      <div className={[small ? 'text-sm' : 'text-2xl', 'font-extrabold text-slate-900 tabular-nums leading-tight'].join(' ')}>{value}</div>
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
