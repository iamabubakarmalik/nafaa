import { Check, Package, Palette, Layers } from 'lucide-react';
import type { WizardStep } from '../../hooks/useCarpetWizard';

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
  { id: 1, label: 'Basic Info', shortLbl: 'Info', desc: 'Naam, rate, type', icon: Package },
  { id: 2, label: 'Colors / Designs', shortLbl: 'Colors', desc: 'Variants add karo', icon: Palette },
  { id: 3, label: 'Stock Entry', shortLbl: 'Stock', desc: 'Rolls/pieces/ft', icon: Layers },
] as const;

export function CarpetWizardStepper({ currentStep, stepValidation, onStepClick }: Props) {
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-2 overflow-x-auto">
      <div className="flex items-center gap-1.5 min-w-max sm:min-w-0 sm:justify-between">
        {STEPS.map((s, idx) => {
          const isActive = currentStep === s.id;
          const isPast = currentStep > s.id;
          const key = `step${s.id}` as keyof typeof stepValidation;
          const isComplete = stepValidation[key].valid && (isPast || isActive);
          const Icon = s.icon;

          return (
            <div key={s.id} className="flex items-center gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => onStepClick?.(s.id as WizardStep)}
                className={[
                  'flex-1 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-2xl transition-all min-w-[120px] sm:min-w-0 active:scale-95',
                  isActive
                    ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-500/40 scale-[1.02]'
                    : isPast
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-2 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100',
                ].join(' ')}
              >
                <div className={[
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition',
                  isActive ? 'bg-white/25 text-white'
                    : isPast && isComplete ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-500 border-2 border-slate-200',
                ].join(' ')}>
                  {isPast && isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="text-left min-w-0">
                  <div className={[
                    'text-[10px] uppercase tracking-wider font-extrabold',
                    isActive ? 'text-white/90' : isPast ? 'text-emerald-700' : 'text-slate-500',
                  ].join(' ')}>
                    Step {s.id}
                  </div>
                  <div className="text-sm font-extrabold leading-tight">
                    <span className="sm:hidden">{s.shortLbl}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  <div className={[
                    'text-[10px] font-bold leading-tight hidden sm:block',
                    isActive ? 'text-white/80' : 'text-slate-500',
                  ].join(' ')}>{s.desc}</div>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <div className={['h-1 w-4 sm:w-6 rounded-full transition', currentStep > s.id ? 'bg-emerald-500' : 'bg-slate-200'].join(' ')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
