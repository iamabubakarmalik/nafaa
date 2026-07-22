import { Clock } from 'lucide-react';
import { STEP_CONFIG } from '../constants/step-config';

interface Props {
  step: number;
  estimatedMinutesLeft?: number;
}

export function StepHeader({ step, estimatedMinutesLeft }: Props) {
  const cfg = STEP_CONFIG[step] || STEP_CONFIG[1];
  const Icon = cfg.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo} text-white p-6 shadow-2xl`}
    >
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="h-16 w-16 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center shrink-0 shadow-lg border border-white/30">
          <Icon className="h-8 w-8" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/70">
            Step {step} of 8
          </div>
          <h1 className="text-2xl md:text-3xl font-black leading-tight mt-0.5">{cfg.title}</h1>
          <p className="text-sm text-white/85 mt-1">{cfg.subtitle}</p>
        </div>
        {estimatedMinutesLeft !== undefined && estimatedMinutesLeft > 0 && (
          <div className="hidden md:flex items-center gap-1.5 text-xs font-bold bg-white/15 backdrop-blur px-3 py-2 rounded-2xl border border-white/20">
            <Clock className="h-3.5 w-3.5" />
            <span>~{estimatedMinutesLeft} min left</span>
          </div>
        )}
      </div>
    </div>
  );
}
