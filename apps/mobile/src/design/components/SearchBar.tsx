/**
 * Search field with clear button. Debounce is up to the caller
 * (useDebouncedValue from '@/design' helps).
 *
 *   <SearchBar value={q} onChangeText={setQ} placeholder={t('Search products')} />
 */

import { Search, X, ScanLine } from 'lucide-react-native';
import { forwardRef, useEffect, useState } from 'react';
import { TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { t } from '@/core/i18n';
import { useTheme } from '../theme/ThemeProvider';
import { MAX_FONT_SCALE } from '../tokens/typography';
import { Icon } from './Icon';
import { PressableScale } from './Pressable';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Shows a barcode button (POS, products). */
  onScan?: () => void;
  onSubmit?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SearchBar = forwardRef<TextInput, SearchBarProps>(function SearchBar({ value, onChangeText, placeholder, autoFocus, onScan, onSubmit, style }, ref) {
  const th = useTheme();
  const c = th.colors;
  const Comp = TextInput;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), height: th.control('md'), paddingHorizontal: th.space(3), backgroundColor: c.surfaceMuted, borderRadius: th.radius('lg') }, style]}>
      <Icon icon={Search} size={18} tone="subtle" />
      <Comp
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? t('Search')}
        placeholderTextColor={c.textSubtle}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        clearButtonMode="never"
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        selectionColor={c.brand.solid}
        accessibilityRole="search"
        style={{ flex: 1, fontSize: 16, color: c.text, fontFamily: th.fontFamily('regular', th.rtl ? 'urdu' : 'latin'), textAlign: th.rtl ? 'right' : 'left', paddingVertical: 8 }}
      />
      {!!value && (
        <PressableScale onPress={() => onChangeText('')} hitSlop={10} haptic="tap" accessibilityLabel={t('Saaf karein')}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={X} size={13} color={c.surface} strokeWidth={3} />
          </View>
        </PressableScale>
      )}
      {onScan && (
        <PressableScale onPress={onScan} hitSlop={8} haptic="tap" accessibilityLabel={t('Barcode scan karein')}>
          <Icon icon={ScanLine} size={20} tone="brand" />
        </PressableScale>
      )}
    </View>
  );
});

/** Value that follows `value` after `delay` ms without changes. */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
