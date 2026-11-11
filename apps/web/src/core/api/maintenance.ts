/**
 * Maintenance notice from the API. When the admin turns maintenance mode on,
 * shop requests answer 503 with error "Maintenance"; the client stores the
 * notice here and the banner shows it. The next successful request clears it.
 */

import { useSyncExternalStore } from 'react';

export interface MaintenanceNotice {
  message: string;
  until: string | null;
}

let notice: MaintenanceNotice | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setMaintenanceNotice(next: MaintenanceNotice | null) {
  if (notice === next || (!notice && !next)) return;
  notice = next;
  emit();
}

/** Reads a 503 maintenance answer; returns true when it was one. */
export function noteMaintenanceResponse(status: number | undefined, body: unknown): boolean {
  const b = body as { error?: string; message?: unknown; until?: unknown } | undefined;
  if (status !== 503 || b?.error !== 'Maintenance') return false;
  setMaintenanceNotice({ message: typeof b.message === 'string' ? b.message : '', until: typeof b.until === 'string' ? b.until : null });
  return true;
}

export function useMaintenanceNotice(): MaintenanceNotice | null {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => notice,
    () => null,
  );
}
