/**
 * Switch and Checkbox with label and description.
 *
 *   <Switch value={on} onChange={setOn} label={t('Bill par tax')} description={t('…')} />
 *   <Checkbox value={agree} onChange={setAgree} label={t('Is device ko yaad rakhein')} />
 */

import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { SPRING } from '../tokens/motion';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { Icon } from './Icon';

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

function SwitchKnob({ value }: { value: boolean }) {
  const th = useTheme();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.value = th.motion ? withSpring(value ? 1 : 0, SPRING.press) : value ? 1 : 0;
  }, [value, th.motion, p]);
  const off = th.colors.borderStrong;
  const on = th.colors.brand.solid;
  const dir = th.rtl ? -1 : 1;
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.value, [0, 1], [off, on]) }));
  // Logical direction: the knob moves toward the end edge in both LTR and RTL.
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: dir * p.value * 20 }] }));
  return (
    <Animated.View style={[{ width: 51, height: 31, borderRadius: 16, padding: 2, justifyContent: 'center' }, track]}>
      <Animated.View style={[{ width: 27, height: 27, borderRadius: 14, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }, knob]} />
    </Animated.View>
  );
}

export function Switch({ value, onChange, label, description, disabled, style }: ToggleProps) {
  const th = useTheme();
  return (
    <PressableScale
      onPress={() => onChange(!value)}
      disabled={disabled}
      haptic="tap"
      scaleTo={1}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={label}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), minHeight: 44, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {(label || description) && (
        <View style={{ flex: 1, gap: 2 }}>
          {label && <Text size="base" weight="medium">{label}</Text>}
          {description && <Text size="sm" tone="muted">{description}</Text>}
        </View>
      )}
      <SwitchKnob value={value} />
    </PressableScale>
  );
}

export function Checkbox({ value, onChange, label, description, disabled, style }: ToggleProps) {
  const th = useTheme();
  const c = th.colors;
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.value = th.motion ? withTiming(value ? 1 : 0, { duration: 140 }) : value ? 1 : 0;
  }, [value, th.motion, p]);
  const surface = c.surface;
  const solid = c.brand.solid;
  const border = c.borderStrong;
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [surface, solid]),
    borderColor: interpolateColor(p.value, [0, 1], [border, solid]),
  }));
  return (
    <PressableScale
      onPress={() => onChange(!value)}
      disabled={disabled}
      haptic="tap"
      scaleTo={1}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={label}
      style={[{ flexDirection: 'row', alignItems: description ? 'flex-start' : 'center', gap: th.space(3), minHeight: 44, opacity: disabled ? 0.5 : 1 }, style]}
    >
      <Animated.View style={[{ width: 22, height: 22, borderRadius: th.radius('xs'), borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: description ? 1 : 0 }, box]}>
        {value && <Icon icon={Check} size={14} color={c.brand.onSolid} strokeWidth={3.2} />}
      </Animated.View>
      {(label || description) && (
        <View style={{ flex: 1, gap: 2 }}>
          {label && <Text size="base" weight="medium">{label}</Text>}
          {description && <Text size="sm" tone="muted">{description}</Text>}
        </View>
      )}
    </PressableScale>
  );
}
