/**
 * Builds the theme from the appearance store and provides it to the tree.
 *
 * Mount once near the root. `useTheme()` returns everything components need:
 * semantic colors, spacing and radius helpers that follow density and
 * corners, the type scale with the text-size setting, fonts, motion and
 * haptics switches, and the layout direction.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Appearance as RNAppearance } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { isRtl } from '@/core/i18n';
import { DENSITIES, RADII, RADIUS_STEPS, CONTROL_HEIGHTS, type ControlSize, type RadiusStep } from '../tokens/layout';
import { TEXT_SCALES, TYPE, URDU_LINE_FACTOR, type FontWeight, type TypeSize } from '../tokens/typography';
import { buildColors, type ThemeColors } from './palette';
import { resolveFontSet, useChosenFonts, useRemoteFonts, type FontSet } from './fonts';
import { useAppearanceStore, useAppearance } from './store';
import type { ResolvedAppearance } from './appearance';

export interface Theme {
  appearance: ResolvedAppearance;
  isDark: boolean;
  /** UI language is Urdu: right-to-left layout and Urdu font rules. */
  rtl: boolean;
  colors: ThemeColors;
  fonts: FontSet;
  /** 4pt grid scaled by density: space(4) = 16 at comfortable. */
  space: (n: number) => number;
  /** Corner radius scaled by the Corners setting. */
  radius: (step: RadiusStep) => number;
  /** Control height by size, scaled by density. */
  control: (size: ControlSize) => number;
  /** Font size and line height at the user's text size. */
  type: (size: TypeSize, urdu?: boolean) => { fontSize: number; lineHeight: number };
  fontFamily: (weight: FontWeight, script?: 'latin' | 'urdu') => string | undefined;
  /** Animations allowed (app switch and the OS reduce-motion setting). */
  motion: boolean;
  haptics: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

/**
 * Paints the native root view in the saved theme's canvas color, so the frames
 * before React draws (cold start, language reload) are not white in dark mode.
 * Returns whether dark mode applies. Safe to call before any provider exists.
 */
export function primeFirstFrame(): boolean {
  const { resolved } = useAppearanceStore.getState();
  const isDark = resolved.mode === 'dark' || (resolved.mode === 'system' && RNAppearance.getColorScheme() === 'dark');
  SystemUI.setBackgroundColorAsync(buildColors(resolved, isDark).canvas).catch(() => undefined);
  return isDark;
}

export function buildTheme(a: ResolvedAppearance, isDark: boolean, fonts: FontSet, reduceMotionOS: boolean): Theme {
  const density = (DENSITIES[a.density] ?? DENSITIES.comfortable).scale;
  const corners = (RADII[a.radius] ?? RADII.default).scale;
  const textFactor = (TEXT_SCALES[a.textScale] ?? TEXT_SCALES.md).factor;
  const rtl = isRtl();
  return {
    appearance: a,
    isDark,
    rtl,
    colors: buildColors(a, isDark),
    fonts,
    space: (n) => Math.round(n * 4 * density),
    radius: (step) => (step === 'full' ? 999 : Math.round(RADIUS_STEPS[step] * corners)),
    control: (size) => Math.round(CONTROL_HEIGHTS[size] * (density < 1 ? 0.92 : 1)),
    type: (size, urdu = rtl) => {
      const [fs, lh] = TYPE[size];
      const fontSize = Math.round(fs * textFactor * 2) / 2;
      const lineHeight = Math.round(lh * textFactor * (urdu ? URDU_LINE_FACTOR : 1));
      return { fontSize, lineHeight };
    },
    fontFamily: (weight, script = 'latin') => (script === 'urdu' ? fonts.urdu[weight] : fonts.latin[weight]),
    motion: a.mobile.animations && !a.reduceMotion && !reduceMotionOS,
    haptics: a.mobile.haptics,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const appearance = useAppearance();
  const setSystemDark = useAppearanceStore((s) => s.setSystemDark);
  const ready = useRemoteFonts((s) => s.ready);
  const [reduceMotion, setReduceMotion] = useState(false);
  const rtl = isRtl();

  useChosenFonts(appearance.latinFont, appearance.urduFont, rtl);

  useEffect(() => {
    setSystemDark(RNAppearance.getColorScheme() === 'dark');
    const sub = RNAppearance.addChangeListener(({ colorScheme }) => setSystemDark(colorScheme === 'dark'));
    return () => sub.remove();
  }, [setSystemDark]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const { isDark, latinFont, urduFont } = appearance;
  const resolved = useAppearanceStore((s) => s.resolved);
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(buildColors(resolved, isDark).canvas).catch(() => undefined);
  }, [resolved, isDark]);

  const theme = useMemo(
    () => buildTheme(resolved, isDark, resolveFontSet(latinFont, urduFont, ready), reduceMotion),
    [resolved, isDark, latinFont, urduFont, ready, reduceMotion],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme() needs <ThemeProvider> above it');
  return theme;
}

/** Overrides the theme for a subtree (Appearance live preview). */
export function ThemeOverride({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
