/**
 * Nafaa AI mark: a robot head built from the Nafaa logo (same geometry as the
 * web NafaaAiMark). The visor is the logo cup, the antenna the amber diamond.
 *
 *   <NafaaAiMark size={28} />
 */

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

export function NafaaAiMark({ size = 28, label }: { size?: number; label?: string }) {
  const th = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel={label} accessible={!!label}>
      <Path d="M32 1L38.5 7.5L32 14L25.5 7.5Z" fill={th.isDark ? '#fbbf24' : '#f59e0b'} />
      <Rect x="30" y="12.5" width="4" height="7" rx="1.5" fill={th.isDark ? '#22c55e' : '#15803d'} />
      <Rect x="2" y="32" width="6" height="14" rx="2.5" fill="#15803d" />
      <Rect x="56" y="32" width="6" height="14" rx="2.5" fill="#15803d" />
      <Rect x="6" y="18" width="52" height="43" rx="13" fill="#16a34a" />
      <Circle cx="24" cy="29" r="3.6" fill="#f8fafc" />
      <Circle cx="40" cy="29" r="3.6" fill="#f8fafc" />
      <Path d="M18 37.4L22.6 34.8V42A9.6 9.6 0 0 0 41.4 42H46A14 14 0 0 1 18 42Z" fill="#f8fafc" />
    </Svg>
  );
}
