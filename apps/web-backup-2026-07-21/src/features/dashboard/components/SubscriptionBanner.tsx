import { Link } from 'react-router-dom';
import {
  Sparkles, AlertTriangle, Clock, CreditCard, XCircle, ArrowRight,
  CheckCircle2, Crown, Zap,
} from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { formatPKR } from '@/lib/format';

export function SubscriptionBanner() {
  const {
    subscription, isTrial, isExpired, isPastDue, isTrialExpiringSoon,
    trialDaysLeft, pendingUpgrade, isLoading,
  } = useSubscriptionStatus();

  if (isLoading || !subscription) return null;

  // ─── PENDING UPGRADE (waiting for payment approval) ───
  if (pendingUpgrade && pendingUpgrade.invoice) {
    return (
      <div className="rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                <Clock className="h-2.5 w-2.5" />
                Payment Verification
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-blue-900">
                Your payment is being verified
              </h3>
              <p className="text-xs sm:text-sm text-blue-800 mt-0.5">
                Invoice <strong>{pendingUpgrade.invoice.invoiceNumber}</strong> — {formatPKR(pendingUpgrade.invoice.total)} • Admin approval pending (usually within 24 hours)
              </p>
            </div>
          </div>
          <Link
            to="/billing"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md transition"
          >
            View Status <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── EXPIRED / PAST DUE ───
  if (isExpired || isPastDue) {
    return (
      <div className="rounded-3xl bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 text-white p-5 shadow-2xl shadow-rose-500/30">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20 backdrop-blur text-[10px] font-extrabold uppercase tracking-wider mb-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Action Required
              </div>
              <h3 className="text-base sm:text-lg font-extrabold">
                {isExpired ? 'Your subscription has expired' : 'Payment is past due'}
              </h3>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                Renew now to continue using all features — sales, POS, inventory access pe restrictions lag sakti hain
              </p>
            </div>
          </div>
          <Link
            to="/plans"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-sm font-extrabold shadow-md transition"
          >
            Renew Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── TRIAL EXPIRING SOON ───
  if (isTrial && isTrialExpiringSoon) {
    return (
      <div className="rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 shadow-2xl shadow-amber-500/30">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20 backdrop-blur text-[10px] font-extrabold uppercase tracking-wider mb-1">
                <Clock className="h-2.5 w-2.5" />
                Trial Expiring
              </div>
              <h3 className="text-base sm:text-lg font-extrabold">
                {trialDaysLeft === 0
                  ? 'Last day of your trial!'
                  : `Only ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your trial`}
              </h3>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                Upgrade now to continue using {subscription.plan?.name || 'Premium'} features — koi data loss nahi hoga
              </p>
            </div>
          </div>
          <Link
            to="/plans"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-amber-700 hover:bg-amber-50 text-sm font-extrabold shadow-md transition"
          >
            Upgrade Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── ACTIVE TRIAL ───
  if (isTrial) {
    return (
      <div className="rounded-3xl bg-gradient-to-r from-violet-500 to-purple-600 text-white p-5 shadow-2xl shadow-violet-500/30">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/20 backdrop-blur text-[10px] font-extrabold uppercase tracking-wider mb-1">
                <Crown className="h-2.5 w-2.5" />
                Free Trial Active
              </div>
              <h3 className="text-base sm:text-lg font-extrabold">
                {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in your trial
              </h3>
              <p className="text-xs sm:text-sm text-white/90 mt-0.5">
                Enjoying {subscription.plan?.name || 'Premium'}? Subscribe anytime to keep all features after trial ends
              </p>
            </div>
          </div>
          <Link
            to="/plans"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-violet-700 hover:bg-violet-50 text-sm font-extrabold shadow-md transition"
          >
            View Plans <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── ACTIVE SUBSCRIPTION (subtle indicator) ───
  if (subscription.status === 'ACTIVE') {
    const daysUntilRenewal = Math.ceil(
      (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Only show if renewal is within 7 days
    if (daysUntilRenewal <= 7 && daysUntilRenewal > 0) {
      return (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <div className="text-sm">
              <span className="font-bold text-blue-900">{subscription.plan?.name}</span>
              <span className="text-blue-700"> subscription renews in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <Link to="/billing" className="text-xs font-bold text-blue-700 hover:underline">
            Manage →
          </Link>
        </div>
      );
    }
  }

  return null;
}
