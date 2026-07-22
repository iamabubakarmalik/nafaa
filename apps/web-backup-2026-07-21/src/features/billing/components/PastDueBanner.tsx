import { Link } from 'react-router-dom';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export function PastDueBanner() {
  const { subscription, isPastDue } = useSubscriptionStatus();
  if (!isPastDue || !subscription) return null;

  return (
    <Link
      to="/billing"
      className="group block mx-4 my-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-lg shadow-amber-500/40 hover:shadow-xl hover:scale-[1.01] transition-all overflow-hidden relative"
    >
      <div className="absolute top-1 right-1">
        <div className="h-2 w-2 rounded-full bg-white animate-ping" />
        <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-white" />
      </div>

      <div className="px-4 py-3 flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30 shadow-lg animate-pulse">
          <AlertTriangle className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-extrabold uppercase tracking-wider text-white/90 px-1.5 py-0.5 rounded-md bg-white/10 backdrop-blur inline-block mb-0.5">
            Payment Past Due
          </div>
          <p className="text-sm font-extrabold text-white truncate">
            Subscription expire hone wali hai — Pay now to keep service
          </p>
        </div>
        <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-lg shrink-0">
          <CreditCard className="h-4 w-4 text-amber-600" />
        </div>
      </div>
    </Link>
  );
}
