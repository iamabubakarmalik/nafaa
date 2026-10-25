/**
 * pricingTable (API-CONTRACT 4.14): plans read only from the Plan table
 * (/public/site/plans), never typed in the CMS (ARCH D10). Plan contents are
 * not final, so names, prices, limits, features and CTA text all come from
 * the data; nothing about a plan is hard-coded here.
 *
 * - A plan priced Rs 0 with trial days shows "{n}-day Free Trial"
 *   (owner rule; Roman Urdu "{n} din Free Trial").
 * - The period switch (island) changes the visible price; every price is in
 *   the server HTML. "Save x%" is worked out from the plan's own monthly and
 *   period prices.
 * - Limits at or above the API's unlimited sentinels (999 users or shops,
 *   99,999 products or sales) read "Unlimited".
 * - SoftwareApplication `offers` are built from the same plans by
 *   lib/seo/graph.ts.
 */
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { PricingToggle, type PricingPeriod } from '@/components/islands/PricingToggle';
import type { PublicPlan } from '@/lib/cms/contract/cms-contract';
import { BlockHeading } from './parts/BlockHeading';
import { CtaButton } from './parts/CtaButton';
import { formatCount, formatPkr } from './lib/format';
import { whatsappHref } from './lib/links';
import { strings, type BlockStrings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';
import styles from './blocks.module.css';

const PERIODS: PricingPeriod[] = ['monthly', 'quarterly', 'yearly'];
const MONTHS: Record<PricingPeriod, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export function priceOf(plan: PublicPlan, period: PricingPeriod): number {
  return period === 'monthly' ? plan.priceMonthly : period === 'quarterly' ? plan.priceQuarterly : plan.priceYearly;
}

/** Whole-percent saving of a longer period against paying monthly; null when there is none. */
export function savingPercent(plan: PublicPlan, period: PricingPeriod): number | null {
  if (period === 'monthly' || plan.priceMonthly <= 0) return null;
  const full = plan.priceMonthly * MONTHS[period];
  const price = priceOf(plan, period);
  if (price <= 0 || price >= full) return null;
  const pct = Math.floor(((full - price) / full) * 100);
  return pct >= 1 ? pct : null;
}

export function limitText(value: number, t: BlockStrings, kind: 'products' | 'users' | 'shops' | 'sales'): string {
  const unlimited = kind === 'users' || kind === 'shops' ? value >= 999 : value >= 99_999;
  if (unlimited) return t.unlimitedLimit[kind];
  if (kind === 'users' && value === 1) return t.limitUser;
  if (kind === 'shops' && value === 1) return t.limitShop;
  const n = formatCount(value);
  return { products: t.limitProducts(n), users: t.limitUsers(n), shops: t.limitShops(n), sales: t.limitSales(n) }[kind];
}

function Check({ on }: { on: boolean }) {
  return on ? (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-link">
      <circle cx="8" cy="8" r="7.25" fill="currentColor" opacity="0.13" />
      <path d="M5 8.2 7 10.1l4-4.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-fg-subtle/70">
      <path d="M5 8h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export async function PricingTable({ block, ctx }: BlockProps<'pricingTable'>) {
  const [all, site] = await Promise.all([ctx.source.plans(), ctx.source.site(ctx.locale)]);
  const plans = block.planSlugs?.length
    ? block.planSlugs.map((slug) => all.find((plan) => plan.slug === slug)).filter((plan): plan is PublicPlan => Boolean(plan))
    : [...all].sort((a, b) => a.sortOrder - b.sortOrder);
  if (!plans.length) return null;

  const t = strings(ctx.locale);
  const periodLabel: Record<PricingPeriod, string> = { monthly: t.monthly, quarterly: t.quarterly, yearly: t.yearly };
  const perLabel: Record<PricingPeriod, string> = { monthly: t.perMonth, quarterly: t.perQuarter, yearly: t.perYear };
  const paid = plans.filter((plan) => plan.priceMonthly > 0);
  const periods = PERIODS.filter((period) => period === 'monthly' || paid.some((plan) => priceOf(plan, period) > 0));
  const bestSaving = (period: PricingPeriod) => Math.max(0, ...paid.map((plan) => savingPercent(plan, period) ?? 0));
  const highlightSlug = block.highlightPlan ?? plans.find((plan) => plan.display.highlight)?.slug;
  const featureKeys = block.featureKeys?.length ? new Set(block.featureKeys) : null;
  const compact = block.compact === true;
  const cols = plans.length >= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : plans.length === 3 ? 'md:grid-cols-3' : plans.length === 2 ? 'md:grid-cols-2 max-w-[52rem] mx-auto' : 'max-w-[26rem] mx-auto';

  return (
    <Container size={plans.length >= 4 ? 'wide' : 'default'}>
      <div data-pricing="" data-period="monthly" className={styles.pricing}>
        <BlockHeading id={ctx.headingId} title={block.heading?.trim() || t.pricingHeading} align="center" className="mx-auto" index={ctx.index}>
          {block.showToggle && periods.length > 1 ? (
            <div className="mt-8 flex justify-center">
              <PricingToggle
                label={t.billingPeriod}
                className={styles.toggle}
                options={periods.map((period) => {
                  const pct = bestSaving(period);
                  return { value: period, label: periodLabel[period], note: pct ? `${t.save} ${pct}%` : undefined };
                })}
              />
            </div>
          ) : null}
        </BlockHeading>

        <ul className={cx('mt-12 grid gap-5', cols)} {...reveal(ctx.index, 'stagger')}>
          {plans.map((plan) => {
            const highlighted = plan.slug === highlightSlug;
            const free = plan.priceMonthly <= 0 && plan.priceQuarterly <= 0 && plan.priceYearly <= 0;
            const features = plan.features.filter((feature) => !featureKeys || featureKeys.has(feature.key));
            // Plan display links may use the CTA keywords (signup, demo, whatsapp); blocks get them resolved by the API, plans do not.
            const raw = plan.display.ctaHref || 'signup';
            const href = raw === 'signup' ? site.signupUrl : raw === 'demo' ? site.demoPath : raw === 'whatsapp' ? whatsappHref(site.whatsapp) ?? site.signupUrl : raw;
            const limits = [
              limitText(plan.limits.maxProducts, t, 'products'),
              limitText(plan.limits.maxSalesPerMonth, t, 'sales'),
              limitText(plan.limits.maxUsers, t, 'users'),
              limitText(plan.limits.maxShops, t, 'shops'),
            ];
            return (
              <li
                key={plan.id}
                className={cx(
                  'relative isolate flex flex-col rounded-xl border bg-surface p-7 ink:shadow-none',
                  highlighted ? cx('border-transparent', styles.planHighlight) : 'border-line shadow-e1',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-h4 text-fg-strong">{plan.name}</h3>
                  {highlighted ? (
                    <span className="rounded-full bg-brand-700 px-2.5 py-0.5 text-xs font-medium text-white ink:bg-brand-400 ink:text-slate-950">{t.mostPopular}</span>
                  ) : null}
                </div>
                {plan.display.tagline || plan.description ? (
                  <p className="mt-2 min-h-[2.75rem] text-small text-fg-muted">{plan.display.tagline || plan.description}</p>
                ) : null}

                <div className="mt-6 min-h-[4.25rem]">
                  {free ? (
                    <p className="flex items-baseline gap-2">
                      <span className="text-[2rem] font-650 leading-tight tracking-[-0.03em] text-fg-strong">
                        {plan.trialDays > 0 ? t.freeTrial(plan.trialDays) : formatPkr(0)}
                      </span>
                    </p>
                  ) : (
                    PERIODS.map((period) => {
                      const price = priceOf(plan, period);
                      const pct = savingPercent(plan, period);
                      return (
                        <div key={period} data-price={period} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          {price > 0 ? (
                            <>
                              <span className="text-[2.5rem] font-650 leading-none tracking-[-0.035em] text-fg-strong tabular-nums">{formatPkr(price)}</span>
                              <span className="text-small text-fg-muted">{perLabel[period]}</span>
                              {pct ? <span className="basis-full text-xs font-medium text-link">{`${t.save} ${pct}%`}</span> : null}
                            </>
                          ) : (
                            <span className="text-small text-fg-subtle">{periodLabel[period]}: –</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-6">
                  <CtaButton
                    cta={{ label: plan.display.ctaLabel || t.getStarted, href, trackAs: `pricing:${plan.slug}` }}
                    fallbackVariant={highlighted ? 'primary' : 'secondary'}
                    area="pricing"
                    className="w-full"
                  />
                  <p className="mt-2.5 min-h-[1.125rem] text-center text-xs text-fg-subtle">{!free && plan.trialDays > 0 ? t.trialIncluded(plan.trialDays) : null}</p>
                </div>

                <div className="mt-7 border-t border-line pt-6">
                  <p className="sr-only">{t.plansIncluded}</p>
                  <ul className="space-y-2.5 text-small">
                    {limits.map((text) => (
                      <li key={text} className="flex gap-2.5 text-fg">
                        <Check on />
                        <span>{text}</span>
                      </li>
                    ))}
                    {!compact
                      ? features.map((feature) => (
                          <li key={feature.key} className={cx('flex gap-2.5', feature.included ? 'text-fg' : 'text-fg-subtle')}>
                            <Check on={feature.included} />
                            <span>
                              {feature.included ? null : <span className="sr-only">{t.notIncluded}</span>}
                              {feature.label}
                            </span>
                          </li>
                        ))
                      : null}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Container>
  );
}
