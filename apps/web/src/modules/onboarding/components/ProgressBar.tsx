import { Check } from 'lucide-react';
import { STEP_CONFIG, TOTAL_STEPS } from '../constants/step-config';

interface Props {
  currentStep: number;
  completedSteps?: number[];
  onStepClick?: (step: number) => void;
}

export function ProgressBar({ currentStep, completedSteps = [], onStepClick }: Props) {
  const safeCompleted = Array.isArray(completedSteps) ? completedSteps : [];
  const currentConfig = STEP_CONFIG[currentStep] || STEP_CONFIG[1];
  const clampedStep = Math.min(Math.max(currentStep, 1), TOTAL_STEPS);
  const percent = (clampedStep / TOTAL_STEPS) * 100;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 border border-slate-200/60 shadow-sm">
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full bg-gradient-to-r ${currentConfig.gradientFrom} ${currentConfig.gradientTo} transition-all duration-700 rounded-full`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between items-start gap-1 overflow-x-auto">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => {
          const cfg = STEP_CONFIG[n];
          if (!cfg) return null;
          const StepIcon = cfg.icon;
          const done = safeCompleted.includes(n);
          const current = n === clampedStep;
          const clickable = onStepClick && (done || n <= clampedStep);

          return (
            <button
              key={n}
              type="button"
              onClick={() => clickable && onStepClick?.(n)}
              disabled={!clickable}
              className={`flex flex-col items-center gap-1.5 flex-shrink-0 group ${
                clickable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center border-2 transition-all shadow-sm ${
                  done
                    ? `bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo} ${cfg.borderColor} text-white scale-100`
                    : current
                    ? `bg-white ${cfg.borderColor} ${cfg.textColor} ring-4 ${cfg.ringColor} scale-110`
                    : 'bg-slate-50 border-slate-200 text-slate-400 scale-95 group-hover:scale-100'
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <StepIcon className="h-4 w-4" />}
              </div>
              <span
                className={`text-[10px] font-bold hidden sm:block text-center leading-tight max-w-[70px] ${
                  current ? cfg.textColor : done ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {cfg.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
