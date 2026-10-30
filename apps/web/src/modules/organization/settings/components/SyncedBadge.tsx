/** Small label on settings fields whose value came from the onboarding setup. */

import { Sparkles } from 'lucide-react';
import { Badge, type BadgeVariant } from '@/design-system/components';
import { t } from '@core/i18n';

const TONE: Record<'emerald' | 'blue' | 'amber', BadgeVariant> = { emerald: 'brand', blue: 'info', amber: 'warning' };

export function SyncedBadge({ label = t('From onboarding'), tone = 'emerald' }: { label?: string; tone?: 'emerald' | 'blue' | 'amber' }) {
  return (
    <Badge size="xs" variant={TONE[tone]} title={t('Ye field aap ke onboarding setup se aaya hai')}>
      <Sparkles className="h-3 w-3" aria-hidden />
      {label}
    </Badge>
  );
}
