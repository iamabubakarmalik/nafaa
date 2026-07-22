import { User, Target, Heart, CreditCard, CheckCircle2, AlertTriangle, Activity, Award } from 'lucide-react';
import type { GymWizardDraft } from '../../hooks/useGymMemberWizard';

interface Props {
  draft: GymWizardDraft;
  stats: { bmi: number; bmiCategory: string; goalsCount: number; workoutDays: number; hasPhoto: boolean; hasPlan: boolean };
  allValid: boolean;
}

export function GymWizardSummary({ draft, stats, allValid }: Props) {
  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-orange-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-red-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
              : <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.customerName || 'New Gym Member'}
          </h3>
          {draft.basic.customerPhone && <div className="text-xs text-white/70 font-bold mt-1">📞 {draft.basic.customerPhone}</div>}
        </div>
      </div>

      {stats.hasPhoto && draft.subscription.photoUrl && (
        <div className="rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
          <div className="relative aspect-square bg-gradient-to-br from-red-400 via-orange-500 to-red-600">
            <img src={draft.subscription.photoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-2.5">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
          <Activity className="h-3 w-3" /> Body Stats
        </div>
        {stats.bmi > 0 && (
          <>
            <Row label="BMI" value={stats.bmi.toFixed(1)} highlight />
            <Row label="Category" value={stats.bmiCategory} />
          </>
        )}
        {draft.basic.heightCm && <Row label="Height" value={draft.basic.heightCm + ' cm'} />}
        {draft.basic.currentWeightKg && <Row label="Weight" value={draft.basic.currentWeightKg + ' kg'} />}
        {draft.basic.targetWeightKg && <Row label="Target" value={draft.basic.targetWeightKg + ' kg'} highlight />}
      </div>

      <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-2">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
          <Target className="h-3 w-3" /> Goals & Schedule
        </div>
        <Row label="Goals" value={stats.goalsCount + ' selected'} />
        <Row label="Workout Days" value={stats.workoutDays + '/week'} />
        <Row label="Level" value={draft.basic.fitnessLevel} />
      </div>

      {(stats.hasPhoto || stats.hasPlan) && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800 p-3 space-y-1">
          <div className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1">Ready</div>
          {stats.hasPhoto && <div className="text-xs font-bold text-emerald-800">✓ Photo uploaded</div>}
          {stats.hasPlan && <div className="text-xs font-bold text-emerald-800">✓ Plan selected</div>}
        </div>
      )}

      <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-700 p-2.5 text-[10px] text-slate-500 font-semibold text-center">
        💾 Draft auto-saves as you type
      </div>
    </aside>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 font-semibold">{label}</span>
      <span className={'font-extrabold ' + (highlight ? 'text-red-700' : 'text-slate-900 dark:text-white')}>{value}</span>
    </div>
  );
}
