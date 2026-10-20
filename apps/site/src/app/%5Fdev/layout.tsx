import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { devPagesEnabled } from './dev-pages';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function DevLayout({ children }: { children: ReactNode }) {
  if (!devPagesEnabled) notFound();
  return children;
}
