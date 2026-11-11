/**
 * "Setup & training": the one-time service packages side by side (what each
 * includes, price, the yearly-plan offer). Used on /apps. Services are never
 * removed; once bought they read "Team rabta karegi".
 */

import { CheckCircle2, Gift, Star } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import type { CatalogAddOn, PricingCatalog } from '../api/pricing.api';
import { FULL_ACTIVATION_KEY, SERVICE_DETAILS, rs, type AddOnState } from '../lib/catalog-meta';
import { AddOnIcon, StatePill } from './AddOnParts';

export function ServiceCards({ rows, catalog, onOpen }: {
  rows: Array<{ addOn: CatalogAddOn; state: AddOnState }>;
  catalog: PricingCatalog | undefined;
  onOpen: (key: string) => void;
}) {
  const offer = !!catalog?.offers?.yearlyFreeSetup;
  const setup = catalog?.addOns.find((a) => a.key === (catalog.offers?.setupKey ?? 'setup'));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(({ addOn, state }) => {
        const details = SERVICE_DETAILS[addOn.key];
        const full = addOn.key === (catalog?.offers?.fullActivationKey ?? FULL_ACTIVATION_KEY);
        const badge = offer && setup
          ? full ? t('Saal ke plan par {{amount}} kam', { amount: rs(setup.priceMonthly) }) : addOn.key === setup.key ? t('Saal ke plan ke saath muft') : null
          : null;
        return (
          <article key={addOn.key} className={cn('relative flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1', full ? 'ring-2 ring-teal-500/60' : 'ring-slate-200/80')}>
            {full && (
              <span className="absolute -top-2.5 end-5 inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-0.5 text-[0.6875rem] font-bold text-white shadow-sm">
                <Star className="h-3 w-3 fill-current" />{t('Sab kuch hum karte hain')}
              </span>
            )}
            <div className="flex items-start gap-3">
              <AddOnIcon addOnKey={addOn.key} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="text-[1.0625rem] font-bold text-slate-900">{t(addOn.name)}</h3>
                <p className="text-[0.8125rem] text-slate-500">{details ? t(details.how) : addOn.description ? t(addOn.description) : ''}</p>
              </div>
            </div>
            <p className="mt-4 text-[1.75rem] font-bold tabular-nums tracking-tight text-slate-900">
              {rs(addOn.priceMonthly)} <span className="text-[0.875rem] font-medium text-slate-500">{t('ek dafa')}</span>
            </p>
            {badge && (
              <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-[0.75rem] font-semibold text-success-700 ring-1 ring-success-200">
                <Gift className="h-3.5 w-3.5" />{badge}
              </span>
            )}
            <ul className="mt-4 flex-1 space-y-2 text-[0.875rem] text-slate-700">
              {(details?.includes ?? []).map((x) => <li key={x} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />{t(x)}</li>)}
            </ul>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">{state.id !== 'off' && <StatePill state={state} />}</div>
              {state.id !== 'service' && (
                <button type="button" onClick={() => onOpen(addOn.key)}
                  className={cn('inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[0.875rem] font-semibold shadow-sm transition',
                    full ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-brand-600 text-brand-fg hover:bg-brand-700')}>
                  {state.id === 'due' ? t('Payment karein') : t('Ye lein')}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
