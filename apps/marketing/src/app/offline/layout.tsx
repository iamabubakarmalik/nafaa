import type { ReactNode } from 'react';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Offline — Nafaa',
  description: 'You appear to be offline. Nafaa still works — reconnect to sync.',
  path: '/offline',
});

export default function OfflineLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
