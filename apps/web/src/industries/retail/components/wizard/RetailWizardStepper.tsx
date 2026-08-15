import { Check, Package, Layers, ShoppingBag } from 'lucide-react';
import type { WizardStep } from '../../hooks/useRetailWizard';

interface Props {
  currentStep: WizardStep;
  stepValidation: {
    step1: { valid: boolean };
    step2: { valid: boolean };
    step3: { valid: boolean };
  };
  onStepClick?: (step: WizardStep) => void;
}

/* ═════════════════════════════════════════════════════════════
   WIZARD STEPPER (FULL BEST v2) — 🌙 Dark mode perfect
   ═════════════════════════════════════════════════════════════ */

const STEPS = [
  { id: 1, label: 'Basic Info', shortLbl: 'Info', desc: 'Naam & rate', icon: Package },
  { id: 2, label: 'Multi-Units', shortLbl: 'Units', desc: 'Dozen/carton', icon: Layers },
  { id: 3, label: 'Stock Entry', shortLbl: 'Stock', desc: 'Kitna maal', icon: ShoppingBag },
] as const;

export function RetailWizardStepper({ currentStep, stepValidation, onStepClick }: Props) {
  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-2 overflow-x-auto">
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
                  'flex-1 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-2xl transition-all min-w-[120px] sm:min-w-0',
                  isActive
                    ? 'bg-gradient-to-br from-sky-600 to-cyan-700 text-white shadow-md shadow-sky-500/40 scale-[1.02]'
                    : isPast
                      ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/25 border-2 border-sky-200 dark:border-sky-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                <div className={[
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition',
                  isActive ? 'bg-white/25 text-white'
                    : isPast && isComplete ? 'bg-sky-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-600',
                ].join(' ')}>
                  {isPast && isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="text-left min-w-0">
                  <div className={[
                    'text-[10px] uppercase tracking-wider font-extrabold',
                    isActive ? 'text-white/90' : isPast ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400',
                  ].join(' ')}>
                    Step {s.id}
                  </div>
                  <div className="text-sm font-extrabold leading-tight">
                    <span className="sm:hidden">{s.shortLbl}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  <div className={[
                    'text-[10px] font-bold leading-tight hidden sm:block',
                    isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400',
                  ].join(' ')}>{s.desc}</div>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <div className={['h-1 w-4 sm:w-6 rounded-full transition',
                  currentStep > s.id ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'].join(' ')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
