/**
 * Feature status badge (owner rule): a feature that is not built yet is
 * marketed only with a visible badge, never as live. Text comes from the
 * contract's FEATURE_STATUS_BADGES so the admin and the site say the same.
 *
 * Usage in lists/editors: <FeatureStatusBadge status={featureStatusOf(type, data)} />
 * Pass `showLive` to also render a "Live" chip (admin lists); the site shows none.
 */
import { FEATURE_STATUS_BADGES, type FeatureStatus } from '../contract/cms-contract';
import { cn } from '../../../../lib/cn';

const STYLE: Record<FeatureStatus, string> = {
  live: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
  beta: 'bg-violet-100 text-violet-700 ring-violet-600/20',
  coming: 'bg-amber-100 text-amber-800 ring-amber-600/20',
};

export function FeatureStatusBadge({ status, locale = 'ur', showLive = false, className }: {
  status: FeatureStatus | null | undefined;
  /** Admin UI is Roman Urdu, so "ur" ("Jald aa raha hai") is the default. */
  locale?: 'en' | 'ur';
  showLive?: boolean;
  className?: string;
}) {
  if (!status || (status === 'live' && !showLive)) return null;
  const label = status === 'live' ? 'Live' : FEATURE_STATUS_BADGES[status][locale];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', STYLE[status], className)}>
      {label}
    </span>
  );
}

/** Select options for a `data.status` field (entry editor forms). */
export const FEATURE_STATUS_OPTIONS: { value: FeatureStatus; label: string; hint: string }[] = [
  { value: 'live', label: 'Live', hint: 'Bana hua aur chal raha hai' },
  { value: 'beta', label: 'Beta', hint: 'Chal raha hai, abhi test me; site par "Beta" badge' },
  { value: 'coming', label: FEATURE_STATUS_BADGES.coming.ur, hint: 'Abhi bana nahi; sirf badge aur roadmap par, page noindex' },
];
