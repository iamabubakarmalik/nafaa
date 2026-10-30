/**
 * Curated accent colors offered in Settings → Appearance.
 *
 * Every preset is a 600-step value with at least 3:1 contrast against white,
 * the WCAG level for the bold text used on buttons. Body text never uses the
 * brand color directly. Users can also enter any custom hex; the text color on
 * top of it is then chosen automatically (see readableOn).
 */

import { t } from '@core/i18n';
export interface ColorPreset {
  id: string;
  label: string;
  hex: string;
}

export const DEFAULT_BRAND_HEX = '#059669';

export const BRAND_PRESETS: readonly ColorPreset[] = [
  { id: 'emerald', label: t('Emerald'), hex: '#059669' },
  { id: 'green', label: t('Green'), hex: '#16a34a' },
  { id: 'teal', label: t('Teal'), hex: '#0d9488' },
  { id: 'cyan', label: t('Cyan'), hex: '#0891b2' },
  { id: 'sky', label: t('Sky'), hex: '#0284c7' },
  { id: 'blue', label: t('Blue'), hex: '#2563eb' },
  { id: 'indigo', label: t('Indigo'), hex: '#4f46e5' },
  { id: 'violet', label: t('Violet'), hex: '#7c3aed' },
  { id: 'purple', label: t('Purple'), hex: '#9333ea' },
  { id: 'fuchsia', label: t('Fuchsia'), hex: '#c026d3' },
  { id: 'pink', label: t('Pink'), hex: '#db2777' },
  { id: 'rose', label: t('Rose'), hex: '#e11d48' },
  { id: 'red', label: t('Red'), hex: '#dc2626' },
  { id: 'orange', label: t('Orange'), hex: '#ea580c' },
  { id: 'amber', label: t('Amber'), hex: '#b45309' },
  { id: 'gold', label: t('Gold'), hex: '#a16207' },
  { id: 'lime', label: t('Lime'), hex: '#4d7c0f' },
  { id: 'brown', label: t('Brown'), hex: '#92400e' },
  { id: 'slate', label: t('Slate'), hex: '#475569' },
  { id: 'graphite', label: t('Graphite'), hex: '#1e293b' },
];
