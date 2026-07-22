import {
  Stethoscope, Package, DollarSign, Sparkles, AlertTriangle, CheckCircle2,
  Star, Clock, Shield, ImageIcon,
} from 'lucide-react';
import { formatPKRFull } from '@/lib/format';
import { SERVICE_CATEGORIES } from '../../api/constants';
import type { ClinicWizardDraft } from '../../hooks/useClinicWizard';

interface Props {
  draft: ClinicWizardDraft;
  stats: {
    priceCount: number;
    imageCount: number;
    requirementsScore: number;
    safetyScore: number;
    packageItems: number;
  };
  allValid: boolean;
}

export function ClinicWizardSummary({ draft, stats, allValid }: Props) {
  const category = SERVICE_CATEGORIES.find((c) => c.value === draft.basic.serviceCategory);
  const primaryImage = draft.basic.imageUrls[0];

  return (
    <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-700 text-white p-5 shadow-xl overflow-hidden relative">
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-extrabold border border-white/20">
            {allValid ? (
              <><CheckCircle2 className="h-3 w-3 text-emerald-300" /> Ready to Save</>
            ) : (
              <><AlertTriangle className="h-3 w-3 text-amber-300" /> Draft in Progress</>
            )}
          </div>
          <h3 className="mt-2 font-extrabold text-xl leading-tight line-clamp-2">
            {draft.basic.name || 'Untitled Clinical Service'}
          </h3>
          {category && (
            <div className="text-xs text-white/80 font-bold mt-1 flex items-center gap-1">
              <span className="text-base">{category.emoji}</span>
              {category.label}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
        <div className={'relative aspect-square bg-gradient-to-br ' + (category?.color || 'from-cyan-400 to-blue-500')}>
          {primaryImage ? (
            <img src={primaryImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">{category?.emoji || '🩺'}</span>
            </div>
          )}
          {draft.basic.isFeatured && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
              <Star className="h-2.5 w-2.5 fill-current" /> Featured
            </div>
          )}
          {draft.basic.isPopular && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-extrabold uppercase">
              🔥 Popular
            </div>
          )}
          {draft.basic.durationMin && (
            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-slate-900/70 backdrop-blur text-white text-[10px] font-extrabold flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {draft.basic.durationMin} min
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-neutral-800">
          <StatCell icon={DollarSign} label="Prices" value={stats.priceCount} tone="cyan" hint={stats.priceCount === 0 ? 'None set' : 'tiers'} />
          <StatCell icon={ImageIcon} label="Images" value={stats.imageCount} tone="amber" />
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-neutral-800 border-t-2 border-slate-100 dark:border-neutral-800">
          <StatCell icon={Stethoscope} label="Requires" value={stats.requirementsScore + '/5'} tone="blue" />
          <StatCell icon={Shield} label="Safety" value={stats.safetyScore + '/5'} tone="emerald" />
        </div>
        {Number(draft.basic.basePrice || 0) > 0 && (
          <div className="border-t-2 border-slate-100 dark:border-neutral-800 p-4 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-neutral-900">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-700">Base Price</div>
            <div className="text-2xl font-extrabold text-cyan-900 dark:text-cyan-100 tabular-nums">
              {formatPKRFull(Number(draft.basic.basePrice))}
            </div>
          </div>
        )}
      </div>

      {(stats.requirementsScore > 0 || stats.packageItems > 0) && (
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">Highlights</div>
          <div className="flex flex-wrap gap-1">
            {draft.requirements.requiresDoctor && <Badge label="👨‍⚕️ Doctor" tone="blue" />}
            {draft.requirements.requiresAppointment && <Badge label="📅 Appointment" tone="cyan" />}
            {draft.requirements.requiresFasting && <Badge label="🚫 Fasting" tone="amber" />}
            {draft.safety.pregnancySafe && <Badge label="🤰 Safe" tone="emerald" />}
            {draft.safety.requiresConsent && <Badge label="✍️ Consent" tone="purple" />}
            {draft.safety.followUpRequired && draft.safety.followUpDays && (
              <Badge label={'🔁 F/U ' + draft.safety.followUpDays + 'd'} tone="violet" />
            )}
            {stats.packageItems > 0 && <Badge label={'📦 ' + stats.packageItems + ' items'} tone="slate" />}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-700 p-2.5 text-[10px] text-slate-500 font-semibold text-center">
        💾 Draft auto-saves as you type
      </div>
    </aside>
  );
}

function StatCell({ icon: Icon, label, value, tone, hint }: any) {
  const tones: Record<string, string> = {
    cyan: 'text-cyan-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
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
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    violet: 'bg-violet-100 text-violet-800 border-violet-200',
    slate: 'bg-slate-100 text-slate-800 border-slate-200',
  };
  return (
    <span className={'inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-extrabold ' + tones[tone]}>
      {label}
    </span>
  );
}
