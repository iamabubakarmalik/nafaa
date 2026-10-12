import { CheckCircle2, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@core/lib/cn';

/** Small save state shown at the top of a section; changes save by themselves. */
export function SaveStatusBar({ saving, dirty }: { saving: boolean; dirty: boolean }) {
  const [Icon, text, tone] = saving
    ? [Loader2, 'Save ho raha hai…', 'text-blue-700 bg-blue-50 ring-blue-100']
    : dirty
      ? [CloudOff, 'Abhi save nahi hua', 'text-amber-700 bg-amber-50 ring-amber-100']
      : [CheckCircle2, 'Sab save hai', 'text-emerald-700 bg-emerald-50 ring-emerald-100'];
  return (
    <div role="status" className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1', tone)}>
      <Icon className={cn('h-3.5 w-3.5', saving && 'animate-spin')} /> {text}
    </div>
  );
}
