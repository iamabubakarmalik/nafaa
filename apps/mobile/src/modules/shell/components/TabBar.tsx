/**
 * The app's tab bar. Three styles (Appearance → Mobile app → Tab bar):
 *  - floating: a rounded bar hovering above the content, blurred
 *  - labels:   full-width bar with labels
 *  - icons:    full-width bar, icons only with an active dot
 * On tablets the same tabs render as a side rail (see SideRail).
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/i18n';
import { haptic } from '@/core/device/haptics';
import { Icon, PressableScale, Text, useTheme, withAlpha, SPRING } from '@/design';
import type { TabDef } from '../navigation/tabs';

function TabButton({ tab, focused, onPress, style }: { tab: TabDef; focused: boolean; onPress: () => void; style: 'floating' | 'labels' | 'icons' }) {
  const th = useTheme();
  const c = th.colors;
  const motion = th.motion;
  const spring = SPRING.press;
  const pill = useAnimatedStyle(() => ({
    opacity: motion ? withSpring(focused ? 1 : 0, spring) : focused ? 1 : 0,
    transform: [{ scale: motion ? withSpring(focused ? 1 : 0.6, spring) : 1 }],
  }), [focused, motion]);
  const color = focused ? c.brand.text : c.textMuted;
  return (
    <PressableScale
      onPress={() => {
        haptic('select');
        onPress();
      }}
      scaleTo={0.92}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={t(tab.label)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: style === 'icons' ? 12 : 7 }}
    >
      <View style={{ width: 54, height: 30, alignItems: 'center', justifyContent: 'center' }}>
        {style !== 'icons' && <Animated.View style={[{ position: 'absolute', inset: 0, borderRadius: 15, backgroundColor: c.brand.soft }, pill]} />}
        <Icon icon={tab.icon} size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
      </View>
      {style !== 'icons' ? (
        <Text size="2xs" weight={focused ? 'bold' : 'medium'} color={color} numberOfLines={1}>{t(tab.label)}</Text>
      ) : (
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: focused ? c.brand.solid : 'transparent' }} />
      )}
    </PressableScale>
  );
}

export function TabBar({ state, navigation, tabs }: BottomTabBarProps & { tabs: TabDef[] }) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const style = th.appearance.mobile.tabBar;
  const active = state.routes[state.index]?.name;
  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (active !== name && !event.defaultPrevented) navigation.navigate(name);
  };

  const buttons = tabs.map((tab) => <TabButton key={tab.name} tab={tab} focused={active === tab.name} onPress={() => go(tab.name)} style={style} />);

  if (style === 'floating') {
    return (
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: th.space(3), paddingBottom: Math.max(insets.bottom - 6, th.space(3)) }}>
        <View style={{
          borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: withAlpha(th.isDark ? '#ffffff' : '#0f172a', th.isDark ? 0.08 : 0.06),
          shadowColor: '#0f172a', shadowOpacity: th.isDark ? 0.5 : 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
          backgroundColor: Platform.OS === 'android' ? th.colors.surfaceRaised : 'transparent',
        }}>
          {Platform.OS === 'ios' && <BlurView intensity={th.motion ? 60 : 90} tint={th.isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={{ position: 'absolute', inset: 0 }} />}
          <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 2, backgroundColor: withAlpha(th.colors.surface, Platform.OS === 'ios' ? 0.55 : 1) }}>{buttons}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', backgroundColor: th.colors.surface, borderTopWidth: 1, borderTopColor: th.colors.border, paddingBottom: Math.max(insets.bottom - 4, 6), paddingTop: 2 }}>
      {buttons}
    </View>
  );
}
