/** Last screen: what is set up, what was left for later, and two preferences. */

import { CheckCircle2, CircleDashed } from 'lucide-react';
import { Switch } from '@/design-system/components';
import type { OnboardingProgress } from '../api/onboarding.api';
import { WIZARD_STEPS, isStepDone, type WizardStepId } from '../constants/wizard-steps';
import { t } from '@core/i18n';

export interface FinishForm {
  wantsTutorial: boolean;
  subscribedToTips: boolean;
}

interface Props {
  value: FinishForm;
  onChange: (patch: Partial<FinishForm>) => void;
  progress: OnboardingProgress;
  onJump: (step: WizardStepId) => void;
}

function summary(id: WizardStepId, p: OnboardingProgress): string | null {
  if (id === 'products' && p.productsAddedCount > 0) return `${p.productsAddedCount} products`;
  if (id === 'staff' && p.teamMembersAdded > 0) return `${p.teamMembersAdded} staff`;
  return null;
}

export function FinishStep({ value, onChange, progress, onJump }: Props) {
  return (
    <div className="space-y-7">
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {WIZARD_STEPS.map((s) => {
          const done = isStepDone(s.id, progress);
          const extra = done ? summary(s.id, progress) : null;
          return (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3">
              {done
                ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" aria-label={t('Ho gaya')} />
                : <CircleDashed className="h-5 w-5 shrink-0 text-slate-400" aria-label={t('Baqi hai')} />}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">{s.title}</span>
                <span className="block text-xs text-slate-500">{done ? (extra ?? t('Ho gaya')) : t('Chhor diya — baad me Settings se')}</span>
              </span>
              <button type="button" onClick={() => onJump(s.id)} className="shrink-0 text-xs font-semibold text-brand-700 hover:underline">
                {done ? t('Badlein') : t('Abhi karein')}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <Switch
          checked={value.wantsTutorial}
          onChange={(e) => onChange({ wantsTutorial: e.target.checked })}
          label={t('Pehli dafa chhota sa guide dikhayein')}
          description={t('Har page par \'G\' daba kar bhi guide khul sakta hai.')}
        />
        <Switch
          checked={value.subscribedToTips}
          onChange={(e) => onChange({ subscribedToTips: e.target.checked })}
          label={t('Kaam ki tips email par bhejein')}
          description={t('Kabhi kabhar, aur kabhi bhi band kar sakte hain.')}
        />
      </div>
    </div>
  );
}
