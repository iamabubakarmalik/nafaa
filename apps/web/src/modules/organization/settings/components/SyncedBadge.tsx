import { Sparkles } from 'lucide-react';

export function SyncedBadge({ label = 'From onboarding', tone = 'emerald' }: { label?: string; tone?: 'emerald' | 'blue' | 'amber' }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    blue: 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/40 text-blue-700 dark:text-blue-300',
    amber: 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-300',
  };
  return (
    <span
      title="Ye field aap ke onboarding setup se aaya hai"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${tones[tone]}`}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
