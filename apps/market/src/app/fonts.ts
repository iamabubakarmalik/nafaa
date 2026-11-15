/**
 * Fonts through next/font (self-hosted, no layout shift). Inter for Latin
 * text; on Urdu pages Noto Naskh Arabic for running text and Noto Nastaliq
 * Urdu for h1/h2 (same pairing as apps/site). Nothing is preloaded except
 * Inter; browsers fetch the Urdu faces only when a page uses them.
 */
import { Inter, Noto_Naskh_Arabic, Noto_Nastaliq_Urdu } from 'next/font/google';

export const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const naskh = Noto_Naskh_Arabic({ subsets: ['arabic'], display: 'swap', preload: false, adjustFontFallback: false, variable: '--font-naskh' });

export const nastaliq = Noto_Nastaliq_Urdu({ subsets: ['arabic'], display: 'swap', preload: false, adjustFontFallback: false, variable: '--font-nastaliq' });
