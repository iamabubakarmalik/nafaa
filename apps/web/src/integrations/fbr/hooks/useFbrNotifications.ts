import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fbrApi } from '../api/fbr.api';

const SEEN_REJECTED_KEY = 'nafaa-fbr-seen-rejected-v1';

const loadSeen = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SEEN_REJECTED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
};

const saveSeen = (seen: Set<string>) => {
  try {
    const arr = Array.from(seen).slice(-500);
    localStorage.setItem(SEEN_REJECTED_KEY, JSON.stringify(arr));
  } catch {}
};

/**
 * Polls every 60 seconds. When new REJECTED invoices appear, shows toast.
 * Silently no-ops if FBR is disabled.
 */
export function useFbrNotifications() {
  const seenRef = useRef<Set<string>>(loadSeen());
  const firstRunRef = useRef(true);

  useQuery({
    queryKey: ['fbr-rejected-poll'],
    queryFn: () => fbrApi.listInvoices({ status: 'REJECTED', limit: 20 }),
    refetchInterval: 60_000,
    onSuccess: (data: any) => {
      const items = data?.items ?? [];

      if (firstRunRef.current) {
        firstRunRef.current = false;
        items.forEach((i: any) => seenRef.current.add(i.id));
        saveSeen(seenRef.current);
        return;
      }

      items.forEach((inv: any) => {
        if (seenRef.current.has(inv.id)) return;
        seenRef.current.add(inv.id);
        saveSeen(seenRef.current);

        toast.error(`🇵🇰 FBR reject: ${inv.invoiceNumber}`, {
          description: inv.errorMessage ?? 'Unknown error — check FBR Invoices',
          duration: 10_000,
          action: {
            label: 'View',
            onClick: () => { window.location.href = '/fbr/invoices'; },
          },
        });
      });
    },
  } as any);
}
