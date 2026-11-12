/**
 * Thin banner at the top of every page when the plan needs attention:
 * - trial ending within 3 days, or a paid plan ending within 3 days:
 *   amber, red in the last 24 hours;
 * - grace days after the paid period ended (when grace is set): red.
 * The amber one can be hidden for the day; the red one stays.
 * Times are exact (Pakistan time) with the time left.
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock, X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { useBillingOverview, useCanManageBilling, useEntitlements } from '../hooks/usePricing';
import { fmtDateTime, fmtTime, msLeft, pkDayOffset, timeLeftText } from '../lib/catalog-meta';

const HIDE_KEY = 'nafaa-trial-banner-hidden';
const SOON_MS = 3 * 86_400_000;
const URGENT_MS = 86_400_000;
const today = () => new Date().toISOString().slice(0, 10);
const hiddenToday = () => { try { return localStorage.getItem(HIDE_KEY) === today(); } catch { return false; } };

export function BillingBanner() {
  const { pathname } = useLocation();
  const ent = useEntitlements().data;
  const canManage = useCanManageBilling();
  const [hidden, setHidden] = useState(hiddenToday);

  const grace = ent?.state === 'grace';
  const endsAt = ent?.state === 'trial' ? ent.trialEndsAt : ent?.state === 'active' ? ent.periodEnd : null;
  const left = msLeft(endsAt);
  const soon = left != null && left > 0 && left <= SOON_MS;
  const urgent = grace || (soon && left! <= URGENT_MS);
  const renewal = ent?.state === 'active' && soon;
  const overview = useBillingOverview((grace || renewal) && canManage).data;

  if (!ent || ent.paused || (!grace && !soon)) return null;
  if (!urgent && hidden) return null;
  if (pathname.startsWith('/billing/invoice/') || pathname.startsWith('/plans')) return null;

  const invoice = overview?.openInvoices.find((i) => !!i.subscriptionId) ?? overview?.openInvoices[0];
  const isToday = pkDayOffset(endsAt) === 0;
  const text = grace
    ? (ent.graceDaysLeft ?? 0) <= 1 ? t('Payment baqi hai — kal se app band ho jayegi') : t('Payment baqi hai — {{count}} din me app band ho jayegi', { count: ent.graceDaysLeft ?? 0 })
    : renewal
      ? isToday ? t('Aap ka plan aaj {{time}} par khatam hoga — renew karein', { time: fmtTime(endsAt) }) : t('Aap ka plan {{date}} par khatam hoga — renew karein', { date: fmtDateTime(endsAt) })
      : isToday ? t('Trial aaj {{time}} par khatam ho jayega', { time: fmtTime(endsAt) }) : t('Trial {{date}} par khatam ho jayega', { date: fmtDateTime(endsAt) });
  const hint = canManage
    ? grace || renewal ? t('Aap ka data mehfooz hai. Abhi pay karein taake kaam na ruke.') : t('Plan chun lein taake kaam na ruke. Data wahi rahega.')
    : t('Dukaan ke malik ko bata dein.');
  const to = grace || renewal ? (invoice ? `/billing/invoice/${invoice.id}/pay` : '/billing') : '/plans';
  const action = grace || (renewal && invoice) ? t('Payment karein') : renewal ? t('Renew karein') : t('Plan chunein');

  return (
    <div role="status" className={cn('flex items-center gap-3 border-b px-3 py-2 sm:px-5 print:hidden',
      urgent ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-950')}>
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', urgent ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
        {urgent ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      </span>
      <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug">
        <span className="font-semibold">{text}</span>
        {!grace && <span className="whitespace-nowrap"> · {timeLeftText(endsAt)}</span>}
        <span className="hidden sm:inline"> · {hint}</span>
      </p>
      {canManage && (
        <Link to={to} className={cn('inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 text-[0.8125rem] font-semibold shadow-sm transition',
          urgent ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-amber-500 text-amber-950 hover:bg-amber-400')}>
          {action}<ArrowRight className="h-3.5 w-3.5 rtl-flip" />
        </Link>
      )}
      {!urgent && (
        <button type="button" aria-label={t('Aaj ke liye chhupayein')} title={t('Aaj ke liye chhupayein')}
          onClick={() => { try { localStorage.setItem(HIDE_KEY, today()); } catch { /* storage blocked */ } setHidden(true); }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-amber-800 hover:bg-amber-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
