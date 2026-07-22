import {
  ChefHat, Sparkles, BookOpen, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Star, Flame, Clock, Leaf,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { RestaurantWizardDraft } from '../../hooks/useRestaurantWizard';

interface Props {
  draft: RestaurantWizardDraft;
  stats: {
    dietaryTagCount: number;
    modifierGroupCount: number;
    ingredientCount: number;
    recipeCost: number;
    effectiveCost: number;
    profit: number;
    margin: number;
  };
  allValid: boolean;
}

export function RestaurantWizardSummary({ draft, stats, allValid }: Props) {
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-orange-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Menu Item'}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.basic.chefSpecial && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 text-[9px] font-extrabold uppercase border border-amber-300/40">
                <Star className="h-2 w-2 fill-current" /> Chef Special
              </span>
            )}
            {draft.basic.bestSeller && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 text-[9px] font-extrabold uppercase border border-emerald-300/40">
                <TrendingUp className="h-2 w-2" /> Best Seller
              </span>
            )}
            {draft.modifiers.isSpicy && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 text-[9px] font-extrabold uppercase border border-red-300/40">
                <Flame className="h-2 w-2" /> {draft.modifiers.spiceLevel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <StatCell icon={Leaf} label="Dietary Tags" value={stats.dietaryTagCount} tone="emerald" />
          <StatCell icon={Sparkles} label="Modifiers" value={stats.modifierGroupCount} tone="pink" />
        </div>
        {draft.recipe.hasRecipe && (
          <div className="border-t border-slate-100 p-4 bg-amber-50">
            <div className="flex items-center gap-1.5 mb-1">
              <BookOpen className="h-3 w-3 text-amber-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">
                Recipe Ingredients
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-900 tabular-nums">
              {stats.ingredientCount}
            </div>
          </div>
        )}
        <div className="border-t-2 border-slate-100 p-4 bg-gradient-to-br from-orange-50 to-white">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="h-3 w-3 text-orange-700" />
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-orange-700">
              Prep Time
            </div>
          </div>
          <div className="text-3xl font-extrabold text-orange-900 tabular-nums">
            {draft.basic.prepTimeMinutes || 0} <span className="text-lg">min</span>
          </div>
        </div>
      </div>

      {Number(draft.basic.salePrice || 0) > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Finance
          </div>
          <Row label="Sale price" value={formatPKRFull(Number(draft.basic.salePrice || 0))} tone="emerald" />
          {draft.recipe.hasRecipe && stats.recipeCost > 0 && (
            <Row label="Recipe cost" value={formatPKRFull(stats.recipeCost)} tone="amber" />
          )}
          <Row label="Effective cost" value={formatPKRFull(stats.effectiveCost)} tone="slate" />
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                Profit per item
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

function StatCell({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700',
    pink: 'text-pink-700',
    amber: 'text-amber-700',
    orange: 'text-orange-700',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={['h-3 w-3', tones[tone]].join(' ')} />
        <div className={['text-[10px] uppercase tracking-wider font-extrabold', tones[tone]].join(' ')}>{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
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
