/**
 * The Nafaa logo, exactly as on the web (public/logo.svg).
 *
 *   <Logo size={40} />                    // the app-icon tile
 *   <Logo size={28} variant="mark" />     // arc + diamond only, for colored backgrounds
 *   <Wordmark size={32} />                // tile + "Nafaa"
 */

import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { LOGO_AMBER, LOGO_GREEN } from '../tokens/presets';
import { Text } from '../components/Text';
import { LOGO_ARC_PATH, LOGO_DIAMOND_PATH, LOGO_TILE_RADIUS, LOGO_VIEWBOX } from './logoPaths';

export interface LogoProps {
  size?: number;
  /** 'tile' (default): green tile; 'mark': arc and diamond only. */
  variant?: 'tile' | 'mark';
  /** Arc color for the mark variant (default white). */
  color?: string;
}

export function Logo({ size = 40, variant = 'tile', color = '#ffffff' }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`} accessibilityLabel="Nafaa">
      {variant === 'tile' && <Rect width={LOGO_VIEWBOX} height={LOGO_VIEWBOX} rx={LOGO_TILE_RADIUS} fill={LOGO_GREEN} />}
      <Path d={LOGO_ARC_PATH} fill={variant === 'tile' ? '#ffffff' : color} />
      <Path d={LOGO_DIAMOND_PATH} fill={LOGO_AMBER} />
    </Svg>
  );
}

export function Wordmark({ size = 32, tone }: { size?: number; tone?: 'default' | 'inverse' }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3, direction: 'ltr' }}>
      <Logo size={size} />
      <Text weight="heavy" ltr color={tone === 'inverse' ? '#ffffff' : th.colors.text} style={{ fontSize: size * 0.72, lineHeight: size * 0.9, letterSpacing: -0.5 }}>
        Nafaa
      </Text>
    </View>
  );
}
