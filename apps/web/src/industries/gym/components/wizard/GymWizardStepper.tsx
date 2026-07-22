import { Check, User, Heart, CreditCard } from 'lucide-react';
import type { WizardStep } from '../../hooks/useGymMemberWizard';

interface Props {
  currentStep: WizardStep;
  stepValidation: { step1: { valid: boolean }; step2: { valid: boolean }; step3: { valid: boolean } };
  onStepClick?: (step: WizardStep) => void;
}

const STEPS = [
  { id: 1, label: 'Profile', desc: 'Name, body, goals', icon: User },
  { id: 2, label: 'Medical & Prefs', desc: 'Health, contacts, schedule', icon: Heart },
  { id: 3, label: 'Photo & Plan', desc: 'Membership subscription', icon: CreditCard },
] as const;

export function GymWizardStepper({ currentStep, stepValidation, onStepClick }: Props) {
  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-2 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {STEPS.map((s, idx) => {
          const isActive = currentStep === s.id;
          const isPast = currentStep > s.id;
          const key = ('step' + s.id) as keyof typeof stepValidation;
          const isComplete = stepValidation[key].valid && (isPast || isActive);
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStepClick?.(s.id as WizardStep)}
                className={[
                  'group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all',
                  isActive ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-md shadow-red-500/40'
                    : isPast ? 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 hover:bg-red-100 border-2 border-red-200'
                    : 'bg-slate-50 dark:bg-neutral-800 text-slate-500 border-2 border-transparent hover:bg-slate-100',
                ].join(' ')}
              >
                <div className={[
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  isActive ? 'bg-white/25 text-white'
                    : isPast && isComplete ? 'bg-red-600 text-white'
                    : 'bg-white text-slate-500 border-2 border-slate-200',
                ].join(' ')}>
                  {isPast && isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="text-left">
                  <div className={'text-[10px] uppercase tracking-wider font-extrabold ' + (isActive ? 'text-white/90' : isPast ? 'text-red-700' : 'text-slate-500')}>
                    Step {s.id}
                  </div>
                  <div className="text-sm font-extrabold leading-tight">{s.label}</div>
                  <div className={'text-[10px] font-bold leading-tight mt-0.5 ' + (isActive ? 'text-white/80' : 'text-slate-500')}>{s.desc}</div>
                </div>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={'h-0.5 w-8 rounded-full ' + (currentStep > s.id ? 'bg-red-500' : 'bg-slate-200')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
