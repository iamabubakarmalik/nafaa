/**
 * Chips, chip groups and the segmented control.
 *
 *   <ChipGroup options={[{ value: 'all', label: t('All') }, …]} value={filter} onChange={setFilter} />      // single, scrolls sideways
 *   <ChipGroup multiple value={days} onChange={setDays} options={…} wrap />
 *   <Segmented options={[{ value: 'light', label: t('Light'), icon: Sun }, …]} value={mode} onChange={setMode} />
 */

import type { LucideIcon } from 'lucide-react-native';
import { Check } from 'lucide-react-native';
import { ScrollView, View, type StyleProp, type ViewStyle, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { SPRING } from '../tokens/motion';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { Icon } from './Icon';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  /** Small count after the label. */
  count?: number;
  disabled?: boolean;
}

export function Chip({ label, selected, onPress, icon, count, disabled }: ChipProps) {
  const th = useTheme();
  const c = th.colors;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="select"
      accessibilityRole="button"
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: th.space(3.5),
        borderRadius: th.radius('full'), borderWidth: 1,
        backgroundColor: selected ? c.brand.soft : c.surface,
        borderColor: selected ? c.brand.solid : c.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {selected && !icon ? <Icon icon={Check} size={14} color={c.brand.text} strokeWidth={3} /> : icon ? <Icon icon={icon} size={15} color={selected ? c.brand.text : c.textSecondary} /> : null}
      <Text size="sm" weight={selected ? 'semibold' : 'medium'} color={selected ? c.brand.text : c.textSecondary}>{label}</Text>
      {count !== undefined && <Text size="xs" weight="semibold" tone="muted" ltr>{String(count)}</Text>}
    </PressableScale>
  );
}

export interface Option<V extends string = string> {
  value: V;
  label: string;
  icon?: LucideIcon;
  count?: number;
  disabled?: boolean;
}

type ChipGroupProps<V extends string> = {
  options: Option<V>[];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
} & ({ multiple?: false; value: V; onChange: (v: V) => void } | { multiple: true; value: V[]; onChange: (v: V[]) => void });

export function ChipGroup<V extends string>(props: ChipGroupProps<V>) {
  const th = useTheme();
  const isOn = (v: V) => (props.multiple ? props.value.includes(v) : props.value === v);
  const toggle = (v: V) => {
    if (props.multiple) props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    else props.onChange(v);
  };
  const chips = props.options.map((o) => (
    <Chip key={o.value} label={o.label} icon={o.icon} count={o.count} disabled={o.disabled} selected={isOn(o.value)} onPress={() => toggle(o.value)} />
  ));
  if (props.wrap) return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }, props.style]}>{chips}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={props.style} contentContainerStyle={{ gap: th.space(2), paddingHorizontal: th.space(4) }}>
      {chips}
    </ScrollView>
  );
}

interface SegmentedProps<V extends string> {
  options: Option<V>[];
  value: V;
  onChange: (v: V) => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export function Segmented<V extends string>({ options, value, onChange, size = 'md', style }: SegmentedProps<V>) {
  const th = useTheme();
  const c = th.colors;
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segW = width > 0 ? (width - 8) / options.length : 0;
  const dir = th.rtl ? -1 : 1;
  const motion = th.motion;
  const spring = SPRING.press;
  const thumb = useAnimatedStyle(() => {
    const x = dir * index * segW;
    return { width: segW, transform: [{ translateX: motion ? withSpring(x, spring) : x }] };
  }, [index, segW, dir, motion]);
  const h = size === 'sm' ? 36 : 42;
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[{ flexDirection: 'row', height: h, padding: 4, backgroundColor: c.surfaceMuted, borderRadius: th.radius('lg') }, style]}
    >
      {segW > 0 && (
        <Animated.View style={[{
          position: 'absolute', top: 4, bottom: 4, start: 4, borderRadius: th.radius('md'), backgroundColor: th.isDark ? c.surfaceRaised : c.surface,
          shadowColor: '#000', shadowOpacity: th.isDark ? 0 : 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
        }, thumb]} />
      )}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            haptic="select"
            scaleTo={1}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {o.icon && <Icon icon={o.icon} size={15} color={on ? c.text : c.textMuted} />}
            <Text size="sm" weight={on ? 'semibold' : 'medium'} color={on ? c.text : c.textMuted} numberOfLines={1}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
