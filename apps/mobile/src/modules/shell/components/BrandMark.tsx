/** Industry icon on the brand color (same as the web sidebar BrandMark). */

import { View } from 'react-native';
import { Icon, useTheme } from '@/design';
import { useIndustry } from '../hooks/useIndustry';

export function BrandMark({ size = 36 }: { size?: number }) {
  const th = useTheme();
  const { identity } = useIndustry();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: th.colors.brand.solid, alignItems: 'center', justifyContent: 'center' }}>
      <Icon icon={identity.icon} size={size * 0.52} color={th.colors.brand.onSolid} />
    </View>
  );
}
