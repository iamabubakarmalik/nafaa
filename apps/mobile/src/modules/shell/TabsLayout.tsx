/**
 * Main tabs. Phones: bottom tab bar (style from Appearance). Tablets: side
 * rail at the start edge. Tabs adapt to role (see navigation/tabs.ts).
 * Field staff without counter access are sent to their own area from Home.
 */

import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { t } from '@/core/i18n';
import { useLayout, useTheme } from '@/design';
import { useAuthStore } from '@/core/auth/store';
import { TabBar } from './components/TabBar';
import { SideRail } from './components/SideRail';
import { TAB_NAMES, useRoleProfile, useTabs } from './navigation/tabs';
import { useNotifications } from '@/modules/notifications';
import { useOnlineStore } from '@/modules/online-store';

/** User the start tab was opened for (once per launch and per sign-in). */
let openedFor: string | null = null;

export function TabsLayout() {
  const th = useTheme();
  const tabs = useTabs();
  const { isTablet } = useLayout();
  useOnlineStore(true);
  useNotifications(true);
  const profile = useRoleProfile();
  const shown = new Set(tabs.map((x) => x.name));
  // Role profile first (waiter → Tables, kitchen → Kitchen, cashier → POS), then Appearance → Start screen.
  const start = profile.start && shown.has(profile.start) ? profile.start
    : th.appearance.mobile.startScreen === 'pos' && shown.has('pos') ? 'pos'
      : !shown.has('index') ? tabs[0]?.name : undefined;

  // Open the start tab once per launch.
  const userId = useAuthStore((s) => s.user?.id ?? null);
  useEffect(() => {
    if (start && start !== 'index' && openedFor !== userId) {
      openedFor = userId;
      router.navigate(`/${start}` as never);
    }
  }, [start, userId]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isTablet ? (th.rtl ? 'right' : 'left') : 'bottom',
        sceneStyle: { backgroundColor: th.colors.canvas },
        animation: th.motion ? 'shift' : 'none',
      }}
      tabBar={(props) => (isTablet ? <SideRail {...props} tabs={tabs} /> : <TabBar {...props} tabs={tabs} />)}
    >
      {TAB_NAMES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ title: t(tabs.find((x) => x.name === name)?.label ?? name), href: shown.has(name) ? undefined : null }} />
      ))}
    </Tabs>
  );
}
