/**
 * Full-screen notice once the plan has ended (trial over, or the paid period
 * and its grace days are over). It covers every page except plan and payment
 * pages, so the owner can pay, renew or move to the Free plan. Data is never
 * removed, and sales made offline stay queued until the plan is live again.
 *
 * Shown when the API answers 402 TRIAL_EXPIRED / SUBSCRIPTION_EXPIRED /
 * NO_SUBSCRIPTION, or when freshly loaded entitlements say "expired".
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Clock, CreditCard, Gift, LogOut, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/design-system/components';
import { usePlanEndedNotice } from '@core/api/billing-notice';
import { t } from '@core/i18n';
import { errorText, useAddOnActions, useBillingOverview, useCanManageBilling, useEntitlements, usePricingCatalog } from '../hooks/usePricing';
import { fmtDate, rs } from '../lib/catalog-meta';

/** Pages that stay open while the plan has ended. */
const OPEN_PATHS = ['/billing', '/plans', '/apps', '/plan-usage', '/help', '/profile'];
export const SUPPORT_WHATSAPP = '923241772933';
export const SUPPORT_PHONE_TEXT = '0324-1772933';

export function usePlanEnded() {
  const notice = usePlanEndedNotice();
  const ent = useEntitlements();
  const expired = ent.isFetchedAfterMount && ent.data?.state === 'expired';
  return { ended: !!notice || expired, code: notice?.code ?? null };
}

export function PlanGate({ onLogout }: { onLogout: () => void }) {
  const { pathname } = useLocation();
  const { ended, code } = usePlanEnded();
  if (!ended || OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return <GateScreen code={code} onLogout={onLogout} />;
}

function GateScreen({ code, onLogout }: { code: string | null; onLogout: () => void }) {
  const navigate = useNavigate();
  const canManage = useCanManageBilling();
  const ent = useEntitlements().data;
  const overview = useBillingOverview(canManage).data;
  const catalog = usePricingCatalog().data;
  const { goFree } = useAddOnActions();
  const [freeError, setFreeError] = useState<string | null>(null);

  // A trial's period ends on its trial end date.
  const trial = code === 'TRIAL_EXPIRED' || (!code && ent?.state === 'expired' && !!ent.trialEndsAt && ent.periodEnd === ent.trialEndsAt);
  const planInvoice = overview?.openInvoices.find((i) => !!i.subscriptionId) ?? overview?.openInvoices[0] ?? null;
  const inReview = overview?.openInvoices.some((i) => i.inReview);
  const freePlan = catalog?.plans.find((p) => p.isFree);

  const pay = () => navigate(planInvoice ? `/billing/invoice/${planInvoice.id}/pay` : '/plans');
  const toFree = () => {
    setFreeError(null);
    goFree.mutate(undefined, {
      onSuccess: () => { toast.success(t('Ab aap Free plan par hain')); navigate('/dashboard'); },
      onError: (e) => setFreeError(errorText(e, t('Free plan par nahi ja sake'))),
    });
  };

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="plan-gate-title" className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/60 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
          <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 to-amber-500 px-6 pb-6 pt-7 text-white">
            <span className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Clock className="h-6 w-6" /></span>
            <h1 id="plan-gate-title" className="mt-4 text-[1.375rem] font-bold leading-tight">{trial ? t('Aap ka free trial khatam ho gaya') : t('Aap ka plan khatam ho gaya')}</h1>
            <p className="mt-1.5 text-[0.9375rem] text-white/90">{t('Kaam jaari rakhne ke liye plan chunein ya payment karein.')}</p>
          </div>

          <div className="space-y-4 p-6">
            <p className="flex items-start gap-2.5 rounded-2xl bg-success-50 p-3 text-[0.875rem] text-success-900 ring-1 ring-success-200">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-700" />
              {t('Aap ka sara data mehfooz hai. Internet ke bagair ki gayi sales bhi mehfooz hain — plan chalu hote hi khud sync ho jayengi.')}
            </p>

            {inReview && (
              <p className="flex items-start gap-2.5 rounded-2xl bg-sky-50 p-3 text-[0.875rem] text-sky-900 ring-1 ring-sky-200">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                {t('Aap ki payment check ho rahi hai. Approve hote hi app khud khul jayegi (aam tor par 24 ghante me).')}
              </p>
            )}

            {canManage ? (
              <div className="space-y-2.5">
                <Button fullWidth size="lg" onClick={pay} leftIcon={planInvoice ? <CreditCard className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}>
                  {planInvoice ? t('{{amount}} pay karein', { amount: rs(planInvoice.amountDue) }) : t('Plan chunein aur renew karein')}
                </Button>
                {planInvoice && <Button fullWidth variant="secondary" onClick={() => navigate('/plans')}>{t('Doosra plan chunein')}</Button>}
                {freePlan && (
                  <Button fullWidth variant="outline" onClick={toFree} loading={goFree.isPending} leftIcon={<Gift className="h-4 w-4" />}>
                    {t('Free plan par jayein')}
                  </Button>
                )}
                {freePlan && !freeError && (
                  <p className="text-center text-[0.75rem] text-slate-500">
                    {t('Free plan: {{shops}} dukaan, {{users}} user, {{products}} products, {{sales}} bill har mahina', {
                      shops: freePlan.limits.shops, users: freePlan.limits.users, products: freePlan.limits.products, sales: freePlan.limits.salesPerMonth,
                    })}
                  </p>
                )}
                {freeError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">{freeError}</p>}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 p-3 text-[0.875rem] text-slate-700 ring-1 ring-slate-200">{t('Dukaan ke malik se kahein ke plan renew karein. Phir app khud khul jayegi.')}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[0.875rem] font-semibold text-success-700 hover:bg-success-50">
                <MessageCircle className="h-4 w-4" />{t('WhatsApp support')} <span className="dir-ltr tabular-nums">{SUPPORT_PHONE_TEXT}</span>
              </a>
              <button type="button" onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[0.875rem] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <LogOut className="h-4 w-4" />{t('Logout')}
              </button>
            </div>
            {ent?.periodEnd && <p className="text-center text-[0.75rem] text-slate-400">{t('Plan {{date}} ko khatam hua', { date: fmtDate(ent.periodEnd) })}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
