/**
 * Screen size class for adaptive layouts.
 *
 *   const { isTablet, isWide, columns } = useLayout();
 *
 * isTablet (≥768pt): side rail instead of the bottom tabs, sheets centered.
 * isWide (≥1024pt): two panes (list + detail) where a screen supports it.
 */

import { useWindowDimensions } from 'react-native';
import { TABLET_MIN_WIDTH, WIDE_MIN_WIDTH } from '../tokens/layout';

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;
  const isWide = width >= WIDE_MIN_WIDTH;
  return {
    width,
    height,
    isTablet,
    isWide,
    landscape: width > height,
    /** Grid columns for tiles/cards. */
    columns: isWide ? 4 : isTablet ? 3 : 2,
  };
}
