/**
 * Curated accent colors offered in Settings → Appearance.
 *
 * Every preset is a 600-step value with at least 3:1 contrast against white,
 * the WCAG level for the bold text used on buttons. Body text never uses the
 * brand color directly. Users can also enter any custom hex; the text color on
 * top of it is then chosen automatically (see readableOn).
 */

export interface ColorPreset {
  id: string;
  label: string;
  hex: string;
}

export const DEFAULT_BRAND_HEX = '#059669';

export const BRAND_PRESETS: readonly ColorPreset[] = [
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'green', label: 'Green', hex: '#16a34a' },
  { id: 'teal', label: 'Teal', hex: '#0d9488' },
  { id: 'cyan', label: 'Cyan', hex: '#0891b2' },
  { id: 'sky', label: 'Sky', hex: '#0284c7' },
  { id: 'blue', label: 'Blue', hex: '#2563eb' },
  { id: 'indigo', label: 'Indigo', hex: '#4f46e5' },
  { id: 'violet', label: 'Violet', hex: '#7c3aed' },
  { id: 'purple', label: 'Purple', hex: '#9333ea' },
  { id: 'fuchsia', label: 'Fuchsia', hex: '#c026d3' },
  { id: 'pink', label: 'Pink', hex: '#db2777' },
  { id: 'rose', label: 'Rose', hex: '#e11d48' },
  { id: 'red', label: 'Red', hex: '#dc2626' },
  { id: 'orange', label: 'Orange', hex: '#ea580c' },
  { id: 'amber', label: 'Amber', hex: '#b45309' },
  { id: 'gold', label: 'Gold', hex: '#a16207' },
  { id: 'lime', label: 'Lime', hex: '#4d7c0f' },
  { id: 'brown', label: 'Brown', hex: '#92400e' },
  { id: 'slate', label: 'Slate', hex: '#475569' },
  { id: 'graphite', label: 'Graphite', hex: '#1e293b' },
];
