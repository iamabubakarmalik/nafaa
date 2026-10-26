/**
 * Subscription notice on the dashboard: payment under review, expired or
 * past due, trial ending soon, active trial, or renewal within 7 days.
 * Renders nothing when there is nothing to say.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, AlertTriangle, Clock, XCircle, ArrowRight,
  CheckCircle2, Crown, Zap,
} from 'lucide-react';
import { useSubscriptionStatus } from '@core/hooks/useSubscriptionStatus';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';

type Tone = 'info' | 'danger' | 'warning' | 'brand';

const TONES: Record<Tone, { box: string; icon: string; tag: string; title: string; text: string; link: string }> = {
  info: {
    box: 'bg-blue-50 ring-blue-200', icon: 'bg-blue-100 text-blue-700', tag: 'bg-blue-100 text-blue-800',
    title: 'text-blue-950', text: 'text-blue-800', link: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  danger: {
    box: 'bg-rose-50 ring-rose-200', icon: 'bg-rose-100 text-rose-700', tag: 'bg-rose-100 text-rose-800',
    title: 'text-rose-950', text: 'text-rose-800', link: 'bg-rose-500 text-white hover:bg-rose-600',
  },
  warning: {
    box: 'bg-amber-50 ring-amber-200', icon: 'bg-amber-100 text-amber-700', tag: 'bg-amber-100 text-amber-800',
    title: 'text-amber-950', text: 'text-amber-800', link: 'bg-amber-500 text-amber-950 hover:bg-amber-400',
  },
  brand: {
    box: 'bg-brand-50 ring-brand-200', icon: 'bg-brand-100 text-brand-700', tag: 'bg-brand-100 text-brand-800',
    title: 'text-brand-950', text: 'text-brand-800', link: 'bg-brand-600 text-brand-fg hover:bg-brand-700',
  },
};

function Banner({ tone, icon, tag, tagIcon, title, text, to, cta }: {
  tone: Tone;
  icon: ReactNode;
  tag: string;
  tagIcon: ReactNode;
  title: ReactNode;
  text: ReactNode;
  to: string;
  cta: string;
}) {
  const t = TONES[tone];
  return (
    <div className={cn('rounded-2xl p-4 shadow-sm ring-1 ring-inset sm:p-5', t.box)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl [&_svg]:h-5 [&_svg]:w-5', t.icon)}>{icon}</div>
          <div className="min-w-0">
            <div className={cn('mb-1 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider [&_svg]:h-3 [&_svg]:w-3', t.tag)}>
              {tagIcon}{tag}
            </div>
            <h3 className={cn('text-base font-bold sm:text-[1.0625rem]', t.title)}>{title}</h3>
            <p className={cn('mt-0.5 text-[0.8125rem]', t.text)}>{text}</p>
          </div>
        </div>
        <Link to={to} className={cn('inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold shadow-sm transition', t.link)}>
          {cta} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function SubscriptionBanner() {
  const {
    subscription, isTrial, isExpired, isPastDue, isTrialExpiringSoon,
    trialDaysLeft, pendingUpgrade, isLoading,
  } = useSubscriptionStatus();

  if (isLoading || !subscription) return null;

  // Upgrade paid and waiting for admin approval.
  if (pendingUpgrade && pendingUpgrade.invoice) {
    return (
      <Banner tone="info" icon={<Clock />} tagIcon={<Clock />} tag="Payment Verification"
        title="Your payment is being verified"
        text={<>Invoice <strong>{pendingUpgrade.invoice.invoiceNumber}</strong> — {formatPKR(pendingUpgrade.invoice.total)} • Admin approval pending (usually within 24 hours)</>}
        to="/billing" cta="View Status" />
    );
  }

  if (isExpired || isPastDue) {
    return (
      <Banner tone="danger" icon={<XCircle />} tagIcon={<AlertTriangle />} tag="Action Required"
        title={isExpired ? 'Your subscription has expired' : 'Payment is past due'}
        text="Renew now to continue using all features — sales, POS, inventory access pe restrictions lag sakti hain"
        to="/plans" cta="Renew Now" />
    );
  }

  if (isTrial && isTrialExpiringSoon) {
    return (
      <Banner tone="warning" icon={<Zap />} tagIcon={<Clock />} tag="Trial Expiring"
        title={trialDaysLeft === 0 ? 'Last day of your trial!' : `Only ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your trial`}
        text={`Upgrade now to continue using ${subscription.plan?.name || 'Premium'} features — koi data loss nahi hoga`}
        to="/plans" cta="Upgrade Now" />
    );
  }

  if (isTrial) {
    return (
      <Banner tone="brand" icon={<Sparkles />} tagIcon={<Crown />} tag="Free Trial Active"
        title={`${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your trial`}
        text={`Enjoying ${subscription.plan?.name || 'Premium'}? Subscribe anytime to keep all features after trial ends`}
        to="/plans" cta="View Plans" />
    );
  }

  // Active subscription: a quiet note only when renewal is within 7 days.
  if (subscription.status === 'ACTIVE') {
    const daysUntilRenewal = Math.ceil(
      (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilRenewal <= 7 && daysUntilRenewal > 0) {
      return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-50 p-4 ring-1 ring-inset ring-blue-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-700" />
            <div className="text-sm">
              <span className="font-bold text-blue-900">{subscription.plan?.name}</span>
              <span className="text-blue-700"> subscription renews in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <Link to="/billing" className="text-[0.75rem] font-bold text-blue-700 hover:underline">
            Manage →
          </Link>
        </div>
      );
    }
  }

  return null;
}
