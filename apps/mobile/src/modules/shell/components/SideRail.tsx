/**
 * Tablet navigation: a vertical rail at the start edge with the same tabs,
 * the Create button and the account button. Many shops run the app on an
 * Android tablet at the counter, so everything stays one tap away.
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/i18n';
import { haptic } from '@/core/device/haptics';
import { useAuthStore } from '@/core/auth/store';
import { Avatar, Icon, Logo, PressableScale, Text, useTheme } from '@/design';
import type { TabDef } from '../navigation/tabs';
import { useShellUi } from '../hooks/useShellUi';

export const RAIL_WIDTH = 88;

export function SideRail({ state, navigation, tabs }: BottomTabBarProps & { tabs: TabDef[] }) {
  const th = useTheme();
  const c = th.colors;
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const open = useShellUi((s) => s.open);
  const active = state.routes[state.index]?.name;

  return (
    <View style={{ width: RAIL_WIDTH, backgroundColor: c.sidebar, borderEndWidth: 1, borderEndColor: c.border, paddingTop: insets.top + th.space(3), paddingBottom: Math.max(insets.bottom, th.space(3)), alignItems: 'center', gap: th.space(2) }}>
      <Logo size={40} />
      <PressableScale
        onPress={() => open('create')}
        haptic="impact"
        accessibilityLabel={t('Create')}
        style={{ marginTop: th.space(3), marginBottom: th.space(2), width: 52, height: 52, borderRadius: 18, backgroundColor: c.brand.solid, alignItems: 'center', justifyContent: 'center', shadowColor: c.brandScale[700], shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
      >
        <Icon icon={Plus} size={26} color={c.brand.onSolid} strokeWidth={2.4} />
      </PressableScale>
      {tabs.map((tab) => {
        const focused = active === tab.name;
        return (
          <PressableScale
            key={tab.name}
            onPress={() => {
              haptic('select');
              if (!focused) navigation.navigate(tab.name);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t(tab.label)}
            style={{ width: 72, alignItems: 'center', gap: 4, paddingVertical: th.space(2), borderRadius: th.radius('lg'), backgroundColor: focused ? c.brand.soft : 'transparent' }}
          >
            <Icon icon={tab.icon} size={24} color={focused ? c.brand.text : c.textMuted} strokeWidth={focused ? 2.4 : 2} />
            <Text size="2xs" weight={focused ? 'bold' : 'medium'} color={focused ? c.brand.text : c.textMuted} numberOfLines={1}>{t(tab.label)}</Text>
          </PressableScale>
        );
      })}
      <View style={{ flex: 1 }} />
      <PressableScale onPress={() => open('profile')} haptic="tap" accessibilityLabel={t('Account menu')}>
        <Avatar name={user?.fullName} url={user?.avatarUrl} size={42} />
      </PressableScale>
    </View>
  );
}
