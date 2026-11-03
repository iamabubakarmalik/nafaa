/**
 * Top bar of the main screens (phone). Mirrors the web top bar:
 *  - start: the branch / workspace chip (opens the switcher)
 *  - end:   Create (+), Nafaa AI, sync status, notifications, account
 * The admin announcement banner and the offline banner sit right under it.
 */

import { Bell, ChevronDown, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import { isAllShops } from '@/core/auth/shopScope';
import { useShops } from '@/core/auth/useShops';
import { usePermission, PERMISSIONS } from '@/core/permissions';
import { Avatar, Icon, IconButton, NafaaAiMark, PressableScale, Text, useLayout, useTheme } from '@/design';
import { AnnouncementBanner } from '../appControl';
import { useShellUi } from '../hooks/useShellUi';
import { AI_HREF } from '../navigation/routes';
import { BrandMark } from './BrandMark';
import { SyncChip } from './SyncStatus';
import { OfflineBanner } from './OfflineBanner';

export function useUnreadCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => apiClient.get<{ count?: number } | number>('/notifications/unread-count').then((r) => (typeof r.data === 'number' ? r.data : r.data?.count ?? 0)),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function ShopChip() {
  const th = useTheme();
  const tenant = useAuthStore((s) => s.tenant);
  const shopId = useAuthStore((s) => s.currentShopId);
  const { data: shops } = useShops();
  const open = useShellUi((s) => s.open);
  const shopName = isAllShops(shopId) ? t('All shops') : shops?.find((s) => s.id === shopId)?.name ?? tenant?.name ?? 'Nafaa';
  return (
    <PressableScale
      onPress={() => open('shop')}
      haptic="tap"
      accessibilityLabel={t('Branch: {{name}}. Badlein', { name: shopName })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), flexShrink: 1, minWidth: 0, paddingVertical: 4 }}
    >
      <BrandMark size={36} />
      <View style={{ flexShrink: 1, minWidth: 0 }}>
        <Text size="2xs" weight="medium" tone="muted" numberOfLines={1}>{tenant?.name ?? 'Nafaa'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text size="base" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{shopName}</Text>
          <Icon icon={ChevronDown} size={16} tone="muted" />
        </View>
      </View>
    </PressableScale>
  );
}

export function AppHeader() {
  const th = useTheme();
  const user = useAuthStore((s) => s.user);
  const open = useShellUi((s) => s.open);
  const can = usePermission();
  const { data: unread = 0 } = useUnreadCount();
  const { isTablet } = useLayout();

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1), paddingHorizontal: th.space(4), paddingVertical: th.space(1.5) }}>
        <View style={{ flex: 1, minWidth: 0 }}><ShopChip /></View>
        {!isTablet && (
          <PressableScale
            onPress={() => open('create')}
            haptic="impact"
            accessibilityLabel={t('Create')}
            style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: th.colors.brand.solid, alignItems: 'center', justifyContent: 'center', marginEnd: 2 }}
          >
            <Icon icon={Plus} size={22} color={th.colors.brand.onSolid} strokeWidth={2.5} />
          </PressableScale>
        )}
        {AI_HREF && can(PERMISSIONS.AI_USE) && (
          <PressableScale onPress={() => router.push(AI_HREF as never)} haptic="tap" accessibilityLabel={t('Nafaa AI')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <NafaaAiMark size={28} />
          </PressableScale>
        )}
        <SyncChip />
        <IconButton icon={Bell} label={unread ? t('Notifications, {{unreadCount}} unread', { unreadCount: unread }) : t('Notifications')} badge={unread || undefined} onPress={() => router.push('/notifications')} />
        {!isTablet && (
          <PressableScale onPress={() => open('profile')} haptic="tap" accessibilityLabel={t('Account menu')} style={{ marginStart: 2 }}>
            <Avatar name={user?.fullName} url={user?.avatarUrl} size={36} />
          </PressableScale>
        )}
      </View>
      <AnnouncementBanner />
      <OfflineBanner />
    </View>
  );
}
