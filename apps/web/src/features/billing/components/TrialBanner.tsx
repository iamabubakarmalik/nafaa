import { Link } from 'react-router-dom';
import { Clock, Sparkles, ArrowRight } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export function TrialBanner() {
  const { isTrial, trialDaysLeft, subscription } = useSubscriptionStatus();
  if (!isTrial || trialDaysLeft === null) return null;

  const isUrgent = trialDaysLeft <= 1;
  const isWarning = trialDaysLeft <= 3 && !isUrgent;
  const bg = isUrgent ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-600';

  return (
    <Link to="/plan" className={`block mx-4 my-2 rounded-2xl ${bg} shadow-lg hover:opacity-95 transition`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
          {isUrgent ? <Clock className="h-5 w-5 text-white" /> : <Sparkles className="h-5 w-5 text-white" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">Free Trial</span>
            <span className="h-1 w-1 rounded-full bg-white/60" />
            <span className="text-xs font-bold text-white">
              {trialDaysLeft > 0 ? `${trialDaysLeft} din baqi` : 'Aaj khatam'}
            </span>
          </div>
          <p className="text-sm font-bold text-white mt-0.5">
            {isUrgent ? '⚠️ Service rok jayegi — Abhi upgrade karein!' :
             isWarning ? `Trial ${trialDaysLeft} din mein khatam — Upgrade karein` :
             `${subscription?.plan?.name || 'Trial'} — full access`}
          </p>
        </div>
        <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center">
          <ArrowRight className={`h-4 w-4 ${isUrgent ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`} />
        </div>
      </div>
    </Link>
  );
}
