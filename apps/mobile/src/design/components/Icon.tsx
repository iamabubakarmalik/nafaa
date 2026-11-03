/**
 * Lucide icon with theme color and size. Direction icons (arrows, chevrons)
 * pass `flip` so they point the right way in Urdu.
 *
 *   <Icon icon={Package} />
 *   <Icon icon={ChevronRight} flip tone="subtle" size={18} />
 */

import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { toneColor, type TextTone } from './Text';

export interface IconProps {
  icon: LucideIcon;
  size?: number;
  tone?: TextTone;
  color?: string;
  strokeWidth?: number;
  /** Mirror in right-to-left layouts (arrows, chevrons, back). */
  flip?: boolean;
}

export function Icon({ icon: Glyph, size = 20, tone = 'secondary', color, strokeWidth = 2, flip }: IconProps) {
  const theme = useTheme();
  const glyph = <Glyph size={size} color={color ?? toneColor(theme, tone)} strokeWidth={strokeWidth} />;
  // The mirror is applied to a plain View: a transform on the SVG itself makes it disappear in RTL.
  return flip && theme.rtl ? <View style={{ width: size, height: size, transform: [{ scaleX: -1 }] }}>{glyph}</View> : glyph;
}
