import { Check, Package, Stethoscope, ShieldAlert } from 'lucide-react';
import type { WizardStep } from '../../hooks/useClinicWizard';

interface Props {
  currentStep: WizardStep;
  stepValidation: {
    step1: { valid: boolean };
    step2: { valid: boolean };
    step3: { valid: boolean };
  };
  onStepClick?: (step: WizardStep) => void;
}

const STEPS = [
  { id: 1, label: 'Basic Info', desc: 'Service, category, prices', icon: Package },
  { id: 2, label: 'Requirements', desc: 'Prep, doctor, package', icon: Stethoscope },
  { id: 3, label: 'Safety & Follow-up', desc: 'Restrictions, warnings', icon: ShieldAlert },
] as const;

export function ClinicWizardStepper({ currentStep, stepValidation, onStepClick }: Props) {
  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-2 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {STEPS.map((s, idx) => {
          const isActive = currentStep === s.id;
          const isPast = currentStep > s.id;
          const key = `step${s.id}` as keyof typeof stepValidation;
          const isComplete = stepValidation[key].valid && (isPast || isActive);
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStepClick?.(s.id as WizardStep)}
                className={[
                  'group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all',
                  isActive
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/40'
                    : isPast
                      ? 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 border-2 border-cyan-200'
                      : 'bg-slate-50 dark:bg-neutral-800 text-slate-500 border-2 border-transparent hover:bg-slate-100',
                ].join(' ')}
              >
                <div className={[
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  isActive ? 'bg-white/25 text-white'
                    : isPast && isComplete ? 'bg-cyan-600 text-white'
                    : 'bg-white text-slate-500 border-2 border-slate-200',
                ].join(' ')}>
                  {isPast && isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="text-left">
                  <div className={[
                    'text-[10px] uppercase tracking-wider font-extrabold',
                    isActive ? 'text-white/90' : isPast ? 'text-cyan-700' : 'text-slate-500',
                  ].join(' ')}>Step {s.id}</div>
                  <div className="text-sm font-extrabold leading-tight">{s.label}</div>
                  <div className={[
                    'text-[10px] font-bold leading-tight mt-0.5',
                    isActive ? 'text-white/80' : 'text-slate-500',
                  ].join(' ')}>{s.desc}</div>
                </div>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={[
                  'h-0.5 w-8 rounded-full',
                  currentStep > s.id ? 'bg-cyan-500' : 'bg-slate-200',
                ].join(' ')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
