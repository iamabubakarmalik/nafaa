import {
  Wrench, DollarSign, Shield, CheckCircle2, AlertTriangle,
  Sparkles, Star, Zap, Clock, Award, Package,
} from 'lucide-react';
import { formatPKRFull } from '@core/lib/format';
import type { ServicesBizDraft } from '../../hooks/useServicesBizWizard';

interface Props {
  draft: ServicesBizDraft;
  stats: {
    chargeCount: number;
    surchargeCount: number;
    imageCount: number;
    toolsCount: number;
    partsCount: number;
  };
  allValid: boolean;
}

export function ServicesBizWizardSummary({ draft, stats, allValid }: Props) {
  const primaryImage = draft.basic.imageUrl || draft.basic.imageUrls[0];

  const minPrice = [
    draft.pricing.baseCharge, draft.pricing.hourlyRate, draft.pricing.visitCharge,
  ].map((p) => Number(p || 0)).filter((p) => p > 0).sort((a, b) => a - b)[0];

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
            {draft.basic.name || 'Untitled Service'}
          </h3>
          {draft.basic.code && (
            <div className="text-xs text-white/80 font-mono mt-1">{draft.basic.code}</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900">
        <div className="relative aspect-video bg-gradient-to-br from-cyan-500 via-blue-600 to-cyan-700">
          {primaryImage ? (
            <img src={primaryImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Wrench className="h-16 w-16 text-white/40" />
            </div>
          )}
          {draft.basic.isFeatured && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
              <Star className="h-2.5 w-2.5 fill-current" /> Featured
            </div>
          )}
          {draft.basic.isEmergency && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-extrabold uppercase inline-flex items-center gap-1 animate-pulse">
              <Zap className="h-2.5 w-2.5" /> Emergency
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-neutral-800">
          <StatCell icon={DollarSign} label="Charges" value={stats.chargeCount} tone="cyan" />
          <StatCell icon={Zap} label="Surcharges" value={stats.surchargeCount} tone="amber" />
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-neutral-800 border-t-2 border-slate-100 dark:border-neutral-800">
          <StatCell icon={Wrench} label="Tools" value={stats.toolsCount} tone="violet" />
          <StatCell icon={Package} label="Parts" value={stats.partsCount} tone="emerald" />
        </div>
        {minPrice && (
          <div className="border-t-2 border-slate-100 dark:border-neutral-800 p-4 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-neutral-900">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-700">Starting At</div>
            <div className="text-2xl font-extrabold text-cyan-900 dark:text-cyan-100 tabular-nums">
              {formatPKRFull(minPrice)}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">Highlights</div>
        <div className="flex flex-wrap gap-1">
          {draft.basic.isPopular && <Badge label="🔥 Popular" tone="red" />}
          {draft.basic.isFeatured && <Badge label="⭐ Featured" tone="amber" />}
          {draft.basic.isEmergency && <Badge label="🚨 Emergency" tone="red" />}
          {draft.basic.isRemoteAvailable && <Badge label="💻 Remote" tone="blue" />}
          {draft.pricing.requiresQuote && <Badge label="📝 Quote Based" tone="violet" />}
          {draft.pricing.requiresAdvance && <Badge label={`💰 ${draft.pricing.advancePct}% Advance`} tone="emerald" />}
          {Number(draft.warranty.warrantyDays) > 0 && (
            <Badge label={`🛡️ ${draft.warranty.warrantyDays}d Warranty`} tone="emerald" />
          )}
          {Number(draft.warranty.estimatedDurationMin) > 0 && (
            <Badge label={`⏱️ ${draft.warranty.estimatedDurationMin}min`} tone="slate" />
          )}
          <Badge label={`🎓 ${draft.warranty.requiredSkillLevel}`} tone="violet" />
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-700 p-2.5 text-[10px] text-slate-500 font-semibold text-center">
        💾 Draft auto-saves as you type
      </div>
    </aside>
  );
}

function StatCell({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: string }) {
  const tones: Record<string, string> = {
    cyan: 'text-cyan-700', amber: 'text-amber-700',
    violet: 'text-violet-700', emerald: 'text-emerald-700',
  };
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={'h-3 w-3 ' + tones[tone]} />
        <div className={'text-[10px] uppercase tracking-wider font-extrabold ' + tones[tone]}>{label}</div>
      </div>
      <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  const tones: Record<string, string> = {
    red: 'bg-red-100 text-red-800 border-red-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    violet: 'bg-violet-100 text-violet-800 border-violet-200',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    slate: 'bg-slate-100 text-slate-800 border-slate-200',
  };
  return (
    <span className={'inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-extrabold ' + tones[tone]}>
      {label}
    </span>
  );
}
