/** Onboarding progress: a step list on desktop, a compact bar on phones. */

import { Check, Flag } from 'lucide-react';
import { cn } from '@core/lib/cn';
import type { OnboardingProgress } from '../api/onboarding.api';
import { WIZARD_STEPS, isStepDone, type WizardPosition, type WizardStepId } from '../constants/wizard-steps';

interface Props {
  current: WizardPosition;
  progress: OnboardingProgress;
  onJump: (id: WizardStepId) => void;
}

export function WizardRail({ current, progress, onJump }: Props) {
  const doneCount = WIZARD_STEPS.filter((s) => isStepDone(s.id, progress)).length;
  const minutesLeft = WIZARD_STEPS.filter((s) => !isStepDone(s.id, progress)).reduce((n, s) => n + s.minutes, 0);

  return (
    <nav aria-label="Setup ke qadam" className="hidden lg:block">
      <div className="sticky top-24">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Setup</p>
        <p className="mt-1 text-sm text-slate-600">
          {doneCount} / {WIZARD_STEPS.length} mukammal{minutesLeft > 0 && <> · takreeban {minutesLeft} minute baqi</>}
        </p>
        <ol className="mt-5 space-y-1">
          {WIZARD_STEPS.map((s, i) => {
            const done = isStepDone(s.id, progress);
            const active = current === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onJump(s.id)}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition',
                    active ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-slate-100',
                  )}
                >
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    done ? 'bg-brand-600 text-brand-fg' : active ? 'bg-brand-100 text-brand-800 ring-2 ring-brand-500' : 'bg-slate-200 text-slate-600',
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-label="Ho gaya" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block truncate text-sm', active ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>{s.title}</span>
                    {!s.skippable && <span className="block text-[0.6875rem] text-slate-500">Zaroori</span>}
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <div className={cn('flex items-center gap-3 rounded-lg px-2.5 py-2', current === 'finish' && 'bg-white shadow-sm ring-1 ring-slate-200')}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <Flag className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className={cn('text-sm', current === 'finish' ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>Tayyar</span>
            </div>
          </li>
        </ol>
      </div>
    </nav>
  );
}

/** Thin progress bar with "Step 2 / 5" for phones. */
export function WizardBar({ current }: { current: WizardPosition }) {
  const index = current === 'finish' ? WIZARD_STEPS.length : WIZARD_STEPS.findIndex((s) => s.id === current);
  const pct = Math.round(((index + (current === 'finish' ? 0 : 0.5)) / WIZARD_STEPS.length) * 100);
  return (
    <div className="mb-4 lg:hidden">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-600">
        <span>{current === 'finish' ? 'Aakhri qadam' : `Qadam ${index + 1} / ${WIZARD_STEPS.length}`}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
