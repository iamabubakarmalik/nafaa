/**
 * Theme-aware StyleSheet factory, memoized per theme.
 *
 *   const useStyles = makeStyles((t) => ({
 *     card: { backgroundColor: t.colors.surface, borderRadius: t.radius('lg'), padding: t.space(4) },
 *   }));
 *   function MyCard() { const s = useStyles(); return <View style={s.card} />; }
 */

import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme, type Theme } from './ThemeProvider';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T) {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => {
      let styles = cache.get(theme);
      if (!styles) {
        styles = StyleSheet.create(factory(theme)) as T;
        cache.set(theme, styles);
      }
      return styles;
    }, [theme]);
  };
}
