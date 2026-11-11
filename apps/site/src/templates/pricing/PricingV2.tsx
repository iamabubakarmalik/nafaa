/**
 * Pricing v2 sections of /pricing, all read from the public catalog
 * (`GET /plans/catalog`, lib/pricing/catalog):
 *
 *   comparison table (grouped by feature group) → add-ons → bill calculator → FAQ
 *
 * Nothing about what a plan includes is typed here; plan features, limits,
 * prices and add-ons are data. When the catalog cannot be read the page passes
 * `catalog = null`: the add-ons, calculator and comparison hide, and the page
 * keeps the CMS plan table (PlanMatrix) it already had. The FAQ always shows.
 */
import { BillCalculator } from '@/components/islands/BillCalculator';
import { formatCount } from '@/components/blocks/lib/format';
import { cx } from '@/components/ui/cx';
import { CmsIcon } from '@/lib/icons';
import type { CatalogAddOn, CatalogPlan, PricingCatalog } from '@/lib/pricing/catalog';
import { fill, pricingV2Strings, type PricingV2Strings } from './pricingV2Strings';

const GROUP_ORDER = ['Core', 'Business', 'Growth', 'Advanced'];

function Heading({ id, kicker, title, intro }: { id: string; kicker: string; title: string; intro?: string }) {
  return (
    <div className="max-w-[42rem]">
      <p className="mb-3 text-eyebrow uppercase text-link">{kicker}</p>
      <h2 id={id} className="text-h2 text-fg-strong">
        {title}
      </h2>
      {intro ? <p className="mt-4 text-body-lg text-fg-muted">{intro}</p> : null}
    </div>
  );
}

function limitText(t: PricingV2Strings, value: number, unlimitedAt: number): string {
  return value >= unlimitedAt || value >= 99_999 ? t.unlimited : formatCount(value);
}

/** Grouped feature comparison across the catalog plans. */
export function CatalogComparison({ catalog, locale, highlight }: { catalog: PricingCatalog; locale?: string; highlight?: string }) {
  const t = pricingV2Strings(locale);
  const { plans } = catalog;
  if (plans.length < 2) return null;

  const rows: [string, (p: CatalogPlan) => number][] = [
    [t.users, (p) => p.limits.users],
    [t.shops, (p) => p.limits.shops],
    [t.products, (p) => p.limits.products],
    [t.sales, (p) => p.limits.salesPerMonth],
  ];
  const included = (key: string) => plans.some((p) => p.features.includes(key));
  const groupNames = [...new Set(catalog.features.filter((f) => included(f.key)).map((f) => f.group))].filter((g) => g !== 'Add-on');
  groupNames.sort((a, b) => (GROUP_ORDER.indexOf(a) + 100) % 100 - (GROUP_ORDER.indexOf(b) + 100) % 100);
  const cell = (plan: CatalogPlan) => cx('p-4 tabular-nums text-fg-strong', plan.slug === highlight && 'bg-brand-50/60 ink:bg-brand-400/10');

  return (
    <section aria-labelledby="compare-features" className="py-section">
      <div className="mx-auto box-content max-w-container px-gutter">
        <Heading id="compare-features" kicker={t.compareKicker} title={t.compareHeading} intro={t.compareIntro} />
        <div className="mt-10 overflow-x-auto rounded-xl border border-line bg-surface shadow-e1 ink:shadow-none" tabIndex={0} role="region" aria-labelledby="compare-features">
          <table className="w-full min-w-[40rem] border-collapse text-left text-small">
            <caption className="sr-only">{t.caption}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-[28%] p-4 font-medium text-fg-subtle">
                  {t.plan}
                </th>
                {plans.map((p) => (
                  <th key={p.slug} scope="col" className={cx('p-4 align-bottom text-h4 text-fg-strong', p.slug === highlight && 'bg-brand-50/60 ink:bg-brand-400/10')}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="colgroup" colSpan={plans.length + 1} className="bg-surface-2 px-4 py-2 text-eyebrow uppercase text-fg-subtle">
                  {t.limits}
                </th>
              </tr>
              {rows.map(([label, read]) => (
                <tr key={label} className="border-t border-line">
                  <th scope="row" className="p-4 font-medium text-fg">
                    {label}
                  </th>
                  {plans.map((p) => (
                    <td key={p.slug} className={cell(p)}>
                      {limitText(t, read(p), catalog.unlimited)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {groupNames.map((group) => (
              <tbody key={group}>
                <tr>
                  <th scope="colgroup" colSpan={plans.length + 1} className="bg-surface-2 px-4 py-2 text-eyebrow uppercase text-fg-subtle">
                    {t.groups[group] ?? group}
                  </th>
                </tr>
                {catalog.features
                  .filter((f) => f.group === group && included(f.key))
                  .map((f) => (
                    <tr key={f.key} className="border-t border-line">
                      <th scope="row" className="p-4 font-medium text-fg">
                        {f.label}
                      </th>
                      {plans.map((p) => (
                        <td key={p.slug} className={cell(p)}>
                          {p.features.includes(f.key) ? (
                            <CmsIcon name="check" size={18} label={t.included} className="text-link" />
                          ) : (
                            <span className="text-fg-subtle" aria-label={t.notIncluded}>
                              —
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </section>
  );
}

function priceText(t: PricingV2Strings, a: CatalogAddOn): string {
  const price = formatCount(a.priceMonthly);
  if (a.kind === 'ONE_TIME') return fill(t.oneTime, { price });
  if (a.kind === 'PER_UNIT') return fill(t.perUnit, { price, unit: a.unitLabel ?? '' });
  return fill(t.perMonth, { price });
}

/** Add-on cards grouped by category. */
export function AddOnsSection({ catalog, locale }: { catalog: PricingCatalog; locale?: string }) {
  const t = pricingV2Strings(locale);
  if (!catalog.addOns.length) return null;
  const byKey = new Map(catalog.addOns.map((a) => [a.key, a]));
  const categories = [...new Set(catalog.addOns.map((a) => a.category))];

  return (
    <section aria-labelledby="addons" className="py-section">
      <div className="mx-auto box-content max-w-container px-gutter">
        <Heading id="addons" kicker={t.addOnsKicker} title={t.addOnsHeading} intro={t.addOnsIntro} />
        <div className="mt-10 space-y-10">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="mb-4 text-h4 text-fg-strong">{t.categories[category] ?? category}</h3>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catalog.addOns
                  .filter((a) => a.category === category)
                  .map((a) => {
                    const members = a.bundleKeys.map((k) => byKey.get(k)).filter((m): m is CatalogAddOn => Boolean(m));
                    const saving = members.length ? members.reduce((sum, m) => sum + m.priceMonthly, 0) - a.priceMonthly : 0;
                    return (
                      <li key={a.key} className={cx('flex flex-col rounded-xl border border-line bg-surface p-5 shadow-e1 ink:shadow-none', a.comingSoon && 'opacity-80')}>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-body font-semibold text-fg-strong">{a.name}</h4>
                          {a.comingSoon ? (
                            <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-muted">{t.comingSoon}</span>
                          ) : null}
                        </div>
                        {a.description ? <p className="mt-2 text-small text-fg-muted">{a.description}</p> : null}
                        {members.length ? <p className="mt-2 text-xs text-fg-subtle">{fill(t.bundleIncludes, { list: members.map((m) => m.name).join(', ') })}</p> : null}
                        <p className="mt-auto pt-4 text-body font-semibold text-fg-strong tabular-nums">{priceText(t, a)}</p>
                        {saving > 0 ? <p className="mt-1 text-xs font-medium text-link">{fill(t.bundleSaves, { amount: formatCount(saving) })}</p> : null}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CalculatorSection({ catalog, locale, signupUrl, highlight }: { catalog: PricingCatalog; locale?: string; signupUrl: string; highlight?: string }) {
  const t = pricingV2Strings(locale);
  return (
    <section aria-labelledby="bill-calculator" className="py-section">
      <div className="mx-auto box-content max-w-container px-gutter">
        <Heading id="bill-calculator" kicker={t.calcKicker} title={t.calcHeading} intro={t.calcIntro} />
        <div className="mt-10">
          <BillCalculator plans={catalog.plans} addOns={catalog.addOns} t={t} signupUrl={signupUrl} trialDays={catalog.trialDays} defaultPlan={highlight} />
        </div>
      </div>
    </section>
  );
}
