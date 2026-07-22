import { Sparkles } from 'lucide-react';

/**
 * Small badge to indicate a setting was filled during onboarding.
 * Use next to field labels.
 */
export function SyncedBadge({ label = 'From onboarding' }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider"
      title="Ye field aap ke onboarding setup se aaya hai"
    >
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
