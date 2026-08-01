import {
  Baby, Boxes, TrendingUp, DollarSign, ShieldCheck, Cake,
  AlertTriangle, CheckCircle2, Sparkles, Users, Gift,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { ToyWizardDraft } from '../../hooks/useToyWizard';

interface Props {
  draft: ToyWizardDraft;
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

const AGE_LABELS: Record<string, string> = {
  NEWBORN_0_6M: '0-6M', INFANT_6_12M: '6-12M', TODDLER_1_2Y: '1-2Y',
  TODDLER_2_3Y: '2-3Y', PRESCHOOL_3_5Y: '3-5Y', KIDS_5_8Y: '5-8Y',
  KIDS_8_12Y: '8-12Y', TWEEN_12_14Y: '12-14Y', TEEN_14_PLUS: '14+',
  ALL_AGES: 'All',
};

const GENDER_ICONS: Record<string, string> = {
  BOYS: '👦', GIRLS: '👧', UNISEX: '⚧️',
};

export function ToyWizardSummary({ draft, stats, allValid }: Props) {
  const hasName = !!draft.basic.name.trim();
  const hasPrice = Number(draft.basic.retailPrice || 0) > 0;

  const safetyScore = [
    draft.safety.isNonToxic, draft.safety.isBpaFree, draft.safety.isPhthalateFree,
    !draft.safety.chokingHazard,
    (draft.safety.safetyCertifications ?? []).length > 0,
  ].filter(Boolean).length;
  const safetyPct = Math.round((safetyScore / 5) * 100);

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft — incomplete</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Toy title...'}
          </h3>

          {hasPrice && (
            <div className="mt-3">
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300">
                {formatPKRFull(Number(draft.basic.retailPrice || 0))}
              </div>
              <div className="text-xs font-bold text-white/70">retail price</div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {draft.basic.ageGroup && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/30 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300/40">
                <Cake className="h-3 w-3" /> {AGE_LABELS[draft.basic.ageGroup] || draft.basic.ageGroup}
              </span>
            )}
            {draft.basic.genderTarget && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase">
                {GENDER_ICONS[draft.basic.genderTarget]} {draft.basic.genderTarget}
              </span>
            )}
            {draft.basic.characterFranchise && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 backdrop-blur px-2 py-1 text-[10px] font-extrabold uppercase">
                {draft.basic.characterFranchise}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Safety Score */}
      {safetyPct > 0 && (
        <div className={['rounded-2xl border-2 shadow-sm p-4',
          safetyPct >= 80 ? 'bg-emerald-50 border-emerald-300' :
          safetyPct >= 50 ? 'bg-amber-50 border-amber-300' : 'bg-rose-50 border-rose-300'].join(' ')}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-wider font-extrabold">Safety Score</span>
            </div>
            <div className="text-xl font-extrabold tabular-nums">{safetyPct}%</div>
          </div>
          <div className="h-2 rounded-full bg-white/50 overflow-hidden">
            <div className={['h-full',
              safetyPct >= 80 ? 'bg-emerald-500' : safetyPct >= 50 ? 'bg-amber-500' : 'bg-rose-500'].join(' ')}
              style={{ width: `${safetyPct}%` }} />
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <Cell icon={Boxes} label="Variants" value={stats.variantCount} hint={draft.hasVariants ? 'variants on' : 'single'} tone="pink" />
          <Cell icon={Boxes} label="Total Stock" value={stats.totalStock} hint="units" tone="emerald" />
        </div>

        {draft.details.isEducational && (
          <div className="border-t border-slate-100 p-4 bg-gradient-to-br from-violet-50 to-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3 text-violet-700" />
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700">Educational</div>
            </div>
            <div className="text-xs font-extrabold text-violet-900">
              {draft.details.learningAreas.length} learning areas • {draft.details.developmentSkills.length} skills
            </div>
          </div>
        )}
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

      {(draft.basic.isBirthdayGift || draft.basic.isEidGift || draft.basic.isChristmasGift ||
        draft.basic.isFeatured || draft.basic.isBestSeller || draft.basic.isNewArrival) && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-3">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 flex items-center gap-1">
            <Gift className="h-3 w-3" /> Flags & Occasions
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.basic.isFeatured && <Flag icon="⭐" label="Featured" tone="amber" />}
            {draft.basic.isBestSeller && <Flag icon="🏆" label="Best Seller" tone="orange" />}
            {draft.basic.isNewArrival && <Flag icon="🆕" label="New" tone="emerald" />}
            {draft.basic.isBirthdayGift && <Flag icon="🎂" label="Birthday" tone="pink" />}
            {draft.basic.isEidGift && <Flag icon="🌙" label="Eid" tone="emerald" />}
            {draft.basic.isChristmasGift && <Flag icon="🎄" label="Christmas" tone="rose" />}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Checklist
        </div>
        <Chk done={hasName} label="Toy name" />
        <Chk done={hasPrice} label="Retail price" />
        <Chk done={!!draft.basic.categoryType} label="Category" />
        <Chk done={!!draft.basic.ageGroup} label="Age group" />
        <Chk done={(draft.safety.safetyCertifications ?? []).length > 0} label="Safety cert" />
        <Chk done={stats.totalStock > 0} label="Stock added" />
      </div>

      <div className="rounded-xl bg-pink-50 border-2 border-pink-200 p-2.5 text-[10px] text-pink-800 font-extrabold text-center">
        💾 Draft auto-saved — safe to close
      </div>
    </aside>
  );
}

function Cell({ icon: Icon, label, value, tone, hint }: any) {
  const tones: Record<string, string> = { pink: 'text-pink-700', emerald: 'text-emerald-700' };
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
    pink: 'bg-pink-100 text-pink-800 border-pink-300',
    rose: 'bg-rose-100 text-rose-800 border-rose-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${tones[tone]}`}>
      {icon} {label}
    </span>
  );
}
