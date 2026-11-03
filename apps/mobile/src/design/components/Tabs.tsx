/**
 * Section tabs with an animated underline (scroll sideways when many).
 *
 *   <Tabs tabs={[{ value: 'details', label: t('Details') }, { value: 'stock', label: t('Stock'), count: 3 }]} value={tab} onChange={setTab} />
 */

import { useState } from 'react';
import { ScrollView, View, type LayoutRectangle, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { SPRING } from '../tokens/motion';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import type { Option } from './Chips';

interface TabsProps<V extends string> {
  tabs: Option<V>[];
  value: V;
  onChange: (v: V) => void;
  style?: StyleProp<ViewStyle>;
}

export function Tabs<V extends string>({ tabs, value, onChange, style }: TabsProps<V>) {
  const th = useTheme();
  const c = th.colors;
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const active = layouts[value];
  const motion = th.motion;
  const spring = SPRING.press;
  const ax = active?.x ?? 0;
  const aw = active?.width ?? 0;
  const has = !!active;
  const bar = useAnimatedStyle(() => {
    if (!has) return { opacity: 0 };
    return {
      opacity: 1,
      width: motion ? withSpring(aw, spring) : aw,
      transform: [{ translateX: motion ? withSpring(ax, spring) : ax }],
    };
  }, [has, ax, aw, motion]);
  return (
    <View style={[{ borderBottomWidth: 1, borderBottomColor: c.border }, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: th.space(2) }}>
        <View style={{ flexDirection: 'row' }}>
          {tabs.map((tab) => {
            const on = tab.value === value;
            return (
              <PressableScale
                key={tab.value}
                onLayout={(e) => {
                  const l = e.nativeEvent.layout;
                  setLayouts((prev) => ({ ...prev, [tab.value]: l }));
                }}
                onPress={() => onChange(tab.value)}
                haptic="select"
                scaleTo={1}
                accessibilityRole="tab"
                accessibilityLabel={tab.count !== undefined ? `${tab.label}, ${tab.count}` : tab.label}
                accessibilityState={{ selected: on }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: th.space(3), height: 46 }}
              >
                <Text size="base" weight={on ? 'semibold' : 'medium'} color={on ? c.brand.text : c.textMuted}>{tab.label}</Text>
                {tab.count !== undefined && (
                  <View style={{ minWidth: 20, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: on ? c.brand.soft : c.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                    <Text size="2xs" weight="bold" color={on ? c.brand.text : c.textMuted} ltr>{String(tab.count)}</Text>
                  </View>
                )}
              </PressableScale>
            );
          })}
          <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, height: 2.5, borderRadius: 2, backgroundColor: c.brand.solid }, bar]} />
        </View>
      </ScrollView>
    </View>
  );
}
