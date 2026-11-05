/**
 * Urdu font (ARCH 4.2): Noto Nastaliq Urdu, imported only by app/ur, so the
 * font file and its @font-face rules load on Urdu pages alone.
 *
 * next/font writes a face for every subset; `subsets` only picks the files
 * that are preloaded. The Latin face covers the space and basic punctuation,
 * so every Urdu line needs it as well as the Arabic one: both are preloaded,
 * which lets the page lay out its text once instead of again when the second
 * file arrives. Variable weight (400-700) and display swap, with no
 * generated fallback face (adjustFontFallback: false).
 */
import { Noto_Nastaliq_Urdu } from 'next/font/google';

export const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
  variable: '--font-nastaliq',
});

/** The family stack Urdu pages use for --font-urdu (globals.css `[lang='ur']`). */
export const URDU_FONT_STACK = `${nastaliq.style.fontFamily}, var(--font-inter), 'Noto Naskh Arabic', system-ui, sans-serif`;
