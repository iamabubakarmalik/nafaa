/**
 * More: the full menu, mirroring the web sidebar groups. Search finds any
 * page or setting; long-press an item to pin it to the top; the workspace and
 * branch switchers sit at the top; Settings and Log out at the end.
 */

import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ChevronRight, ChevronsUpDown, LogOut, Pin, Settings } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { isAllShops } from '@/core/auth/shopScope';
import { useShops } from '@/core/auth/useShops';
import { haptic } from '@/core/device/haptics';
import {
  Avatar, EmptyState, Icon, ListGroup, ListRow, PressableScale, Screen, SearchBar, SectionHeader, Text, toast, useLayout, useTheme, withAlpha,
} from '@/design';
import { BrandMark } from '../components/BrandMark';
import { logoutWithConfirm } from '../components/ProfileSheet';
import { useShellUi } from '../hooks/useShellUi';
import { usePinned } from '../hooks/usePinned';
import { WORKSPACES, type NavItem } from '../navigation/nav-config';
import { searchNav, useVisibleNav } from '../navigation/useVisibleNav';

function open(item: NavItem) {
  if (item.href) router.push(item.href as never);
}

export function MoreScreen() {
  const th = useTheme();
  const c = th.colors;
  const { columns } = useLayout();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const shopId = useAuthStore((s) => s.currentShopId);
  const { data: shops } = useShops();
  const workspace = useShellUi((s) => s.workspace);
  const openSheet = useShellUi((s) => s.open);
  const { groups, settings, byTo } = useVisibleNav();
  const { pinned, toggle } = usePinned();
  const [q, setQ] = useState('');

  const hits = useMemo(() => searchNav(q, groups, settings), [q, groups, settings]);
  const pinnedItems = pinned.map((to) => byTo.get(to)).filter((x): x is NavItem => !!x && !!x.href);
  const shopName = isAllShops(shopId) ? t('All shops') : shops?.find((s) => s.id === shopId)?.name ?? tenant?.name ?? '';
  const groupColor = new Map(groups.flatMap((g) => g.items.map((i) => [i.to, g.color] as const)));

  const pin = (item: NavItem) => {
    haptic('impact');
    const now = toggle(item.to);
    toast.show(now ? t('{{label}} pin ho gaya', { label: t(item.label) }) : t('{{label}} pin se hata diya', { label: t(item.label) }));
  };

  const tileWidth = `${100 / Math.min(columns + 2, 6)}%` as const;

  return (
    <Screen title={t('More')} onBack={null} tabBarSpace>
      <PressableScale
        onPress={() => openSheet('profile')}
        haptic="tap"
        style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(3.5), borderRadius: th.radius('2xl'), backgroundColor: c.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: c.border }}
      >
        <Avatar name={user?.fullName} url={user?.avatarUrl} size={48} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="md" weight="bold" numberOfLines={1}>{user?.fullName}</Text>
          <Text size="sm" tone="muted" numberOfLines={1}>{tenant?.name}</Text>
        </View>
        <Icon icon={ChevronRight} size={18} tone="subtle" flip />
      </PressableScale>

      <View style={{ flexDirection: 'row', gap: th.space(2.5) }}>
        <PressableScale onPress={() => openSheet('workspace')} haptic="tap" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: c.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: c.border }}>
          <BrandMark size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="2xs" tone="muted" weight="medium">{t('Workspace')}</Text>
            <Text size="sm" weight="bold" numberOfLines={1}>{t(WORKSPACES[workspace].label)}</Text>
          </View>
          <Icon icon={ChevronsUpDown} size={15} tone="subtle" />
        </PressableScale>
        <PressableScale onPress={() => openSheet('shop')} haptic="tap" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: c.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: c.border }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="2xs" tone="muted" weight="medium">{t('Branch')}</Text>
            <Text size="sm" weight="bold" numberOfLines={1}>{shopName}</Text>
          </View>
          <Icon icon={ChevronsUpDown} size={15} tone="subtle" />
        </PressableScale>
      </View>

      <SearchBar value={q} onChangeText={setQ} placeholder={t('Search pages, settings…')} />

      {q.trim() ? (
        hits.length ? (
          <ListGroup>
            {hits.map((h) => (
              <ListRow key={h.item.to} icon={h.item.icon} title={t(h.item.label)} subtitle={h.section} chevron onPress={() => open(h.item)} dense />
            ))}
          </ListGroup>
        ) : (
          <EmptyState compact title={t('Nothing found for “{{q}}”', { q: q.trim() })} message={t('Try a page name like “khata” or “products”.')} />
        )
      ) : (
        <>
          {pinnedItems.length > 0 && (
            <View>
              <SectionHeader title={t('Pinned')} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -th.space(1) }}>
                {pinnedItems.map((item) => {
                  const color = groupColor.get(item.to) ?? c.brand.solid;
                  return (
                    <View key={item.to} style={{ width: tileWidth, padding: th.space(1) }}>
                      <PressableScale
                        onPress={() => open(item)}
                        onLongPress={() => pin(item)}
                        haptic="tap"
                        accessibilityLabel={t(item.label)}
                        accessibilityHint={t('Lamba dabayein: pin hatayein')}
                        style={{ alignItems: 'center', gap: th.space(1.5), paddingVertical: th.space(3), paddingHorizontal: th.space(1), borderRadius: th.radius('xl'), backgroundColor: c.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: c.border }}
                      >
                        <View style={{ width: 44, height: 44, borderRadius: th.radius('lg'), backgroundColor: withAlpha(color, th.isDark ? 0.2 : 0.12), alignItems: 'center', justifyContent: 'center' }}>
                          <Icon icon={item.icon} size={22} color={color} />
                        </View>
                        <Text size="xs" weight="semibold" align="center" numberOfLines={2}>{t(item.label)}</Text>
                      </PressableScale>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {groups.map((g) => (
            <View key={g.id}>
              <SectionHeader title={t(g.label)} />
              <ListGroup>
                {g.items.map((item) => (
                  <ListRow
                    key={item.to}
                    leading={(
                      <View style={{ width: 36, height: 36, borderRadius: th.radius('md'), backgroundColor: withAlpha(g.color, th.isDark ? 0.2 : 0.12), alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon={item.icon} size={18} color={g.color} />
                      </View>
                    )}
                    title={t(item.label)}
                    trailing={pinned.includes(item.to) ? <Icon icon={Pin} size={14} tone="subtle" /> : undefined}
                    chevron
                    dense
                    onPress={() => open(item)}
                    onLongPress={() => pin(item)}
                  />
                ))}
              </ListGroup>
            </View>
          ))}

          <ListGroup>
            <ListRow icon={Settings} iconTone="neutral" title={t('Settings')} subtitle={t('Store, staff, receipt, appearance aur zaban')} chevron onPress={() => router.push('/settings')} />
            <ListRow icon={LogOut} title={t('Log out')} destructive onPress={() => void logoutWithConfirm()} />
          </ListGroup>
          <Text size="xs" tone="subtle" align="center" ltr>{`Nafaa ${Constants.expoConfig?.version ?? ''}`}</Text>
        </>
      )}
    </Screen>
  );
}
