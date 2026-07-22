import { Check, Package, BookOpen, Palette, Sparkles } from 'lucide-react';
import type { WizardStep } from '../../hooks/useBookstoreWizard';

interface Props {
  currentStep: WizardStep;
  productType: 'BOOK' | 'STATIONERY' | 'ART_SUPPLY';
  stepValidation: {
    step1: { valid: boolean };
    step2: { valid: boolean };
    step3: { valid: boolean };
    step4: { valid: boolean };
  };
  onStepClick?: (step: WizardStep) => void;
}

const STEPS_BY_TYPE = {
  BOOK: [
    { id: 1, label: 'Basic Info', desc: 'Type & pricing', icon: Package },
    { id: 2, label: 'Book Details', desc: 'ISBN, authors, publisher', icon: BookOpen },
    { id: 3, label: 'Academic', desc: 'Grade, subject, rental', icon: Sparkles },
    { id: 4, label: 'Final Details', desc: 'Images & tags', icon: Palette },
  ],
  STATIONERY: [
    { id: 1, label: 'Basic Info', desc: 'Type & pricing', icon: Package },
    { id: 2, label: 'Stationery', desc: 'Category, brand, pack', icon: Sparkles },
    { id: 3, label: 'Usage', desc: 'School/office/fast-moving', icon: BookOpen },
    { id: 4, label: 'Final Details', desc: 'Images & tags', icon: Palette },
  ],
  ART_SUPPLY: [
    { id: 1, label: 'Basic Info', desc: 'Type & pricing', icon: Package },
    { id: 2, label: 'Art Details', desc: 'Category, color, grade', icon: Palette },
    { id: 3, label: 'Suitability', desc: 'Professional/beginner', icon: Sparkles },
    { id: 4, label: 'Final Details', desc: 'Images & tags', icon: BookOpen },
  ],
} as const;

export function BookstoreWizardStepper({ currentStep, productType, stepValidation, onStepClick }: Props) {
  const STEPS = STEPS_BY_TYPE[productType];

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
                    ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-md shadow-amber-500/40'
                    : isPast
                      ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-2 border-amber-200'
                      : 'bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100',
                ].join(' ')}
              >
                <div className={[
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition',
                  isActive ? 'bg-white/25 text-white'
                    : isPast && isComplete ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-500 border-2 border-slate-200',
                ].join(' ')}>
                  {isPast && isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="text-left">
                  <div className={[
                    'text-[10px] uppercase tracking-wider font-extrabold',
                    isActive ? 'text-white/90' : isPast ? 'text-amber-700' : 'text-slate-500',
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
                <div className={['h-0.5 w-6 rounded-full transition',
                  currentStep > s.id ? 'bg-amber-500' : 'bg-slate-200'].join(' ')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
