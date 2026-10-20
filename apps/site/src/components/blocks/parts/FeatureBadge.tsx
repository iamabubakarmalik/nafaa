/**
 * "Beta" / "Coming soon" ("Jald aa raha hai") badge for features that are not
 * live yet (owner rule, contract 1.1.0). Live features show nothing.
 */
import { Badge } from '@/components/ui/Badge';
import type { FeatureStatus } from '@/lib/cms/contract/cms-contract';
import { statusBadge } from '../lib/i18n';

export function FeatureBadge({ status, locale, className }: { status: FeatureStatus | null | undefined; locale: string; className?: string }) {
  const label = statusBadge(status, locale);
  if (!label) return null;
  return (
    <Badge tone={status === 'coming' ? 'warning' : 'info'} dot={status === 'coming'} className={className}>
      {label}
    </Badge>
  );
}
