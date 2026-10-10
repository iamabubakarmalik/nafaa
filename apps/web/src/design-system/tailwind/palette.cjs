/**
 * Color palettes for Tailwind, with automatic dark mode.
 *
 * Most screens were written for light mode only. Instead of hand-writing a
 * `dark:` class for every color on every page, each color step that needs a
 * different value in dark mode reads a CSS variable, and `html.dark` supplies
 * the dark value. The mapping depends on how the color is used:
 *
 *   background  white / 50–300 become dark surfaces; 700–950 become raised
 *               dark surfaces so "inverse" chips and heroes stay visible;
 *               light hue tints (50–300) become low-opacity glows.
 *   text        dark greys (400–950) become light; deep hue text (600–950)
 *               moves to the light end of the same hue.
 *   border      light greys and light hue tints become dark lines.
 *
 * Solid hue colors (400–900 backgrounds), white text and black never change.
 *
 * `ink-*` is a fixed copy of slate that never switches. Explicit `dark:`
 * classes use it (and `ink-white`) so screens that already had a hand-made
 * dark design keep it exactly.
 *
 * The brand scale is not handled here: it is generated at runtime from the
 * chosen accent color, including its dark-mode tints (see theme/apply.ts).
 */

const tw = require('tailwindcss/colors');
// Shared with theme/apply.ts, which applies the same rules to the brand scale.
const RULES = require('./dark-rules.json');

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
/** Dark-mode card surface; tints are blended over it. */
const SURFACE = RULES.surface;

const NEUTRALS = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const HUES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const channels = (rgb) => rgb.join(' ');
const mix = (rgb, over, amount) => rgb.map((v, i) => Math.round(v * amount + over[i] * (1 - amount)));

/* Dark values for neutral greys, shared by every grey family. */
const DARK_NEUTRAL = {
  bg: {
    white: [17, 25, 43], 50: [12, 18, 32], 100: [27, 37, 56], 200: [38, 50, 70], 300: [51, 65, 85],
    700: [75, 90, 114], 800: [58, 71, 93], 900: [44, 55, 75], 950: [34, 43, 60],
  },
  text: {
    400: [115, 130, 152], 500: [148, 163, 184], 600: [172, 184, 200], 700: [203, 213, 225],
    800: [226, 232, 240], 900: [241, 245, 249], 950: [248, 250, 252],
  },
  border: {
    white: [17, 25, 43], 50: [22, 32, 52], 100: [30, 41, 59], 200: [38, 50, 70], 300: [51, 65, 85], 400: [71, 85, 105],
  },
};

/* Dark rules for hues: tint strength over the surface, or which step to borrow. */
const HUE_BG_TINT = RULES.bgTint;
const HUE_BORDER_TINT = RULES.borderTint;
const HUE_TEXT_STEP = RULES.textStep;

const KINDS = { bg: 'bg', text: 'tx', border: 'bd' };

/**
 * @param {Record<string, Record<string|number, string>>} extraHues custom hue scales (e.g. success, info, accent)
 */
function buildPalettes(extraHues = {}) {
  const palettes = { bg: {}, text: {}, border: {} };
  const darkVars = {};

  const varColor = (kind, family, step, fallback) => {
    const name = `--${KINDS[kind]}-${family}-${step}`;
    return { css: `rgb(var(${name}, ${channels(fallback)}) / <alpha-value>)`, name };
  };

  // Greys
  for (const family of NEUTRALS) {
    for (const kind of Object.keys(KINDS)) {
      const scale = {};
      for (const step of STEPS) {
        const dark = DARK_NEUTRAL[kind][step];
        const light = hexToRgb(tw[family][step]);
        if (!dark) { scale[step] = tw[family][step]; continue; }
        const { css, name } = varColor(kind, family, step, light);
        scale[step] = css;
        darkVars[name] = channels(dark);
      }
      palettes[kind][family] = scale;
    }
  }

  // White: a surface for backgrounds and borders, unchanged for text.
  for (const kind of ['bg', 'border']) {
    const { css, name } = varColor(kind, 'white', 0, [255, 255, 255]);
    palettes[kind].white = css;
    darkVars[name] = channels(DARK_NEUTRAL[kind].white);
  }

  // Hues
  const hueScales = { ...Object.fromEntries(HUES.map((h) => [h, tw[h]])), ...extraHues };
  for (const [family, scale] of Object.entries(hueScales)) {
    const base = hexToRgb(scale[500]);
    const out = { bg: {}, text: {}, border: {} };
    for (const step of STEPS) {
      const value = scale[step];
      if (!value) continue;
      const light = hexToRgb(value);
      for (const kind of Object.keys(KINDS)) {
        let dark = null;
        if (kind === 'bg' && HUE_BG_TINT[step]) dark = mix(base, SURFACE, HUE_BG_TINT[step]);
        if (kind === 'border' && HUE_BORDER_TINT[step]) dark = mix(base, SURFACE, HUE_BORDER_TINT[step]);
        if (kind === 'text' && HUE_TEXT_STEP[step] && scale[HUE_TEXT_STEP[step]]) dark = hexToRgb(scale[HUE_TEXT_STEP[step]]);
        if (!dark) { out[kind][step] = value; continue; }
        const { css, name } = varColor(kind, family, step, light);
        out[kind][step] = css;
        darkVars[name] = channels(dark);
      }
    }
    for (const kind of Object.keys(KINDS)) palettes[kind][family] = out[kind];
  }

  // Fixed palette for explicit dark: classes.
  const ink = { ...tw.slate, white: '#ffffff', black: '#000000' };

  return { palettes, darkVars, ink };
}

/** Brand steps that get a separate dark value, set at runtime by theme/apply.ts. */
const BRAND_DARK_STEPS = {
  bg: Object.keys(HUE_BG_TINT).map(Number),
  border: Object.keys(HUE_BORDER_TINT).map(Number),
  text: Object.keys(HUE_TEXT_STEP).map(Number),
};

/** Brand scale per usage: a dark override variable falls back to the shared brand step. */
function brandPalettes() {
  const out = { bg: {}, text: {}, border: {} };
  for (const kind of Object.keys(KINDS)) {
    for (const step of STEPS) {
      out[kind][step] = BRAND_DARK_STEPS[kind].includes(step)
        ? `rgb(var(--${KINDS[kind]}-brand-${step}, var(--brand-${step})) / <alpha-value>)`
        : `rgb(var(--brand-${step}) / <alpha-value>)`;
    }
  }
  return out;
}

module.exports = { buildPalettes, brandPalettes, BRAND_DARK_STEPS, HUE_BG_TINT, HUE_BORDER_TINT, HUE_TEXT_STEP, SURFACE };
