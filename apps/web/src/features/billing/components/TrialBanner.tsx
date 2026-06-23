import { Link } from 'react-router-dom';
import { Clock, Sparkles, ArrowRight, Zap, AlertTriangle } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export function TrialBanner() {
  const { isTrial, trialDaysLeft, subscription } = useSubscriptionStatus();
  if (!isTrial || trialDaysLeft === null) return null;

  const isUrgent = trialDaysLeft <= 1;
  const isWarning = trialDaysLeft <= 3 && !isUrgent;
  const isHealthy = trialDaysLeft > 3;

  const gradient = isUrgent
    ? 'from-rose-600 via-red-600 to-rose-700'
    : isWarning
    ? 'from-amber-500 via-orange-500 to-amber-600'
    : 'from-emerald-600 via-green-600 to-emerald-700';

  const shadow = isUrgent
    ? 'shadow-rose-500/40'
    : isWarning
    ? 'shadow-amber-500/40'
    : 'shadow-emerald-500/30';

  const Icon = isUrgent ? AlertTriangle : isWarning ? Clock : Sparkles;

  const headline = isUrgent
    ? '⚠️ Service Rok Jayegi — Abhi Upgrade Karein!'
    : isWarning
    ? `Trial ${trialDaysLeft} din mein khatam — Upgrade karein`
    : `${subscription?.plan?.name || 'Trial'} — Full access`;

  return (
    <Link
      to="/plan"
      className={`group block mx-4 my-2 rounded-2xl bg-gradient-to-r ${gradient} shadow-lg ${shadow} hover:shadow-xl hover:scale-[1.01] transition-all overflow-hidden relative`}
    >
      {/* Animated shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

      {isUrgent && (
        <div className="absolute top-1 right-1">
          <div className="h-2 w-2 rounded-full bg-white animate-ping" />
          <div className="absolute top-0 right-0 h-2 w-2 rounded-full bg-white" />
        </div>
      )}

      <div className="relative px-4 py-3 flex items-center gap-3">
        <div className={`h-11 w-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30 shadow-lg ${isUrgent ? 'animate-pulse' : ''}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-white/90 px-1.5 py-0.5 rounded-md bg-white/10 backdrop-blur">
              Free Trial
            </span>
            <span className="text-[10px] font-extrabold text-white inline-flex items-center gap-0.5">
              <Zap className="h-2.5 w-2.5" />
              {trialDaysLeft > 0 ? `${trialDaysLeft} din baqi` : 'Aaj khatam'}
            </span>
          </div>
          <p className="text-sm font-extrabold text-white truncate">{headline}</p>
        </div>

        <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform shrink-0">
          <ArrowRight className={`h-4 w-4 ${
            isUrgent ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'
          }`} />
        </div>
      </div>

      {/* Countdown progress bar */}
      {isHealthy && (
        <div className="h-1 bg-white/15">
          <div
            className="h-full bg-white/50 transition-all"
            style={{ width: `${Math.min((trialDaysLeft / 7) * 100, 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}
