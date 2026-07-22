import {
  Cake, Package, DollarSign, Sparkles, AlertTriangle, CheckCircle2,
  Star, TrendingUp, Heart, Zap,
} from 'lucide-react';
import { formatPKRFull } from '@/lib/format';
import { CATEGORIES, FLAVORS } from '../../api/constants';
import type { BakeryWizardDraft } from '../../hooks/useBakeryWizard';

interface Props {
  draft: BakeryWizardDraft;
  stats: {
    priceCount: number;
    imageCount: number;
    customizationScore: number;
    dietaryScore: number;
    decorativeItemsCount: number;
    allergensCount: number;
  };
  allValid: boolean;
}

export function BakeryWizardSummary({ draft, stats, allValid }: Props) {
  const category = CATEGORIES.find((c) => c.value === draft.basic.bakeryCategory);
  const flavor = FLAVORS.find((f) => f.value === draft.cake.defaultFlavor);
  const primaryImage = draft.basic.imageUrls[0];

  const minPrice = [
    draft.basic.pricePerKg,
    draft.basic.pricePerPound,
    draft.basic.pricePerPiece,
    draft.basic.pricePerDozen,
    draft.basic.pricePerSlice,
    draft.basic.pricePerBox,
    draft.basic.pricePerTray,
  ].map((p) => Number(p || 0)).filter((p) => p > 0).sort((a, b) => a - b)[0];

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      {/* HEADER */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Bakery Product'}
          </h3>
          {category && (
            <div className="text-xs text-white/80 font-bold mt-1 flex items-center gap-1">
              <span className="text-base">{category.emoji}</span>
              {category.label}
            </div>
          )}
        </div>
      </div>

      {/* PREVIEW IMAGE */}
      <div className="rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
        <div className="relative aspect-square bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-600">
          {primaryImage ? (
            <img src={primaryImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">{category?.emoji || '🎂'}</span>
            </div>
          )}
          {draft.basic.isFeatured && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
              <Star className="h-2.5 w-2.5 fill-current" /> Featured
            </div>
          )}
          {draft.basic.isBestSeller && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5" /> Best
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex gap-1">
            {draft.production.isEggless && <span className="h-6 w-6 rounded-full bg-emerald-500/90 backdrop-blur text-white flex items-center justify-center text-xs">🥚</span>}
            {draft.production.isVegan && <span className="h-6 w-6 rounded-full bg-green-600/90 backdrop-blur text-white flex items-center justify-center text-xs">🌱</span>}
            {draft.production.isSugarFree && <span className="h-6 w-6 rounded-full bg-blue-500/90 backdrop-blur text-white flex items-center justify-center text-xs">🍬</span>}
            {draft.production.isHalal && <span className="h-6 w-6 rounded-full bg-teal-500/90 backdrop-blur text-white flex items-center justify-center text-xs">☪️</span>}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-neutral-800">
          <StatCell icon={DollarSign} label="Prices" value={stats.priceCount} tone="pink" hint={stats.priceCount === 0 ? 'None set' : 'variants'} />
          <StatCell icon={Package} label="Images" value={stats.imageCount} tone="amber" />
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-neutral-800 border-t-2 border-slate-100 dark:border-neutral-800">
          <StatCell icon={Sparkles} label="Custom" value={stats.customizationScore + '/6'} tone="fuchsia" />
          <StatCell icon={Heart} label="Diet" value={stats.dietaryScore + '/4'} tone="emerald" />
        </div>
        {minPrice && (
          <div className="border-t-2 border-slate-100 dark:border-neutral-800 p-4 bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-neutral-900">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-pink-700">
              Starting At
            </div>
            <div className="text-2xl font-extrabold text-pink-900 dark:text-pink-100 tabular-nums">
              {formatPKRFull(minPrice)}
            </div>
          </div>
        )}
      </div>

      {/* FLAVOR PREVIEW */}
      {flavor && draft.basic.bakeryCategory !== 'BREAD' && draft.basic.bakeryCategory !== 'BUN' && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-3">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">
            Default Flavor
          </div>
          <div className={'rounded-xl bg-gradient-to-br ' + flavor.color + ' p-3 text-white text-center'}>
            <div className="text-2xl mb-1">{flavor.emoji}</div>
            <div className="font-extrabold text-sm">{flavor.label}</div>
          </div>
        </div>
      )}

      {/* BADGES */}
      {(stats.customizationScore > 0 || draft.production.allergens.length > 0) && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">
            Highlights
          </div>
          <div className="flex flex-wrap gap-1">
            {draft.cake.allowsMessageOnCake && <Badge label="✍️ Message" tone="pink" />}
            {draft.cake.allowsPhotoOnCake && <Badge label="📸 Photo Cake" tone="fuchsia" />}
            {draft.cake.allowsCustomShape && <Badge label="✨ Custom Shape" tone="purple" />}
            {draft.cake.allowsFlavorChoice && <Badge label="🎨 Flavor Choice" tone="amber" />}
            {draft.cake.allowsSizeChoice && <Badge label="📏 Size Choice" tone="blue" />}
            {draft.production.requiresRefrigeration && <Badge label="❄️ Refrigerate" tone="cyan" />}
            {Number(draft.production.prepTimeHours || 0) > 0 && (
              <Badge label={`⏱️ ${draft.production.prepTimeHours}h prep`} tone="slate" />
            )}
            {Number(draft.production.advanceOrderHours || 0) > 0 && (
              <Badge label={`📅 ${draft.production.advanceOrderHours}h advance`} tone="slate" />
            )}
          </div>
        </div>
      )}

      {/* AUTO-SAVE */}
      <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-700 p-2.5 text-[10px] text-slate-500 font-semibold text-center">
        💾 Draft auto-saves as you type
      </div>
    </aside>
  );
}

function StatCell({ icon: Icon, label, value, tone, hint }: { icon: any; label: string; value: number | string; tone: string; hint?: string }) {
  const tones: Record<string, string> = {
    pink: 'text-pink-700',
    amber: 'text-amber-700',
    fuchsia: 'text-fuchsia-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={'h-3 w-3 ' + tones[tone]} />
        <div className={'text-[10px] uppercase tracking-wider font-extrabold ' + tones[tone]}>{label}</div>
      </div>
      <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{hint}</div>}
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  const tones: Record<string, string> = {
    pink: 'bg-pink-100 text-pink-800 border-pink-200',
    fuchsia: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    slate: 'bg-slate-100 text-slate-800 border-slate-200',
  };
  return (
    <span className={'inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-extrabold ' + tones[tone]}>
      {label}
    </span>
  );
}
