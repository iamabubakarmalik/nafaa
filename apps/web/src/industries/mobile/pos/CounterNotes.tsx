/**
 * Notes on the bill panel: while offline, what can and cannot be sold; and
 * used phones still waiting for their check, which do not show at the
 * counter until they are put in stock.
 */

import { Link } from 'react-router-dom';
import { ClipboardCheck, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@core/lib/offline/useOnlineStatus';
import { useLiveCatalog } from './liveCatalog';

export function CounterNotes() {
  const online = useOnlineStatus();
  const waiting = useLiveCatalog().data?.usedPhonesPendingInspection ?? 0;
  if (online && !waiting) return null;
  return (
    <div className="space-y-1.5">
      {!online && (
        <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
          <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Internet nahi: accessories ka bill ban jayega aur net aate hi chala jayega. Naya phone (IMEI), used phone aur repair wapsi ke liye internet chahiye — bill me phone ho to net aane tak ruk jayein.
        </p>
      )}
      {waiting > 0 && (
        <Link to="/used-phones?status=PENDING_INSPECTION" className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
          <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />{waiting} used phone check ke intezar me — check ke baad yahan bikenge
        </Link>
      )}
    </div>
  );
}
