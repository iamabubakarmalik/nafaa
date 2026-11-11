/**
 * The one app-wide upgrade dialog. Opens when the API refuses a change with
 * ADDON_REQUIRED, PLAN_FEATURE_REQUIRED or PLAN_LIMIT (see
 * core/api/billing-notice) or when a locked menu item is clicked. It says what
 * is locked and what it costs, and offers "Abhi jodein" (the add-on sheet)
 * or "Plan barhayein" (/plans).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Lock, PlusCircle, Sparkles } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { closeUpsell, useUpsellRequest, type UpsellRequest } from '@core/api/billing-notice';
import { t } from '@core/i18n';
import { useCanManageBilling, useEntitlements, usePricingCatalog } from '../hooks/usePricing';
import { LIMITS, addOnPriceText, featureLabel, limitText, planPrice, rs } from '../lib/catalog-meta';
import type { PricingCatalog } from '../api/pricing.api';
import { AddOnIcon } from './AddOnParts';
import { AddOnSheet } from './AddOnSheet';

/** Feature keys each add-on unlocks, for prompts that only name a feature. */
function addOnForFeature(catalog: PricingCatalog | undefined, feature: string | null | undefined) {
  if (!catalog || !feature) return null;
  return catalog.addOns.find((a) => !a.comingSoon && a.kind !== 'ONE_TIME' && !a.bundleKeys.length && a.grantsFeatures.includes(feature)) ?? null;
}

/** The cheapest paid plan that includes the feature. */
function planForFeature(catalog: PricingCatalog | undefined, feature: string | null | undefined) {
  if (!catalog || !feature) return null;
  return catalog.plans.filter((p) => !p.isFree && p.features.includes(feature)).sort((a, b) => a.priceMonthly - b.priceMonthly)[0] ?? null;
}

export function UpsellHost() {
  const request = useUpsellRequest();
  const [sheet, setSheet] = useState<{ key: string; quantity?: number } | null>(null);
  return (
    <>
      {request && <UpsellDialog request={request} onAdd={(key, quantity) => { closeUpsell(); setSheet({ key, quantity }); }} />}
      {sheet && <AddOnSheet addOnKey={sheet.key} startQuantity={sheet.quantity} onClose={() => setSheet(null)} />}
    </>
  );
}

function UpsellDialog({ request, onAdd }: { request: UpsellRequest; onAdd: (key: string, quantity?: number) => void }) {
  const navigate = useNavigate();
  const catalog = usePricingCatalog().data;
  const ent = useEntitlements().data;
  const canManage = useCanManageBilling();

  const addOn = request.addOnKey
    ? catalog?.addOns.find((a) => a.key === request.addOnKey) ?? null
    : addOnForFeature(catalog, request.feature);
  const plan = request.kind !== 'limit' ? planForFeature(catalog, request.feature) : null;
  const limit = request.limit ? LIMITS.find((l) => l.key === request.limit) : null;

  const name = request.kind === 'limit'
    ? (limit ? t(limit.label) : t('Had'))
    : addOn && request.kind === 'addon' ? t(addOn.name) : featureLabel(request.feature);

  const title = request.kind === 'limit' ? t('Plan ki had poori ho gayi')
    : request.kind === 'addon' ? t('{{name}} ke liye add-on chahiye', { name })
      : t('{{name}} aap ke plan me nahi', { name });

  const goPlans = () => {
    closeUpsell();
    const q = new URLSearchParams();
    if (request.feature) q.set('feature', request.feature);
    if (addOn) q.set('add', addOn.key);
    navigate(`/plans${q.toString() ? `?${q}` : ''}`);
  };
  const addable = !!addOn && !addOn.comingSoon && ent?.state !== 'expired';

  return (
    <Modal open onClose={closeUpsell} size="sm" title={(
      <span className="flex items-center gap-3">
        {addOn ? <AddOnIcon addOnKey={addOn.key} /> : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Lock className="h-5 w-5" /></span>
        )}
        <span className="min-w-0">{title}</span>
      </span>
    )}
    footer={(
      <div className="flex w-full flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={closeUpsell}>{t('Baad me')}</Button>
        {canManage && <Button variant={addable ? 'outline' : 'primary'} onClick={goPlans} leftIcon={<ArrowUpRight className="h-4 w-4" />}>{t('Plan barhayein')}</Button>}
        {canManage && addable && addOn && (
          <Button onClick={() => onAdd(addOn.key, request.kind === 'limit' && addOn.kind === 'PER_UNIT' ? Math.max(1, (request.current ?? 0) - (request.max ?? 0) + 1) : undefined)}
            leftIcon={<PlusCircle className="h-4 w-4" />}>{t('Abhi jodein')}</Button>
        )}
      </div>
    )}>
      <div className="space-y-3">
        {request.kind === 'limit' && limit && request.max != null && (
          <div className="rounded-2xl bg-amber-50 p-3.5 ring-1 ring-amber-200">
            <p className="text-[0.8125rem] font-medium text-amber-900">{t(limit.label)}</p>
            <p className="mt-0.5 text-[1.25rem] font-bold tabular-nums text-amber-950">{(request.current ?? request.max).toLocaleString('en-PK')} / {limitText(request.max)}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200/70"><div className="h-full w-full rounded-full bg-amber-500" /></div>
          </div>
        )}
        <p className="text-[0.9375rem] leading-relaxed text-slate-700">
          {request.message || (request.kind === 'addon'
            ? t('Ye add-on jorte hi ye kaam khul jayega. Baqi sab kaam waise hi chalta rahega.')
            : t('Ye bare plan me milta hai. Baqi sab kaam waise hi chalta rahega, data mehfooz hai.'))}
        </p>
        <ul className="space-y-2">
          {addOn && (
            <li className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
              <PlusCircle className="h-5 w-5 shrink-0 text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-semibold text-slate-900">{t('Add-on: {{name}}', { name: t(addOn.name) })}</p>
                <p className="text-[0.8125rem] tabular-nums text-slate-600">{ent?.state === 'trial' ? t('Trial me free, phir {{price}}', { price: addOnPriceText(addOn) }) : addOnPriceText(addOn)}</p>
              </div>
            </li>
          )}
          {plan && (
            <li className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
              <Sparkles className="h-5 w-5 shrink-0 text-violet-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-semibold text-slate-900">{t('{{plan}} plan me shamil', { plan: plan.name })}</p>
                <p className="text-[0.8125rem] tabular-nums text-slate-600">{t('{{price}}/mahina', { price: rs(planPrice(plan, 'MONTHLY')) })}</p>
              </div>
            </li>
          )}
        </ul>
        {!canManage && <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">{t('Dukaan ke malik se kahein — woh "Mera plan" se ye jor sakte hain.')}</p>}
      </div>
    </Modal>
  );
}
