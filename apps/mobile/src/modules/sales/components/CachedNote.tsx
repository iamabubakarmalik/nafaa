/** "Last updated 5m ago" under data shown from the phone's saved copy (no internet). */

import { CloudOff } from 'lucide-react-native';
import { formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useCachedNotice } from '@/core/offline';
import { Row, Text, useTheme } from '@/design';

export function CachedNote({ query }: { query: { dataUpdatedAt: number; isFetching?: boolean; fetchStatus?: string } }) {
  const th = useTheme();
  const c = useCachedNotice(query);
  if (!c.fromCache || !c.updatedAt) return null;
  return <Row gap={1.5}><CloudOff size={14} color={th.colors.textMuted} /><Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(c.updatedAt) })}</Text></Row>;
}
