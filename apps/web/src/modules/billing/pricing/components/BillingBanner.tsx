/**
 * Thin banner at the top of every page when the plan needs attention:
 * amber in the last 3 days of the trial, red during the grace days after the
 * paid period ended. The amber one can be hidden for the day.
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock, X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { useBillingOverview, useCanManageBilling, useEntitlements } from '../hooks/usePricing';
import { daysLeft } from '../lib/catalog-meta';

const HIDE_KEY = 'nafaa-trial-banner-hidden';
const today = () => new Date().toISOString().slice(0, 10);
const hiddenToday = () => { try { return localStorage.getItem(HIDE_KEY) === today(); } catch { return false; } };

export function BillingBanner() {
  const { pathname } = useLocation();
  const ent = useEntitlements().data;
  const canManage = useCanManageBilling();
  const [hidden, setHidden] = useState(hiddenToday);
  const grace = ent?.state === 'grace';
  const trialDays = ent?.state === 'trial' ? daysLeft(ent.trialEndsAt) : null;
  const trialSoon = trialDays != null && trialDays <= 3;
  const overview = useBillingOverview(grace && canManage).data;
  if (!ent || (!grace && !trialSoon)) return null;
  if (trialSoon && hidden) return null;
  if (pathname.startsWith('/billing/invoice/') || pathname.startsWith('/plans')) return null;

  const invoice = overview?.openInvoices.find((i) => !!i.subscriptionId) ?? overview?.openInvoices[0];
  const days = grace ? ent.graceDaysLeft ?? 0 : trialDays ?? 0;
  const text = grace
    ? days <= 1 ? t('Payment baqi hai — kal se app band ho jayegi') : t('Payment baqi hai — {{count}} din me app band ho jayegi', { count: days })
    : days <= 0 ? t('Trial aaj khatam ho raha hai') : days === 1 ? t('Trial kal khatam ho jayega') : t('Trial {{count}} din me khatam ho jayega', { count: days });
  const hint = canManage
    ? grace ? t('Aap ka data mehfooz hai. Abhi pay karein taake kaam na ruke.') : t('Plan chun lein taake kaam na ruke. Data wahi rahega.')
    : t('Dukaan ke malik ko bata dein.');
  const to = grace ? (invoice ? `/billing/invoice/${invoice.id}/pay` : '/billing') : '/plans';

  return (
    <div role="status" className={cn('flex items-center gap-3 border-b px-3 py-2 sm:px-5 print:hidden',
      grace ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-950')}>
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', grace ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
        {grace ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      </span>
      <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug">
        <span className="font-semibold">{text}</span>
        <span className="hidden sm:inline"> · {hint}</span>
      </p>
      {canManage && (
        <Link to={to} className={cn('inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 text-[0.8125rem] font-semibold shadow-sm transition',
          grace ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-amber-500 text-amber-950 hover:bg-amber-400')}>
          {grace ? t('Payment karein') : t('Plan chunein')}<ArrowRight className="h-3.5 w-3.5 rtl-flip" />
        </Link>
      )}
      {!grace && (
        <button type="button" aria-label={t('Aaj ke liye chhupayein')} title={t('Aaj ke liye chhupayein')}
          onClick={() => { try { localStorage.setItem(HIDE_KEY, today()); } catch { /* storage blocked */ } setHidden(true); }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-amber-800 hover:bg-amber-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
