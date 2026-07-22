import { Check, Bed, Sparkles, Home } from 'lucide-react';
import type { WizardStep } from '../../hooks/useHotelWizard';

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
  { id: 1, label: 'Room Type', desc: 'Identity & pricing', icon: Bed },
  { id: 2, label: 'Amenities', desc: 'Features & extras', icon: Sparkles },
  { id: 3, label: 'Add Rooms', desc: 'Bulk generate (optional)', icon: Home },
] as const;

export function HotelWizardStepper({ currentStep, stepValidation, onStepClick }: Props) {
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-2 overflow-x-auto">
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
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-md shadow-indigo-500/40'
                    : isPast
                      ? 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-2 border-indigo-200'
                      : 'bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100',
                ].join(' ')}
              >
                <div className={[
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition',
                  isActive ? 'bg-white/25 text-white'
                    : isPast && isComplete ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-500 border-2 border-slate-200',
                ].join(' ')}>
                  {isPast && isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="text-left">
                  <div className={[
                    'text-[10px] uppercase tracking-wider font-extrabold',
                    isActive ? 'text-white/90' : isPast ? 'text-indigo-700' : 'text-slate-500',
                  ].join(' ')}>
                    Step {s.id}
                  </div>
                  <div className="text-sm font-extrabold leading-tight">{s.label}</div>
                  <div className={[
                    'text-[10px] font-bold leading-tight mt-0.5',
                    isActive ? 'text-white/80' : 'text-slate-500',
                  ].join(' ')}>
                    {s.desc}
                  </div>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <div className={['h-0.5 w-8 rounded-full transition',
                  currentStep > s.id ? 'bg-indigo-500' : 'bg-slate-200'].join(' ')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
