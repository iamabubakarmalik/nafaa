/**
 * Floating action button, bottom-end corner, above the tab bar.
 *
 *   <Fab icon={Plus} label={t('New')} onPress={create} />          // extended with label
 *   <Fab icon={ScanLine} accessibilityLabel={t('Scan')} onPress={scan} />
 */

import type { LucideIcon } from 'lucide-react-native';
import { type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { Icon } from './Icon';

export interface FabProps {
  icon: LucideIcon;
  label?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  /** Extra space from the bottom (screens with their own bottom bar). */
  offset?: number;
  style?: StyleProp<ViewStyle>;
}

export function Fab({ icon, label, accessibilityLabel, onPress, offset = 0, style }: FabProps) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <PressableScale
      onPress={onPress}
      haptic="impact"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[{
        position: 'absolute', end: th.space(4), bottom: insets.bottom + th.space(4) + offset,
        height: 56, minWidth: 56, paddingHorizontal: label ? th.space(5) : 0, borderRadius: 28,
        backgroundColor: th.colors.brand.solid, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: th.space(2),
        shadowColor: th.colors.brandScale[800], shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
      }, style]}
    >
      <Icon icon={icon} size={24} color={th.colors.brand.onSolid} />
      {label && <Text size="md" weight="semibold" color={th.colors.brand.onSolid}>{label}</Text>}
    </PressableScale>
  );
}
