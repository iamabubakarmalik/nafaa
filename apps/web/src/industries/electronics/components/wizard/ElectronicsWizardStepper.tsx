import { Check, Cpu, Sparkles, Shield, Package, Lock, AlertCircle } from 'lucide-react';
import type { WizardStep } from '../../hooks/useElectronicsWizard';

interface Props {
  currentStep: WizardStep;
  stepValidation: {
    step1: { valid: boolean };
    step2: { valid: boolean };
    step3: { valid: boolean };
    step4: { valid: boolean };
  };
  onStepClick?: (step: WizardStep) => void;
}

const STEPS = [
  { id: 1, label: 'Bunyadi Maloomat', shortLbl: 'Basic', desc: 'Naam, brand, qeemat', icon: Cpu },
  { id: 2, label: 'Tech Specs', shortLbl: 'Specs', desc: 'Battery, connectivity', icon: Sparkles },
  { id: 3, label: 'Warranty & Dabba', shortLbl: 'Warranty', desc: 'Warranty, box me kya', icon: Shield },
  { id: 4, label: 'Stock & Serial', shortLbl: 'Stock', desc: 'Ginti, variants, serial', icon: Package },
] as const;

export function ElectronicsWizardStepper({ currentStep, stepValidation, onStepClick }: Props) {
  /* Kitna kaam ho chuka — sirf wo steps jo actually valid hain */
  const doneCount = ([1, 2, 3, 4] as const)
    .filter((i) => stepValidation[`step${i}` as keyof typeof stepValidation].valid).length;
  const pct = Math.round((doneCount / STEPS.length) * 100);

  /* Kaunsa step khula hai — pichle sab valid hone chahiyen */
  const isUnlocked = (id: number) => {
    if (id === 1) return true;
    for (let i = 1; i < id; i++) {
      if (!stepValidation[`step${i}` as keyof typeof stepValidation].valid) return false;
    }
    return true;
  };

  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-2 overflow-hidden">
      {/* Progress */}
      <div className="px-2 pt-1.5 pb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
            Step {currentStep} / {STEPS.length}
          </span>
          <span className="text-[10px] font-extrabold text-blue-700 tabular-nums">
            {pct}% mukammal
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300"
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-1.5 min-w-max sm:min-w-0 sm:justify-between overflow-x-auto">
        {STEPS.map((s, idx) => {
          const isActive = currentStep === s.id;
          const isPast = currentStep > s.id;
          const key = `step${s.id}` as keyof typeof stepValidation;
          const isComplete = stepValidation[key].valid && (isPast || isActive);
          const unlocked = isUnlocked(s.id);
          const hasError = isPast && !stepValidation[key].valid;
          const Icon = s.icon;

          return (
            <div key={s.id} className="flex items-center gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => onStepClick?.(s.id as WizardStep)}
                disabled={!unlocked && !isActive}
                title={unlocked ? undefined : 'Pehle pichla step mukammal karein'}
                className={[
                  'flex-1 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-2xl transition-all min-w-[110px] sm:min-w-0',
                  isActive
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-700 text-white shadow-md shadow-blue-500/40 scale-[1.02]'
                    : hasError
                      ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border-2 border-rose-200'
                      : isPast
                        ? 'bg-blue-50 text-blue-800 hover:bg-blue-100 border-2 border-blue-200'
                        : unlocked
                          ? 'bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100'
                          : 'bg-slate-50 text-slate-400 border-2 border-transparent opacity-60 cursor-not-allowed',
                ].join(' ')}
              >
                <div className={[
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition',
                  isActive ? 'bg-white/25 text-white'
                    : hasError ? 'bg-white text-rose-600 border-2 border-rose-300'
                    : isPast && isComplete ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-500 border-2 border-slate-200',
                ].join(' ')}>
                  {hasError ? <AlertCircle className="h-4 w-4 text-rose-600" />
                    : isPast && isComplete ? <Check className="h-4 w-4" />
                    : !unlocked && !isActive ? <Lock className="h-3.5 w-3.5" />
                    : <Icon className="h-4 w-4" />}
                </div>
                <div className="text-left min-w-0">
                  <div className={[
                    'text-[10px] uppercase tracking-wider font-extrabold',
                    isActive ? 'text-white/90' : isPast ? 'text-blue-700' : 'text-slate-500',
                  ].join(' ')}>
                    Step {s.id}
                  </div>
                  <div className="text-sm font-extrabold leading-tight">
                    <span className="sm:hidden">{s.shortLbl}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  <div className={[
                    'text-[10px] font-bold leading-tight hidden sm:block truncate',
                    isActive ? 'text-white/80' : hasError ? 'text-rose-600' : 'text-slate-500',
                  ].join(' ')}>{hasError ? 'Kuch cheez reh gayi' : s.desc}</div>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <div className={['h-1 w-3 sm:w-4 rounded-full transition',
                  currentStep > s.id ? 'bg-blue-500' : 'bg-slate-200'].join(' ')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
