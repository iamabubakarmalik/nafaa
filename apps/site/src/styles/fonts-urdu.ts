/**
 * Urdu font (ARCH 4.2): Noto Nastaliq Urdu, imported only by app/ur, so the
 * font file and its @font-face rules load on Urdu pages alone.
 *
 * Arabic subset only: Latin words, digits and symbols inside Urdu text fall
 * through to Inter (next in --font-urdu), which keeps numbers and English
 * terms such as POS readable. Variable weight (400-700) and display swap.
 * No generated fallback face: it would cover Latin too and take those
 * characters away from Inter.
 */
import { Noto_Nastaliq_Urdu } from 'next/font/google';

export const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
  variable: '--font-nastaliq',
});

/** The family stack Urdu pages use for --font-urdu (globals.css `[lang='ur']`). */
export const URDU_FONT_STACK = `${nastaliq.style.fontFamily}, var(--font-inter), 'Noto Naskh Arabic', system-ui, sans-serif`;
