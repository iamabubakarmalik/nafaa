/**
 * Site fonts (ARCH 4.2). Inter variable, latin subset, one preloaded file.
 * The root layout puts `fontVariables` on <html>; Tailwind's `font-sans`
 * reads --font-inter. Code uses the system monospace stack (--font-code), and
 * Noto Naskh is loaded only under /ur (added with the Urdu phase).
 */
import { Inter } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export const fontVariables = inter.variable;
