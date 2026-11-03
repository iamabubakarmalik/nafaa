/** Product picture: the photo, or an emoji guessed from the name on a tint that is always the same for that name. */

import { Image } from 'expo-image';
import { memo } from 'react';
import { Text as RNText, View } from 'react-native';
import { productEmoji, productTintIndex } from '@nafaa/core/inventory';
import { useTheme, type StatusTone } from '@/design';

const TINTS: StatusTone[] = ['info', 'success', 'warning', 'danger', 'accent', 'brand'];

export const ProductThumb = memo(function ProductThumb({ name, category, url, size = 44, radius }: {
  name?: string | null;
  category?: string | null;
  url?: string | null;
  size?: number;
  radius?: number;
}) {
  const th = useTheme();
  const r = radius ?? Math.min(th.radius('lg'), size / 4);
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: r, backgroundColor: th.colors.surfaceMuted }} contentFit="cover" transition={120} recyclingKey={url} />;
  }
  const tone = th.colors[TINTS[productTintIndex(name, TINTS.length)]];
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontSize: Math.round(size * 0.48) }} allowFontScaling={false}>{productEmoji(name, category)}</RNText>
    </View>
  );
});
