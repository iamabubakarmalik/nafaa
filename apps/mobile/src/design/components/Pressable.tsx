/**
 * Touchable base for the kit: springs down slightly on press (UI thread),
 * optional haptic tick, and an accessible role. Use it for any custom
 * tappable surface instead of RN Pressable/TouchableOpacity.
 *
 *   <PressableScale onPress={open} haptic="tap" accessibilityLabel={t('Open')}>…</PressableScale>
 */

import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic, type HapticKind } from '@/core/device/haptics';
import { useTheme } from '../theme/ThemeProvider';
import { PRESS_SCALE, SPRING } from '../tokens/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  /** How far to shrink while pressed (1 = no animation). */
  scaleTo?: number;
  haptic?: HapticKind | false;
  /** Background shown while pressed (rows, menu items). */
  pressedStyle?: StyleProp<ViewStyle>;
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
}

export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { style, scaleTo = PRESS_SCALE, haptic: hapticKind = false, pressedStyle, onPressIn, onPressOut, onPress, disabled, children, accessibilityRole = 'button', ...rest },
  ref,
) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const animate = theme.motion && scaleTo !== 1;
  const [pressed, setPressed] = useState(false);

  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={(e) => {
        if (pressedStyle) setPressed(true);
        if (animate) scale.value = withSpring(scaleTo, SPRING.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (pressedStyle) setPressed(false);
        if (animate) scale.value = withSpring(1, SPRING.press);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticKind) haptic(hapticKind);
        onPress?.(e);
      }}
      // Reanimated needs a plain style (not a function) on animated components.
      style={[style, pressed && pressedStyle, animate && animated]}
      {...rest}
    >
      {typeof children === 'function' ? children({ pressed }) : children}
    </AnimatedPressable>
  );
});
