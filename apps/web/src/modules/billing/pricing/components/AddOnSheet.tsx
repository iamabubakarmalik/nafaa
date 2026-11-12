/**
 * Details and confirm sheet for one add-on: what it does, its price, what
 * happens when it is turned on (free in the trial, or on now with a bill to
 * pay), and the buttons to turn it on, change the quantity, pay or remove it.
 * Used by the /apps store, the upgrade dialog and "My plan".
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, CreditCard, Info, Lock, Sparkles } from 'lucide-react';
import { Button, Modal, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import {
  errorText, useAddOnActions, useBillingOverview, useCanManageBilling, useEntitlements, usePricingCatalog,
} from '../hooks/usePricing';
import { SERVICE_DETAILS, addOnAllowedOn, addOnPriceText, addOnState, fmtDate, fmtDateTime, isService, rs, servicePrice, timeLeftText, unitText } from '../lib/catalog-meta';
import { AddOnIcon, QuantityStepper, StatePill } from './AddOnParts';

const DAY = 86_400_000;
const round10 = (n: number) => Math.max(0, Math.round(n / 10) * 10);

export function AddOnSheet({ addOnKey, onClose, startQuantity }: { addOnKey: string | null; onClose: () => void; startQuantity?: number }) {
  const navigate = useNavigate();
  const catalog = usePricingCatalog().data;
  const ent = useEntitlements().data;
  const overview = useBillingOverview(!!addOnKey).data;
  const canManage = useCanManageBilling();
  const { turnOn, turnOff } = useAddOnActions();
  const addOn = catalog?.addOns.find((a) => a.key === addOnKey) ?? null;
  const state = useMemo(() => (addOn && catalog ? addOnState(addOn, ent, overview, catalog.addOns) : null), [addOn, catalog, ent, overview]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (state) setQty(Math.max(startQuantity ?? 0, state.active ? state.quantity : 1, 1));
    // Only when another add-on opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOnKey]);

  if (!addOnKey) return null;
  if (!addOn || !state) {
    return <Modal open onClose={onClose} title={t('Add-on')}><p className="text-sm text-slate-500">{t('Load ho raha hai…')}</p></Modal>;
  }

  const perUnit = addOn.kind === 'PER_UNIT';
  const plan = catalog?.plans.find((p) => p.id === ent?.plan?.id) ?? null;
  const now = Date.now();
  const freeUntil = ent?.state === 'trial' ? ent.trialEndsAt : ent?.grandfatheredUntil ?? null;
  const freeWindow = !!freeUntil && new Date(freeUntil).getTime() > now && addOn.kind !== 'ONE_TIME';
  const expired = ent?.state === 'expired';
  const freePlan = !!ent?.plan?.isFree || !ent?.plan;
  const allowed = plan ? addOnAllowedOn(addOn, plan) : !freePlan;
  const qtyChanged = perUnit && state.active && qty !== state.quantity;
  const bundledOrIncluded = state.id === 'bundled' || state.id === 'included';

  type Mode = 'soon' | 'blocked-expired' | 'blocked-free' | 'blocked-plan' | 'free' | 'paid' | 'service' | 'service-done';
  // One-time services can be bought on any plan, the trial included.
  const service = isService(addOn);
  const mode: Mode = state.id === 'soon' ? 'soon'
    : expired ? 'blocked-expired'
      : service ? (state.id === 'service' ? 'service-done' : 'service')
      : freeWindow ? 'free'
        : freePlan ? 'blocked-free'
          : !allowed ? 'blocked-plan'
            : 'paid';

  // Rough bill for the rest of the paid period; the real bill comes from the server.
  const paidQty = state.active && state.id === 'on' ? state.quantity : 0;
  const billQty = perUnit ? Math.max(0, qty - paidQty) : 1;
  const periodEnd = ent?.periodEnd ? new Date(ent.periodEnd).getTime() : now;
  const days = Math.max(1, Math.ceil((periodEnd - now) / DAY));
  const servicePriced = servicePrice(addOn, overview?.interval ?? null, catalog);
  const estimate = service ? servicePriced.amount : round10((addOn.priceMonthly * days) / 30) * billQty;

  const invoice = overview?.openInvoices.find((i) => i.description === `Add-on: ${addOn.name}` || i.items?.some((it) => it.description.startsWith(addOn.name)));

  const doTurnOn = () => turnOn.mutate({ key: addOn.key, quantity: perUnit ? qty : 1 }, {
    onSuccess: (r) => {
      if (r.mode === 'invoice' && r.invoice) {
        toast.success(t('{{name}} chalu ho gaya', { name: t(addOn.name) }), { description: t('{{amount}} ka bill bana — {{date}} tak pay karein', { amount: rs(r.invoice.amountDue ?? r.invoice.total), date: fmtDate(r.invoice.dueDate) }) });
        onClose();
        navigate(`/billing/invoice/${r.invoice.id}/pay`);
        return;
      }
      if (service) {
        toast.success(t('{{name}} mil gaya', { name: t(addOn.name) }), { description: t('Hamari team jald aap se rabta karegi.') });
        onClose();
        return;
      }
      toast.success(r.mode === 'resumed' ? t('{{name}} wapas chalu', { name: t(addOn.name) }) : t('{{name}} chalu ho gaya', { name: t(addOn.name) }), {
        description: r.mode === 'free' && r.freeUntil ? t('{{date}} tak free. Menu me ab nazar aayega.', { date: fmtDateTime(r.freeUntil) }) : undefined,
      });
      onClose();
    },
    onError: (e) => toast.error(errorText(e, t('Chalu nahi hua'))),
  });

  const doTurnOff = async () => {
    const ok = await confirmDialog({
      title: t('{{name}} hatayein?', { name: t(addOn.name) }),
      text: state.id === 'on' && !freeWindow
        ? t('Jitne din ka paisa diya hai, tab tak chalta rahega. Aap ka data mehfooz rehta hai.')
        : t('Ye abhi band ho jayega aur menu se hat jayega. Aap ka data mehfooz rehta hai.'),
      yes: t('Hatayein'),
      danger: true,
    });
    if (!ok) return;
    turnOff.mutate(addOn.key, {
      onSuccess: (r) => {
        const later = r.endsAt && new Date(r.endsAt).getTime() > Date.now() + 60_000;
        toast.success(later ? t('{{name}} {{date}} ko band hoga', { name: t(addOn.name), date: fmtDateTime(r.endsAt) }) : t('{{name}} band ho gaya', { name: t(addOn.name) }));
        onClose();
      },
      onError: (e) => toast.error(errorText(e, t('Band nahi hua'))),
    });
  };

  const goPlans = () => { onClose(); navigate(`/plans?add=${encodeURIComponent(addOn.key)}`); };

  const primary = (() => {
    if (!canManage) return null;
    if (mode === 'soon' || mode === 'service-done') return null;
    if (mode.startsWith('blocked')) return <Button onClick={goPlans} leftIcon={<Sparkles className="h-4 w-4" />}>{mode === 'blocked-expired' ? t('Plan renew karein') : t('Plan chunein')}</Button>;
    if ((state.id === 'due' || state.id === 'lapsed') && invoice) {
      return <Button onClick={() => { onClose(); navigate(`/billing/invoice/${invoice.id}/pay`); }} leftIcon={<CreditCard className="h-4 w-4" />}>{t('{{amount}} pay karein', { amount: rs(invoice.amountDue) })}</Button>;
    }
    if (bundledOrIncluded) return null;
    if (mode === 'service') {
      return <Button onClick={doTurnOn} loading={turnOn.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />}>{estimate > 0 ? t('{{amount}} me lein', { amount: rs(estimate) }) : t('Muft lein')}</Button>;
    }
    if (!state.active || qtyChanged || state.id === 'ending' || state.id === 'lapsed' || state.id === 'paused') {
      return (
        <Button onClick={doTurnOn} loading={turnOn.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
          {qtyChanged ? t('Save karein') : state.id === 'ending' ? t('Chalu rakhein') : t('Chalu karein')}
        </Button>
      );
    }
    return null;
  })();

  const canRemove = canManage && state.active && !bundledOrIncluded && state.id !== 'ending' && addOn.kind !== 'ONE_TIME';

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={(
        <span className="flex items-center gap-3">
          <AddOnIcon addOnKey={addOn.key} />
          <span className="min-w-0">
            <span className="block truncate">{t(addOn.name)}</span>
            <span className="block text-[0.8125rem] font-semibold tabular-nums text-slate-600">{service && servicePriced.note ? `${rs(servicePriced.amount)} · ${servicePriced.note}` : addOnPriceText(addOn)}</span>
          </span>
        </span>
      )}
      footer={(
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {canRemove
            ? <Button variant="ghost" onClick={doTurnOff} loading={turnOff.isPending} className="text-rose-600 hover:bg-rose-50">{t('Hatayein')}</Button>
            : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>{t('Band karein')}</Button>
            {primary}
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        {/* A service's own list below says it more clearly than the catalog text. */}
        {addOn.description && !(service && SERVICE_DETAILS[addOn.key]) && <p className="text-[0.9375rem] leading-relaxed text-slate-700">{t(addOn.description)}</p>}
        {state.id !== 'off' && <StatePill state={state} />}

        {perUnit && mode !== 'soon' && !mode.startsWith('blocked') && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
            <div>
              <p className="text-[0.875rem] font-semibold text-slate-900">{t('Kitne {{unit}}?', { unit: unitText(addOn.unitLabel) })}</p>
              <p className="text-[0.75rem] text-slate-500">{t('{{price}} har ek, har mahina', { price: rs(addOn.priceMonthly) })}</p>
            </div>
            <QuantityStepper value={qty} onChange={setQty} label={t('Tadaad')} min={1} />
          </div>
        )}

        {service && SERVICE_DETAILS[addOn.key] && (
          <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200/80">
            <p className="text-[0.8125rem] font-semibold text-slate-900">{t(SERVICE_DETAILS[addOn.key].how)}</p>
            <ul className="mt-2 space-y-1.5 text-[0.8125rem] text-slate-700">
              {SERVICE_DETAILS[addOn.key].includes.map((x) => <li key={x} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />{t(x)}</li>)}
            </ul>
          </div>
        )}

        <WhatHappens mode={mode} freeUntil={freeUntil} estimate={estimate} days={days} periodEnd={ent?.periodEnd ?? null} planName={plan?.name ?? ent?.plan?.name ?? ''} oneTime={addOn.kind === 'ONE_TIME'} grandfathered={!!ent?.grandfatheredUntil && ent?.state !== 'trial'} />

        {!canManage && mode !== 'soon' && (
          <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />{t('Add-on sirf dukaan ka malik ya billing wala user jor sakta hai.')}
          </p>
        )}
      </div>
    </Modal>
  );
}

function WhatHappens({ mode, freeUntil, estimate, days, periodEnd, planName, oneTime, grandfathered }: {
  mode: string; freeUntil: string | null; estimate: number; days: number; periodEnd: string | null; planName: string; oneTime: boolean; grandfathered: boolean;
}) {
  const box = (tone: 'info' | 'warn' | 'ok', icon: ReactNode, title: string, text: string) => (
    <div className={cn('flex items-start gap-3 rounded-2xl p-3.5 ring-1',
      tone === 'ok' ? 'bg-success-50 ring-success-200' : tone === 'warn' ? 'bg-amber-50 ring-amber-200' : 'bg-sky-50 ring-sky-200')}>
      <span className={cn('mt-0.5 shrink-0', tone === 'ok' ? 'text-success-700' : tone === 'warn' ? 'text-amber-700' : 'text-sky-700')}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.875rem] font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{text}</p>
      </div>
    </div>
  );
  if (mode === 'soon') return box('info', <Info className="h-4 w-4" />, t('Jald aa raha hai'), t('Ye abhi tayyar ho raha hai. Chalu hote hi aap ko bata denge.'));
  if (mode === 'service-done') return box('ok', <CheckCircle2 className="h-4 w-4" />, t('Team rabta karegi'), t('Ye aap ne le liya hai. Hamari team jald phone ya WhatsApp par waqt tay karegi.'));
  if (mode === 'service') {
    return estimate > 0
      ? box('info', <CalendarClock className="h-4 w-4" />, t('Ek dafa ka kaam'), t('{{amount}} ka bill banega. Payment ke baad hamari team aap se rabta karegi.', { amount: rs(estimate) }))
      : box('ok', <Sparkles className="h-4 w-4" />, t('Saal ke plan ke saath muft'), t('Koi bill nahi. Hamari team jald aap se rabta karegi.'));
  }
  if (mode === 'blocked-expired') return box('warn', <Lock className="h-4 w-4" />, t('Pehle plan renew karein'), t('Aap ka plan khatam ho chuka hai. Plan renew karte waqt ye add-on bhi saath le sakte hain.'));
  if (mode === 'blocked-free') return box('warn', <Lock className="h-4 w-4" />, t('Add-ons paid plan par milte hain'), t('Free plan par add-ons nahi milte. Basic, Pro ya Enterprise chunein aur ye add-on saath jor lein.'));
  if (mode === 'blocked-plan') return box('warn', <Lock className="h-4 w-4" />, t('Ye aap ke plan par nahi milta'), t('Ye add-on {{plan}} plan par nahi milta. Bara plan chunein.', { plan: planName }));
  if (mode === 'free') {
    return box('ok', <Sparkles className="h-4 w-4" />, grandfathered ? t('Abhi free') : t('Trial me free'),
      t('Abhi chalu ho jayega aur {{date}} tak free hai ({{left}}). Us ke baad plan ke saath is ka bill aayega — ya kabhi bhi hata dein.', { date: fmtDateTime(freeUntil), left: timeLeftText(freeUntil) }));
  }
  if (oneTime) return box('info', <CalendarClock className="h-4 w-4" />, t('Ek dafa ka kaam'), t('{{amount}} ka bill banega. Payment ke baad hamari team aap se rabta karegi.', { amount: rs(estimate) }));
  return box('info', <CalendarClock className="h-4 w-4" />, t('Abhi chalu, bill baad me'),
    t('Abhi chalu ho jayega. Taqreeban {{amount}} ka bill banega ({{days}} din, {{date}} tak). Thore din me pay karein, warna ye khud band ho jayega.', { amount: rs(estimate), days, date: fmtDateTime(periodEnd) }));
}
