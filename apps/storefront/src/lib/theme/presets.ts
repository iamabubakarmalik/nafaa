/**
 * Defaults and layout switches for the four themes. Colours, fonts, radius,
 * spacing, button and card style come from the shop's ThemeDoc.tokens (set
 * in the theme editor); the presets below fill anything missing and add the
 * layout choices that tokens do not cover (photo frame, header layout,
 * heading case).
 *
 * - fashion: quiet ivory canvas, serif display, square corners, tall 3:4
 *   photos, centred logo. Built for clothing and lawn brands.
 * - electronics: white and ink with electric blue, dark header, rounded
 *   tiles on light grey, square photos.
 * - grocery: fresh green, friendly rounded shapes, dense grid with a quick
 *   Add on every card. Also suits agri and general stores.
 * - beauty: blush canvas, rose primary, soft serif, pill buttons, 4:5 photos.
 */
import type { ThemeId, ThemeTokens } from '../api';

export interface ThemeLayout {
  imageRatio: '3/4' | '1/1' | '4/5';
  headingCase: 'normal' | 'upper';
  header: 'left' | 'center';
  /** Header in the dark band by default (colorScheme "default"). */
  darkHeader: boolean;
  quickAdd: boolean;
  pageWidth: string;
}

export interface ThemePreset {
  id: ThemeId;
  name: string;
  tokens: ThemeTokens;
  layout: ThemeLayout;
}

export const THEMES: Record<ThemeId, ThemePreset> = {
  fashion: {
    id: 'fashion',
    name: 'Libaas',
    tokens: {
      colors: { primary: '#1F1A17', secondary: '#1F1A17', background: '#FBF8F4', surface: '#F3EEE7', text: '#1F1A17', muted: '#6F655D', accent: '#9A6B3F', sale: '#A4372A', border: '#E4DCD2' },
      fonts: { heading: 'Playfair Display', body: 'Jost' },
      radius: 'none',
      spacing: 'roomy',
      buttonStyle: 'solid',
      cardStyle: 'plain',
    },
    layout: { imageRatio: '3/4', headingCase: 'upper', header: 'center', darkHeader: false, quickAdd: false, pageWidth: '1360px' },
  },
  electronics: {
    id: 'electronics',
    name: 'Volt',
    tokens: {
      colors: { primary: '#2456F5', secondary: '#0B1220', background: '#FFFFFF', surface: '#F2F4F8', text: '#0B1220', muted: '#5B6578', accent: '#FFB020', sale: '#E5302A', border: '#E3E7EE' },
      fonts: { heading: 'Sora', body: 'Inter' },
      radius: 'md',
      spacing: 'normal',
      buttonStyle: 'solid',
      cardStyle: 'bordered',
    },
    layout: { imageRatio: '1/1', headingCase: 'normal', header: 'left', darkHeader: true, quickAdd: true, pageWidth: '1320px' },
  },
  grocery: {
    id: 'grocery',
    name: 'Bazaar',
    tokens: {
      colors: { primary: '#167C3A', secondary: '#0F2417', background: '#FFFFFF', surface: '#F2F7F1', text: '#132A1C', muted: '#56685C', accent: '#F28C28', sale: '#D93A26', border: '#E1EAE0' },
      fonts: { heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
      radius: 'lg',
      spacing: 'compact',
      buttonStyle: 'pill',
      cardStyle: 'bordered',
    },
    layout: { imageRatio: '1/1', headingCase: 'normal', header: 'left', darkHeader: false, quickAdd: true, pageWidth: '1280px' },
  },
  beauty: {
    id: 'beauty',
    name: 'Glow',
    tokens: {
      colors: { primary: '#B0305A', secondary: '#3A2228', background: '#FFF9F7', surface: '#FBEDEA', text: '#2B1B1F', muted: '#7C6468', accent: '#E9B9A6', sale: '#C2185B', border: '#F0DEDA' },
      fonts: { heading: 'Fraunces', body: 'DM Sans' },
      radius: 'lg',
      spacing: 'normal',
      buttonStyle: 'pill',
      cardStyle: 'plain',
    },
    layout: { imageRatio: '4/5', headingCase: 'normal', header: 'center', darkHeader: false, quickAdd: true, pageWidth: '1280px' },
  },
};

export function getPreset(id: string | null | undefined): ThemePreset {
  return THEMES[id as ThemeId] ?? THEMES.grocery;
}
