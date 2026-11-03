/**
 * Turns a resolved appearance into the colors every component uses.
 *
 * Same rules as the web palette (tailwind/palette.cjs + theme/apply.ts):
 * greys swap to dark surfaces, light tints become low-opacity glows over the
 * dark card surface, deep text steps borrow the light end of their hue.
 * Components use these semantic names, never hex literals.
 */

import { buildHexScale, mixHex, readableOn, withAlpha, type HexScale } from '../tokens/color';
import { CANVAS_TONES } from '../tokens/surfaces';
import type { ResolvedAppearance } from './appearance';

/** Dark card surface the web blends tints over (dark-rules.json). */
const DARK_SURFACE = '#11192b';
const BG_TINT = { 50: 0.12, 100: 0.18, 200: 0.26, 300: 0.38 } as const;
const BORDER_TINT = { 50: 0.16, 100: 0.22, 200: 0.32, 300: 0.45 } as const;

export interface Tone {
  /** Filled background (badges, buttons). */
  solid: string;
  /** Text/icon on `solid`. */
  onSolid: string;
  /** Soft tinted background. */
  soft: string;
  /** Border for soft surfaces. */
  border: string;
  /** Readable text in this hue on normal surfaces. */
  text: string;
}

export interface ThemeColors {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  surfaceSunken: string;
  /** Sheets, dialogs and menus (a step above surface in dark mode). */
  surfaceRaised: string;
  sidebar: string;
  border: string;
  borderStrong: string;
  divider: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  /** Brand scale generated from the accent (hex, light values). */
  brandScale: HexScale;
  brand: Tone & { pressed: string };
  success: Tone;
  warning: Tone;
  danger: Tone;
  info: Tone;
  neutral: Tone;
  /** Accent used for highlights (the logo amber). */
  accent: Tone;
  overlay: string;
  skeleton: string;
  skeletonHighlight: string;
  shadow: string;
  focusRing: string;
}

type Hue = { 50: string; 100: string; 200: string; 300: string; 400: string; 500: string; 600: string; 700: string };

const GREEN: Hue = { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' };
const AMBER: Hue = { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' };
const ROSE: Hue = { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' };
const BLUE: Hue = { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' };
const SLATE: Hue = { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155' };

function tone(h: Hue, dark: boolean): Tone {
  return dark
    ? { solid: h[600], onSolid: '#ffffff', soft: mixHex(h[500], DARK_SURFACE, BG_TINT[50] + 0.04), border: mixHex(h[500], DARK_SURFACE, BORDER_TINT[200]), text: h[400] }
    : { solid: h[600], onSolid: '#ffffff', soft: h[50], border: h[200], text: h[700] };
}

export function buildColors(a: ResolvedAppearance, dark: boolean): ThemeColors {
  const scale = buildHexScale(a.accentHex);
  const toneDef = CANVAS_TONES[a.canvasTone] ?? CANVAS_TONES.soft;
  const surfaces = dark ? toneDef.dark : toneDef.light;
  let canvas = surfaces.canvas;
  let sidebar = surfaces.sidebar;
  if (a.canvasTone === 'tinted') {
    canvas = mixHex(scale[500], canvas, dark ? 0.07 : 0.045);
    sidebar = mixHex(scale[500], sidebar, dark ? 0.1 : 0.08);
  }
  const high = a.contrast === 'high';

  const brand: ThemeColors['brand'] = dark
    ? {
        solid: scale[600],
        onSolid: readableOn(scale[600]),
        pressed: scale[700],
        soft: mixHex(scale[500], DARK_SURFACE, BG_TINT[50] + 0.04),
        border: mixHex(scale[500], DARK_SURFACE, BORDER_TINT[200]),
        text: scale[300],
      }
    : {
        solid: scale[600],
        onSolid: readableOn(scale[600]),
        pressed: scale[700],
        soft: scale[50],
        border: scale[200],
        text: scale[700],
      };

  const neutral: Tone = dark
    ? { solid: '#334155', onSolid: '#f1f5f9', soft: '#1b2538', border: '#263246', text: '#acb8c8' }
    : { solid: '#475569', onSolid: '#ffffff', soft: SLATE[100], border: SLATE[200], text: SLATE[600] };

  if (dark) {
    return {
      canvas,
      surface: '#11192b',
      surfaceMuted: '#1b2538',
      surfaceSunken: '#0c1220',
      surfaceRaised: '#162034',
      sidebar,
      border: high ? '#475569' : '#263246',
      borderStrong: high ? '#64748b' : '#334155',
      divider: high ? '#334155' : '#1e293b',
      text: '#f1f5f9',
      textSecondary: high ? '#e2e8f0' : '#acb8c8',
      textMuted: high ? '#cbd5e1' : '#94a3b8',
      textSubtle: high ? '#aab7c9' : '#738298',
      textInverse: '#0f172a',
      brandScale: scale,
      brand,
      success: tone(GREEN, true),
      warning: tone(AMBER, true),
      danger: tone(ROSE, true),
      info: tone(BLUE, true),
      neutral,
      accent: { ...tone(AMBER, true), solid: AMBER[400], onSolid: '#451a03' },
      overlay: 'rgba(2, 6, 23, 0.66)',
      skeleton: '#1b2538',
      skeletonHighlight: '#263246',
      shadow: '#000000',
      focusRing: withAlpha(scale[400], 0.5),
    };
  }
  return {
    canvas,
    surface: '#ffffff',
    surfaceMuted: SLATE[100],
    surfaceSunken: SLATE[50],
    surfaceRaised: '#ffffff',
    sidebar,
    border: high ? '#94a3b8' : SLATE[200],
    borderStrong: high ? '#64748b' : SLATE[300],
    divider: high ? SLATE[300] : SLATE[100],
    text: '#0f172a',
    textSecondary: high ? '#1e293b' : SLATE[600],
    textMuted: high ? '#334155' : SLATE[500],
    textSubtle: high ? '#475569' : SLATE[400],
    textInverse: '#ffffff',
    brandScale: scale,
    brand,
    success: tone(GREEN, false),
    warning: tone(AMBER, false),
    danger: tone(ROSE, false),
    info: tone(BLUE, false),
    neutral,
    accent: { ...tone(AMBER, false), solid: AMBER[400], onSolid: '#451a03' },
    overlay: 'rgba(15, 23, 42, 0.45)',
    skeleton: SLATE[100],
    skeletonHighlight: SLATE[200],
    shadow: '#0f172a',
    focusRing: withAlpha(scale[500], 0.35),
  };
}

export type StatusTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
