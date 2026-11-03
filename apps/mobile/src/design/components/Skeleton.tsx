/**
 * Loading placeholders that pulse softly (static when motion is off).
 *
 *   <Skeleton width={120} height={20} />
 *   <SkeletonRows count={5} />          // list placeholder
 */

import { useEffect } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';

export function Skeleton({ width = '100%', height = 16, radius, style }: { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!t.motion) return;
    o.value = withRepeat(withTiming(0.45, { duration: 750, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(o);
  }, [t.motion, o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius ?? t.radius('sm'), backgroundColor: t.colors.skeleton }, anim, style]} />;
}

export function SkeletonRows({ count = 4, avatar = true }: { count?: number; avatar?: boolean }) {
  const t = useTheme();
  return (
    <View accessibilityLabel="loading" style={{ gap: t.space(4), padding: t.space(4) }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space(3) }}>
          {avatar && <Skeleton width={40} height={40} radius={t.radius('md')} />}
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="65%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
          <Skeleton width={64} height={14} />
        </View>
      ))}
    </View>
  );
}
