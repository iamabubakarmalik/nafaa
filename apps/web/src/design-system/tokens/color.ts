/**
 * Color scale generation.
 *
 * Every accent in the product (brand, industry identity, user-picked color)
 * is described by a single hex value. This module expands that value into a
 * full 50–950 scale in the OKLCH color space, so each step keeps the hue of
 * the source color while lightness changes evenly — the same way the
 * Tailwind palettes are built.
 *
 * The scale is emitted as space-separated RGB channels ("5 150 105") because
 * Tailwind's `rgb(var(--x) / <alpha-value>)` form needs bare channels for
 * opacity modifiers such as `bg-brand-600/20` to keep working.
 */

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];
export type ColorScale = Record<ScaleStep, string>;

/** Target lightness per step, measured from Tailwind's own palettes. */
const LIGHTNESS: Record<ScaleStep, number> = {
  50: 0.979, 100: 0.95, 200: 0.905, 300: 0.845, 400: 0.765, 500: 0.696,
  600: 0.596, 700: 0.508, 800: 0.432, 900: 0.378, 950: 0.262,
};

/**
 * Chroma per step relative to the source color. Mid tones (300–500) carry a
 * little more color than the source, as in Tailwind's palettes; tints and
 * shades are softer. Out-of-gamut results are pulled back by oklchToRgb().
 */
const CHROMA: Record<ScaleStep, number> = {
  50: 0.18, 100: 0.38, 200: 0.68, 300: 1, 400: 1.14, 500: 1.16,
  600: 1, 700: 0.88, 800: 0.74, 900: 0.62, 950: 0.46,
};

type Rgb = [number, number, number];
type Oklch = { l: number; c: number; h: number };

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return c * 255;
};

function rgbToOklch(rgb: Rgb): Oklch {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(A * A + B * B);
  const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

/** Returns linear-free sRGB floats; values outside 0–255 mean "out of gamut". */
function oklchToRgbRaw({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    fromLinear(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    fromLinear(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    fromLinear(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ];
}

const inGamut = (rgb: Rgb) => rgb.every((v) => v >= -0.5 && v <= 255.5);
const clampRgb = (rgb: Rgb): Rgb => rgb.map((v) => Math.min(255, Math.max(0, Math.round(v)))) as Rgb;

/** Converts OKLCH to sRGB, reducing chroma until the color fits the gamut. */
function oklchToRgb(color: Oklch): Rgb {
  let c = color.c;
  let rgb = oklchToRgbRaw({ ...color, c });
  for (let i = 0; i < 24 && !inGamut(rgb); i++) {
    c *= 0.92;
    rgb = oklchToRgbRaw({ ...color, c });
  }
  return clampRgb(rgb);
}

/**
 * Builds a full scale from one color. The source color itself is placed at
 * step 600 — the step used for primary buttons — so the button the user sees
 * is exactly the color they picked.
 */
export function buildScale(hex: string): ColorScale {
  const source = hexToRgb(hex);
  const base = rgbToOklch(source);
  // Near-grey inputs have an unstable hue; keep them neutral across the scale.
  const chroma = base.c < 0.02 ? base.c : Math.max(base.c, 0.06);

  const scale = {} as ColorScale;
  for (const step of SCALE_STEPS) {
    const rgb = step === 600
      ? source
      : oklchToRgb({ l: LIGHTNESS[step], c: chroma * CHROMA[step], h: base.h });
    scale[step] = rgb.join(' ');
  }
  return scale;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Text color for content placed on the given background (buttons, badges).
 * White is kept down to 3:1 — the WCAG level for bold/large text, which is
 * what buttons use — so mid-tone brand colors keep white labels.
 */
export function readableOn(hex: string): '#ffffff' | '#0f172a' {
  return contrastRatio(hex, '#ffffff') >= 3 ? '#ffffff' : '#0f172a';
}
