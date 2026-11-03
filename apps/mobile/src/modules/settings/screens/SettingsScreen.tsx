/**
 * Settings home: the same folders as the web Settings (Business info, Users,
 * Counter & POS, …), filtered by what this person may open, with search.
 */

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { EmptyState, Icon, ListGroup, ListRow, Screen, SearchBar, SectionHeader, useTheme } from '@/design';
import { searchNav, useVisibleNav } from '@/modules/shell/navigation/useVisibleNav';

export function SettingsScreen() {
  const th = useTheme();
  const { settings } = useVisibleNav();
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchNav(q, [], settings), [q, settings]);

  return (
    <Screen title={t('Settings')}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('Search settings…')} />
      {q.trim() ? (
        hits.length ? (
          <ListGroup>
            {hits.map((h) => <ListRow key={h.item.to} icon={h.item.icon} title={t(h.item.label)} subtitle={'desc' in h.item ? t((h.item as { desc: string }).desc) : undefined} chevron onPress={() => router.push(h.item.href as never)} />)}
          </ListGroup>
        ) : <EmptyState compact title={t('Nothing found for “{{q}}”', { q: q.trim() })} />
      ) : settings.map((g) => (
        <View key={g.id}>
          <SectionHeader title={t(g.title)} />
          <ListGroup>
            {g.items.map((item) => (
              <ListRow
                key={item.to}
                leading={(
                  <View style={{ width: 36, height: 36, borderRadius: th.radius('md'), backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon icon={item.icon} size={18} color={th.colors.brand.text} />
                  </View>
                )}
                title={t(item.label)}
                subtitle={t(item.desc)}
                chevron
                onPress={() => router.push(item.href as never)}
              />
            ))}
          </ListGroup>
        </View>
      ))}
    </Screen>
  );
}
