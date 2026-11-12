'use client';

/** Sends page_view on first load and on every client-side navigation (Nafaa analytics + pixels). */
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { track } from '@/lib/client/track';

export function RouteEvents() {
  const path = usePathname();
  const search = useSearchParams();
  const first = useRef(true);
  useEffect(() => {
    track('page_view');
    if (!first.current) {
      try {
        window.fbq?.('track', 'PageView');
        window.ttq?.page();
      } catch {
        /* ignore */
      }
    }
    first.current = false;
  }, [path, search]);
  return null;
}
