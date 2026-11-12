/**
 * ThemeDoc.tokens (+ preset defaults) → the CSS variables the Tailwind config
 * reads. Colours become "r g b" channels so opacity utilities work; text
 * colours on primary/accent/secondary are picked for contrast.
 */
import type { ThemeDoc, ThemeId, ThemeTokens } from '../api';
import { fontVar } from '../fonts-map';
import { getPreset, type ThemeLayout } from './presets';

function channels(hex: string | null | undefined): string | null {
  if (!hex) return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function readableOn(hex: string): string {
  const ch = channels(hex);
  if (!ch) return '#FFFFFF';
  const [r, g, b] = ch.split(' ').map((x) => Number(x) / 255) as [number, number, number];
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.42 ? '#111111' : '#FFFFFF';
}

function mix(a: string, b: string, t: number): string {
  const ca = channels(a)?.split(' ').map(Number) ?? [0, 0, 0];
  const cb = channels(b)?.split(' ').map(Number) ?? [255, 255, 255];
  const out = ca.map((x, i) => Math.round(x + ((cb[i] ?? 0) - x) * t));
  return `#${out.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** A full palette for a band in another colour: dark ("inverse") or brand ("accent"). */
function band(prefix: string, bg: string, fg: string, button: string): Record<string, string> {
  return {
    [`${prefix}-bg`]: bg,
    [`${prefix}-fg`]: fg,
    [`${prefix}-muted`]: mix(fg, bg, 0.32),
    [`${prefix}-line`]: mix(bg, fg, 0.16),
    [`${prefix}-surface`]: mix(bg, fg, 0.07),
    [`${prefix}-primary`]: button,
    [`${prefix}-primary-fg`]: readableOn(button),
  };
}

const RADIUS: Record<ThemeTokens['radius'], { card: string; btn: string; input: string; badge: string }> = {
  none: { card: '0px', btn: '0px', input: '0px', badge: '0px' },
  sm: { card: '6px', btn: '6px', input: '6px', badge: '4px' },
  md: { card: '14px', btn: '10px', input: '10px', badge: '6px' },
  lg: { card: '20px', btn: '14px', input: '12px', badge: '999px' },
  full: { card: '24px', btn: '999px', input: '999px', badge: '999px' },
};

const SPACING: Record<ThemeTokens['spacing'], string> = { compact: '40px', normal: '60px', roomy: '84px' };

export interface ResolvedTheme {
  themeId: ThemeId;
  tokens: ThemeTokens;
  layout: ThemeLayout;
  vars: Record<string, string>;
  /** Font families that are not self-hosted and need a Google Fonts link. */
  externalFonts: string[];
}

export function resolveTheme(themeId: ThemeId, doc: ThemeDoc | null): ResolvedTheme {
  const preset = getPreset(doc?.themeId ?? themeId);
  const t = doc?.tokens;
  const tokens: ThemeTokens = {
    colors: { ...preset.tokens.colors, ...(t?.colors ?? {}) },
    fonts: { ...preset.tokens.fonts, ...(t?.fonts ?? {}) },
    radius: t?.radius ?? preset.tokens.radius,
    spacing: t?.spacing ?? preset.tokens.spacing,
    buttonStyle: t?.buttonStyle ?? preset.tokens.buttonStyle,
    cardStyle: t?.cardStyle ?? preset.tokens.cardStyle,
  };
  const c = tokens.colors;
  const layout = preset.layout;
  // Dark band: the theme's text colour as background (dark in every preset).
  const dark = readableOn(c.text) === '#FFFFFF' ? c.text : '#111111';
  const colors: Record<string, string> = {
    bg: c.background,
    surface: c.surface,
    fg: c.text,
    muted: c.muted,
    line: c.border,
    primary: c.primary,
    'primary-fg': readableOn(c.primary),
    accent: c.accent,
    'accent-fg': readableOn(c.accent),
    secondary: c.secondary,
    'secondary-fg': readableOn(c.secondary),
    sale: c.sale,
    ok: '#16803C',
    warn: '#B86E00',
    ...band('inv', dark, mix(c.background, '#FFFFFF', 0.4), c.background),
    ...band('acc', c.primary, readableOn(c.primary), readableOn(c.primary) === '#FFFFFF' ? '#FFFFFF' : '#111111'),
  };
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(colors)) {
    const ch = channels(v);
    if (ch) vars[`--c-${k}`] = ch;
  }
  vars['--c-bg-base'] = vars['--c-bg']!;
  vars['--c-surface-base'] = vars['--c-surface']!;
  const r = RADIUS[tokens.radius] ?? RADIUS.md;
  vars['--r-card'] = r.card;
  vars['--r-btn'] = tokens.buttonStyle === 'pill' ? '999px' : r.btn;
  vars['--r-input'] = r.input;
  vars['--r-badge'] = r.badge;
  vars['--sy'] = SPACING[tokens.spacing] ?? SPACING.normal;
  vars['--page-width'] = layout.pageWidth;
  vars['--img-ratio'] = layout.imageRatio;
  const externalFonts: string[] = [];
  const h = fontVar(tokens.fonts.heading);
  const b = fontVar(tokens.fonts.body);
  vars['--font-heading'] = h ? `var(${h})` : `'${tokens.fonts.heading}'`;
  vars['--font-body'] = b ? `var(${b})` : `'${tokens.fonts.body}'`;
  if (!h) externalFonts.push(tokens.fonts.heading);
  if (!b && tokens.fonts.body !== tokens.fonts.heading) externalFonts.push(tokens.fonts.body);
  return { themeId: preset.id, tokens, layout, vars, externalFonts };
}
