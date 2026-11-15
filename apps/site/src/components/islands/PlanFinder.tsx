'use client';

/**
 * Plan finder (island) on /pricing. Four questions (business type, branches,
 * users, extra needs) and a suggestion that updates as they are answered.
 *
 * The suggestion is worked out from the catalog the page already loads,
 * never from typed prices: each paid plan that has the features the answers
 * need (more than one shop needs `multi_shop`) is priced with the extra-shop
 * and extra-user add-ons it would need for the counts given, plus the
 * add-ons for the chosen needs; the cheapest monthly total wins. Default
 * answers are set, so the server HTML already shows a suggestion and
 * nothing moves when the island hydrates.
 */
import { useId, useMemo, useState } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { formatCount } from '@/components/blocks/lib/format';
import { track } from '@/lib/analytics/track';
import type { CatalogAddOn, CatalogPlan } from '@/lib/pricing/catalog';
import { EXTRA_SHOP, EXTRA_USER, MULTI_SHOP, NEED_ADDONS, type BusinessType, type FinderNeed, type PlanFinderStrings } from '@/templates/pricing/planFinderStrings';

const TYPES: BusinessType[] = ['shop', 'food', 'wholesale', 'online', 'service'];
const NEEDS: FinderNeed[] = ['store', 'marketplaces', 'wholesale'];
/** Count used for each answer: the top of the range, a typical size for the open one. */
const BRANCH_COUNTS = [1, 3, 6, 10];
const USER_COUNTS = [1, 3, 10, 15];
/** Needs a business type implies (ticked when the type is picked). */
const IMPLIED: Partial<Record<BusinessType, FinderNeed>> = { wholesale: 'wholesale', online: 'store' };

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));

export interface PlanFinderProps {
  plans: CatalogPlan[];
  addOns: CatalogAddOn[];
  /** True when the catalog has a multi-shop feature to check plans against. */
  multiShopFeature: boolean;
  unlimited: number;
  t: PlanFinderStrings;
  signupUrl: string;
  trialDays: number;
  hasComparison: boolean;
  hasCalculator: boolean;
  tourHref: string;
}

interface Pick {
  plan: CatalogPlan;
  extraShops: number;
  extraUsers: number;
  shopAddOn?: CatalogAddOn;
  userAddOn?: CatalogAddOn;
  addOns: CatalogAddOn[];
  total: number;
}

function offered(addOn: CatalogAddOn | undefined, plan: CatalogPlan): addOn is CatalogAddOn {
  return Boolean(addOn && !addOn.comingSoon && (!addOn.availableOnPlans.length || addOn.availableOnPlans.includes(plan.slug)));
}

export function suggestPlan(
  plans: CatalogPlan[],
  addOns: CatalogAddOn[],
  answers: { branches: number; users: number; needs: FinderNeed[] },
  multiShopFeature: boolean,
): Pick | null {
  const byKey = new Map(addOns.map((a) => [a.key, a]));
  let best: Pick | null = null;
  for (const plan of plans) {
    if (plan.isFree || plan.priceMonthly <= 0) continue;
    if (answers.branches > 1 && multiShopFeature && !plan.features.includes(MULTI_SHOP)) continue;
    const extraShops = Math.max(0, answers.branches - plan.limits.shops);
    const extraUsers = Math.max(0, answers.users - plan.limits.users);
    const shopAddOn = byKey.get(EXTRA_SHOP);
    const userAddOn = byKey.get(EXTRA_USER);
    if (extraShops && !offered(shopAddOn, plan)) continue;
    if (extraUsers && !offered(userAddOn, plan)) continue;
    const chosen: CatalogAddOn[] = [];
    let covered = true;
    for (const need of answers.needs) {
      const option = NEED_ADDONS[need].map((keys) => keys.map((k) => byKey.get(k))).find((set) => set.every((a) => offered(a, plan)));
      if (option) chosen.push(...(option as CatalogAddOn[]));
      else covered = false;
    }
    if (!covered) continue;
    const total =
      plan.priceMonthly +
      extraShops * (shopAddOn?.priceMonthly ?? 0) +
      extraUsers * (userAddOn?.priceMonthly ?? 0) +
      chosen.reduce((sum, a) => sum + (a.kind === 'ONE_TIME' ? 0 : a.priceMonthly), 0);
    if (!best || total < best.total) best = { plan, extraShops, extraUsers, shopAddOn, userAddOn, addOns: chosen, total };
  }
  return best;
}

function Choice({ name, label, checked, onChange, type = 'radio' }: { name: string; label: string; checked: boolean; onChange: () => void; type?: 'radio' | 'checkbox' }) {
  return (
    <label
      className={cx(
        'relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2 text-small font-medium transition-colors',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[rgb(var(--c-ring))]',
        checked ? 'border-brand-600 bg-brand-50 text-fg-strong ink:bg-brand-400/10' : 'border-line bg-surface text-fg hover:border-line-strong',
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden="true"
        className={cx(
          'flex size-4 flex-none items-center justify-center border',
          type === 'radio' ? 'rounded-full' : 'rounded',
          checked ? 'border-brand-700 bg-brand-700 text-white' : 'border-line-strong bg-surface',
        )}
      >
        {checked ? (
          type === 'radio' ? (
            <span className="size-1.5 rounded-full bg-white" />
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )
        ) : null}
      </span>
      {/* bdi: number ranges ("2–3") keep their order on right-to-left pages. */}
      <bdi>{label}</bdi>
    </label>
  );
}

export function PlanFinder({ plans, addOns, multiShopFeature, unlimited, t, signupUrl, trialDays, hasComparison, hasCalculator, tourHref }: PlanFinderProps) {
  const id = useId();
  const [type, setType] = useState<BusinessType>('shop');
  const [branches, setBranches] = useState(0);
  const [users, setUsers] = useState(1);
  const [needs, setNeeds] = useState<FinderNeed[]>([]);
  const [touched, setTouched] = useState(false);

  // Should no plan offer every chosen need, suggest the plan without them.
  const pick = useMemo(
    () =>
      suggestPlan(plans, addOns, { branches: BRANCH_COUNTS[branches]!, users: USER_COUNTS[users]!, needs }, multiShopFeature) ??
      suggestPlan(plans, addOns, { branches: BRANCH_COUNTS[branches]!, users: USER_COUNTS[users]!, needs: [] }, multiShopFeature),
    [plans, addOns, branches, users, needs, multiShopFeature],
  );
  const free = plans.find((p) => p.isFree);
  const small = branches === 0 && users === 0 && needs.length === 0 && free;

  const answer = (event: string) => {
    if (!touched) setTouched(true);
    track('plan_finder', { label: `Plan finder: ${event}` });
  };
  const chooseType = (next: BusinessType) => {
    const implied = IMPLIED[next];
    setNeeds((cur) => {
      const withoutOld = cur.filter((n) => n !== IMPLIED[type]);
      return implied && !withoutOld.includes(implied) ? [...withoutOld, implied] : withoutOld;
    });
    setType(next);
    answer(`type ${next}`);
  };
  const toggleNeed = (need: FinderNeed) => {
    setNeeds((cur) => (cur.includes(need) ? cur.filter((n) => n !== need) : [...cur, need]));
    answer(`need ${need}`);
  };

  const limit = (n: number) => (n >= unlimited || n >= 99_999 ? t.unlimited : formatCount(n));
  const legend = 'mb-2.5 text-body font-semibold text-fg-strong';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:gap-8">
      <form className="space-y-7" onSubmit={(e) => e.preventDefault()} aria-label={t.heading}>
        <fieldset>
          <legend className={legend}>{t.qType}</legend>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
            {TYPES.map((value) => (
              <Choice key={value} name={`${id}-type`} label={t.types[value]} checked={type === value} onChange={() => chooseType(value)} />
            ))}
          </div>
        </fieldset>
        <div className="grid gap-7 sm:grid-cols-2">
          <fieldset>
            <legend className={legend}>{t.qBranches}</legend>
            <p className="-mt-1.5 mb-2.5 text-small text-fg-subtle">{t.qBranchesHint}</p>
            <div className="grid grid-cols-2 gap-2">
              {t.branches.map((label, i) => (
                <Choice
                  key={label}
                  name={`${id}-branches`}
                  label={label}
                  checked={branches === i}
                  onChange={() => {
                    setBranches(i);
                    answer(`branches ${label}`);
                  }}
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={legend}>{t.qUsers}</legend>
            <p className="-mt-1.5 mb-2.5 text-small text-fg-subtle">{t.qUsersHint}</p>
            <div className="grid grid-cols-2 gap-2">
              {t.users.map((label, i) => (
                <Choice
                  key={label}
                  name={`${id}-users`}
                  label={label}
                  checked={users === i}
                  onChange={() => {
                    setUsers(i);
                    answer(`users ${label}`);
                  }}
                />
              ))}
            </div>
          </fieldset>
        </div>
        <fieldset>
          <legend className={legend}>{t.qNeeds}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {NEEDS.map((need) => (
              <Choice key={need} type="checkbox" name={`${id}-needs`} label={t.needs[need]} checked={needs.includes(need)} onChange={() => toggleNeed(need)} />
            ))}
          </div>
        </fieldset>
      </form>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <output aria-live="polite" className="block rounded-2xl border border-brand-600/40 bg-surface p-6 shadow-e2 ink:shadow-none">
          {pick ? (
            <>
              <p className="text-eyebrow uppercase text-link">{t.resultKicker}</p>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-h3 text-fg-strong">{pick.plan.name}</p>
                <p className="text-body font-semibold tabular-nums text-fg-strong">{fill(t.perMonth, { price: formatCount(pick.plan.priceMonthly) })}</p>
              </div>
              {pick.plan.description ? <p className="mt-1 text-small text-fg-muted">{pick.plan.description}</p> : null}
              <p className="mt-5 text-small font-semibold text-fg-strong">{t.includes}</p>
              <ul className="mt-2 space-y-1.5 text-small text-fg-muted">
                <li className="flex gap-2">
                  <Tick />
                  {fill(pick.plan.limits.shops === 1 ? t.limitsOneShop : t.limits, { users: limit(pick.plan.limits.users), shops: limit(pick.plan.limits.shops) })}
                </li>
                {pick.extraShops > 0 && pick.shopAddOn ? (
                  <li className="flex justify-between gap-3">
                    <span className="flex gap-2">
                      <Tick />
                      {fill(t.extraShops, { n: pick.extraShops })}
                    </span>
                    <span className="tabular-nums">{fill(t.perMonth, { price: formatCount(pick.extraShops * pick.shopAddOn.priceMonthly) })}</span>
                  </li>
                ) : null}
                {pick.extraUsers > 0 && pick.userAddOn ? (
                  <li className="flex justify-between gap-3">
                    <span className="flex gap-2">
                      <Tick />
                      {fill(t.extraUsers, { n: pick.extraUsers })}
                    </span>
                    <span className="tabular-nums">{fill(t.perMonth, { price: formatCount(pick.extraUsers * pick.userAddOn.priceMonthly) })}</span>
                  </li>
                ) : null}
                {pick.addOns.map((a) => (
                  <li key={a.key} className="flex justify-between gap-3">
                    <span className="flex gap-2">
                      <Tick />
                      {a.name}
                    </span>
                    <span className="tabular-nums">{fill(t.perMonth, { price: formatCount(a.priceMonthly) })}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-line pt-4">
                <span className="text-small text-fg-muted">{t.total}</span>
                <span className="text-h4 tabular-nums text-fg-strong">{fill(t.totalValue, { price: formatCount(pick.total) })}</span>
              </div>
              <p className="mt-1 text-xs text-fg-subtle">{t.priceNote}</p>
              {small ? <p className="mt-4 rounded-lg bg-surface-2 p-3 text-small text-fg-muted">{t.freeNote}</p> : null}
              <a
                href={signupUrl}
                className={buttonClasses({ variant: 'primary', size: 'md', fullWidth: true, className: 'mt-5' })}
                data-track-label={`Plan finder: ${pick.plan.slug}${touched ? '' : ' (default)'}`}
              >
                {fill(t.cta, { days: trialDays })}
              </a>
              <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-small font-medium">
                {hasComparison ? (
                  <a href="#compare-features" className="text-link underline-offset-4 hover:underline">
                    {t.compare}
                  </a>
                ) : null}
                {hasCalculator ? (
                  <a href="#bill-calculator" className="text-link underline-offset-4 hover:underline">
                    {t.calculator}
                  </a>
                ) : null}
              </div>
            </>
          ) : null}
        </output>
        <p className="mt-4 text-center text-small text-fg-muted">
          {t.tour}{' '}
          <a href={tourHref} className="font-medium text-link underline underline-offset-4" data-track="cta_click" data-track-label="Pricing: Take the tour">
            {t.tourLink}
          </a>
        </p>
      </div>
    </div>
  );
}

function Tick() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 flex-none text-link">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
