/**
 * Accent colors offered in Settings → Appearance (same list as the web).
 * Every preset is a 600-step value with at least 3:1 contrast against white.
 */

import { msg } from '@/core/i18n';

export interface ColorPreset {
  id: string;
  label: string;
  hex: string;
}

/** Built-in default accent, same as the web. */
export const DEFAULT_BRAND_HEX = '#059669';

/** The logo tile green. Used by the splash and the opening animation. */
export const LOGO_GREEN = '#16a34a';
export const LOGO_AMBER = '#fbbf24';

export const BRAND_PRESETS: readonly ColorPreset[] = [
  { id: 'emerald', label: msg('Emerald'), hex: '#059669' },
  { id: 'green', label: msg('Green'), hex: '#16a34a' },
  { id: 'teal', label: msg('Teal'), hex: '#0d9488' },
  { id: 'cyan', label: msg('Cyan'), hex: '#0891b2' },
  { id: 'sky', label: msg('Sky'), hex: '#0284c7' },
  { id: 'blue', label: msg('Blue'), hex: '#2563eb' },
  { id: 'indigo', label: msg('Indigo'), hex: '#4f46e5' },
  { id: 'violet', label: msg('Violet'), hex: '#7c3aed' },
  { id: 'purple', label: msg('Purple'), hex: '#9333ea' },
  { id: 'fuchsia', label: msg('Fuchsia'), hex: '#c026d3' },
  { id: 'pink', label: msg('Pink'), hex: '#db2777' },
  { id: 'rose', label: msg('Rose'), hex: '#e11d48' },
  { id: 'red', label: msg('Red'), hex: '#dc2626' },
  { id: 'orange', label: msg('Orange'), hex: '#ea580c' },
  { id: 'amber', label: msg('Amber'), hex: '#b45309' },
  { id: 'gold', label: msg('Gold'), hex: '#a16207' },
  { id: 'lime', label: msg('Lime'), hex: '#4d7c0f' },
  { id: 'brown', label: msg('Brown'), hex: '#92400e' },
  { id: 'slate', label: msg('Slate'), hex: '#475569' },
  { id: 'graphite', label: msg('Graphite'), hex: '#1e293b' },
];
