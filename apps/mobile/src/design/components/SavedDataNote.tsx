/**
 * Offline line for a screen showing saved data: "No internet · data from
 * {{time}}", or a hint to open the screen online once. Renders nothing while
 * the query has fresh data.
 *
 *   <SavedDataNote query={ordersQuery} />
 */

import { CloudOff } from 'lucide-react-native';
import { View } from 'react-native';
import { formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { useCachedNotice } from '@/core/offline/native/queryPersist';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { Text } from './Text';

export function SavedDataNote({ query }: { query: { dataUpdatedAt: number; isFetching?: boolean; fetchStatus?: string } }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const { fromCache, updatedAt } = useCachedNotice(query);
  if (online && !fromCache) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), backgroundColor: th.colors.warning.soft, borderRadius: th.radius('lg'), paddingHorizontal: th.space(3), paddingVertical: th.space(2) }}>
      <Icon icon={CloudOff} size={16} color={th.colors.warning.text} />
      <Text size="xs" weight="semibold" color={th.colors.warning.text} style={{ flex: 1 }}>
        {updatedAt
          ? t('Internet nahi · aakhri dafa {{time}} ka data', { time: formatRelative(updatedAt) })
          : t('Internet nahi — ye safha pehli dafa internet ke saath kholein')}
      </Text>
    </View>
  );
}
