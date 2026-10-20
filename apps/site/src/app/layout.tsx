/**
 * Root layout: SCAFFOLD PLACEHOLDER written by F2 so the app builds.
 * S1 owns this file (ARCH section 15) and replaces it with the real shell
 * (header, footer, metadata base, analytics, consent). Keep these three
 * pieces when replacing it: the global CSS import, `fontVariables` on <html>,
 * and <MotionObserver /> mounted once.
 */
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { MotionObserver } from '@/components/motion/MotionObserver';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'Nafaa', template: '%s | Nafaa' },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <main id="main">{children}</main>
        <MotionObserver />
      </body>
    </html>
  );
}
