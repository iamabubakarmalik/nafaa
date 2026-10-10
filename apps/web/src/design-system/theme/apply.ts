/**
 * Writes a resolved appearance to the document.
 *
 * This is the only code that touches <html> for theming: the `dark` class,
 * CSS custom properties, data attributes, the root font size, `lang`/`dir`,
 * and the web-font <link> tags. Keeping it in one place is what stops the
 * old problem of three different modules toggling dark mode independently.
 *
 * The computed variables are also cached in localStorage so the inline boot
 * script in index.html can paint the right colors before React loads.
 */

import { buildScale, readableOn, SCALE_STEPS, type ColorScale, type ScaleStep } from '../tokens/color';
import DARK_RULES from '../tailwind/dark-rules.json';
import { DENSITIES, RADII } from '../tokens/layout';
import { CANVAS_TONES } from '../tokens/surfaces';
import { findLatinFont, findUrduFont, MONO_STACK, TEXT_SCALES } from '../tokens/typography';
import type { ResolvedAppearance } from './appearance';

export const BOOT_CACHE_KEY = 'nafaa-appearance-boot';

/**
 * Right-to-left layout for Urdu script. Off until screens are translated and
 * converted to logical (start/end) spacing; turning it on earlier would flip
 * untranslated layouts for businesses that already saved "Urdu" as language.
 */
export const RTL_ENABLED = false;

export interface BootCache {
  dark: boolean;
  vars: Record<string, string>;
  rootFontSize: string;
  density: string;
  radius: string;
  lang: string;
  dir: 'ltr' | 'rtl';
}

type Rgb = [number, number, number];
const toRgb = (ch: string) => ch.split(' ').map(Number) as Rgb;
const mix = (rgb: Rgb, over: Rgb, amount: number) => rgb.map((v, i) => Math.round(v * amount + over[i] * (1 - amount))).join(' ');

/**
 * Brand values that differ in dark mode, following the same rules Tailwind
 * applies to every other hue (tailwind/dark-rules.json): light tints become
 * glows over the dark surface, deep text steps borrow lighter steps. In light
 * mode the variables simply repeat the normal scale.
 */
function brandUsageVariables(scale: ColorScale, dark: boolean): Record<string, string> {
  const vars: Record<string, string> = {};
  const surface = DARK_RULES.surface as Rgb;
  const base = toRgb(scale[500]);
  for (const [step, amount] of Object.entries(DARK_RULES.bgTint)) {
    vars[`--bg-brand-${step}`] = dark ? mix(base, surface, amount) : scale[Number(step) as ScaleStep];
  }
  for (const [step, amount] of Object.entries(DARK_RULES.borderTint)) {
    vars[`--bd-brand-${step}`] = dark ? mix(base, surface, amount) : scale[Number(step) as ScaleStep];
  }
  for (const [step, borrowed] of Object.entries(DARK_RULES.textStep)) {
    vars[`--tx-brand-${step}`] = scale[(dark ? borrowed : Number(step)) as ScaleStep];
  }
  return vars;
}

/** Builds every CSS variable the theme controls. Pure; safe to unit test. */
export function themeVariables(a: ResolvedAppearance, dark = false): Record<string, string> {
  const vars: Record<string, string> = {};
  const scale = buildScale(a.accentHex);
  for (const step of SCALE_STEPS) vars[`--brand-${step}`] = scale[step];
  Object.assign(vars, brandUsageVariables(scale, dark));
  vars['--brand-fg'] = readableOn(a.accentHex);
  vars['--brand-hex'] = a.accentHex;
  vars['--ring-color'] = scale[500];

  vars['--font-latin'] = findLatinFont(a.latinFont).stack;
  vars['--font-urdu'] = findUrduFont(a.urduFont).stack;
  vars['--font-mono'] = MONO_STACK;

  vars['--density-scale'] = String((DENSITIES[a.density] ?? DENSITIES.comfortable).scale);
  vars['--radius-scale'] = String((RADII[a.radius] ?? RADII.default).scale);

  Object.assign(vars, surfaceVariables(a, scale, dark));
  return vars;
}

/**
 * Page canvas and sidebar surfaces for the chosen tone. Set inline on <html>,
 * so they must already be the right value for the current mode. A brand
 * sidebar uses the deepest brand steps.
 */
function surfaceVariables(a: ResolvedAppearance, scale: ColorScale, dark: boolean): Record<string, string> {
  const tone = CANVAS_TONES[a.canvasTone] ?? CANVAS_TONES.soft;
  const mode = dark ? tone.dark : tone.light;
  let canvas = mode.canvas.join(' ');
  let sidebar = mode.sidebar.join(' ');
  if (a.canvasTone === 'tinted') {
    const accent = toRgb(scale[500]);
    canvas = mix(accent, mode.canvas as Rgb, dark ? 0.07 : 0.045);
    sidebar = mix(accent, mode.sidebar as Rgb, dark ? 0.1 : 0.08);
  }
  const vars: Record<string, string> = { '--shell-canvas': canvas, '--shell-sidebar': sidebar };
  // Used by the sidebar when its style is "dark" or "brand" (AppShell scopes .dark to it).
  vars['--shell-sidebar-dark'] = a.sidebarStyle === 'brand' ? scale[950] : (dark ? sidebar : '11 17 32');
  vars['--shell-sidebar-dark-line'] = a.sidebarStyle === 'brand' ? scale[900] : '30 41 59';
  return vars;
}

export function isDarkMode(a: ResolvedAppearance, systemPrefersDark: boolean): boolean {
  return a.mode === 'dark' || (a.mode === 'system' && systemPrefersDark);
}

const FONT_LINK_ATTR = 'data-ds-font';

/** Adds a Google Fonts stylesheet once per font; unused fonts are never fetched. */
export function ensureFont(family: string | null, id: string) {
  if (!family || typeof document === 'undefined') return;
  if (document.head.querySelector(`link[${FONT_LINK_ATTR}="${id}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  link.setAttribute(FONT_LINK_ATTR, id);
  document.head.appendChild(link);
}

export function applyAppearance(a: ResolvedAppearance, systemPrefersDark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark = isDarkMode(a, systemPrefersDark);
  const vars = themeVariables(a, dark);

  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);

  const rootFontSize = `${(TEXT_SCALES[a.textScale] ?? TEXT_SCALES.md).rootPercent}%`;
  root.style.fontSize = rootFontSize;
  root.dataset.density = a.density;
  root.dataset.radius = a.radius;
  root.dataset.motion = a.reduceMotion ? 'reduce' : 'full';

  const lang = a.language === 'ur' ? 'ur' : a.language === 'roman_ur' ? 'ur-Latn' : 'en';
  const dir = RTL_ENABLED && a.language === 'ur' ? 'rtl' : 'ltr';
  root.lang = lang;
  root.dir = dir;

  const latin = findLatinFont(a.latinFont);
  ensureFont(latin.google, latin.id);
  if (a.language === 'ur') {
    const urdu = findUrduFont(a.urduFont);
    ensureFont(urdu.google, urdu.id);
  }

  updateThemeColorMeta(dark ? '#0b1220' : a.accentHex);

  try {
    const cache: BootCache = { dark, vars, rootFontSize, density: a.density, radius: a.radius, lang, dir };
    localStorage.setItem(BOOT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage can be unavailable (private mode); the theme still applies.
  }
}

function updateThemeColorMeta(color: string) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = color;
}
