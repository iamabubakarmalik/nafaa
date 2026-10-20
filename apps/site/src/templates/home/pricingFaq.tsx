/**
 * Home pricing and questions. Plans come only from the Plan table (names,
 * prices, limits, features, CTA), exactly like the pricingTable block; the
 * questions are the entry's FAQs, the same list the FAQPage schema uses.
 *
 * Pricing: a monthly/yearly switch (PricingToggle island sets data-period;
 * every price is in the HTML), the recommended plan raised and ringed, a
 * clean checklist and a trust row from the hero badges.
 * Questions: native <details> in two columns beside a WhatsApp card.
 */
import Link from 'next/link';
import { CtaButton } from '@/components/blocks/parts/CtaButton';
import { InlineMarkdown, Markdown } from '@/components/blocks/rich-text/Markdown';
import { scopedSlugger } from '@/components/blocks/rich-text/slug';
import { formatPkr } from '@/components/blocks/lib/format';
import { strings } from '@/components/blocks/lib/i18n';
import { whatsappHref } from '@/components/blocks/lib/links';
import { limitText, priceOf, savingPercent } from '@/components/blocks/PricingTable';
import { PricingToggle, type PricingPeriod } from '@/components/islands/PricingToggle';
import { Prose } from '@/components/ui/Prose';
import { cx } from '@/components/ui/cx';
import type { FaqBlock, PricingTableBlock, PublicEntry, PublicPlan, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { LOGO_BOWL, LOGO_DOT } from '@/lib/brand/logo';
import { CmsIcon } from '@/lib/icons';
import blockStyles from '@/components/blocks/blocks.module.css';
import { Arrow } from '../core/ui';
import { Backdrop } from './decor';
import p from './pricing.module.css';

const PERIODS: PricingPeriod[] = ['monthly', 'yearly'];

function Tick({ on }: { on: boolean }) {
  return on ? (
    <span aria-hidden className={p.tick}>
      <svg viewBox="0 0 16 16">
        <path d="M4.5 8.3 7 10.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span aria-hidden className={cx(p.tick, p.tickOff)}>
      <svg viewBox="0 0 16 16">
        <path d="M5 8h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function HomePricing({
  block,
  plans: all,
  site,
  trust,
  note,
  compareLink,
}: {
  block: PricingTableBlock;
  plans: PublicPlan[];
  site: SiteSettings;
  trust: string[];
  note: string | null;
  compareLink?: string;
}) {
  const plans = (block.planSlugs?.length ? block.planSlugs.map((slug) => all.find((x) => x.slug === slug)).filter((x): x is PublicPlan => Boolean(x)) : [...all]).sort((a, b) => a.sortOrder - b.sortOrder);
  if (!plans.length) return null;
  const t = strings('en');
  const paid = plans.filter((x) => x.priceMonthly > 0);
  const periods = PERIODS.filter((period) => period === 'monthly' || paid.some((x) => priceOf(x, period) > 0));
  const best = Math.max(0, ...paid.map((x) => savingPercent(x, 'yearly') ?? 0));
  const highlight = block.highlightPlan ?? plans.find((x) => x.display.highlight)?.slug;

  return (
    <section aria-labelledby="home-pricing" className="relative isolate overflow-hidden py-section">
      <Backdrop pattern="dots" />
      <div data-pricing="" data-period="monthly" className={cx(blockStyles.pricing, 'mx-auto box-content max-w-wide px-gutter')}>
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <p className="text-eyebrow uppercase text-link">Pricing</p>
          <h2 id="home-pricing" className="mt-3 text-h2 text-fg-strong">
            {block.heading?.trim() || t.pricingHeading}
          </h2>
          {note ? <p className="mt-4 text-body-lg text-fg-muted">{note}</p> : null}
          {block.showToggle !== false && periods.length > 1 ? (
            <div className="mt-8 flex justify-center">
              <PricingToggle
                label={t.billingPeriod}
                className={blockStyles.toggle}
                options={periods.map((period) => ({ value: period, label: period === 'monthly' ? t.monthly : t.yearly, note: period === 'yearly' && best ? `${t.save} ${best}%` : undefined }))}
              />
            </div>
          ) : null}
        </div>

        <ul className={cx(p.plans, plans.length >= 4 && p.plans4)}>
          {plans.map((plan) => {
            const on = plan.slug === highlight;
            const free = plan.priceMonthly <= 0 && plan.priceYearly <= 0;
            const raw = plan.display.ctaHref || 'signup';
            const href = raw === 'signup' ? site.signupUrl : raw === 'demo' ? site.demoPath : raw === 'whatsapp' ? (whatsappHref(site.whatsapp) ?? site.signupUrl) : raw;
            const limits = [
              limitText(plan.limits.maxProducts, t, 'products'),
              limitText(plan.limits.maxSalesPerMonth, t, 'sales'),
              limitText(plan.limits.maxUsers, t, 'users'),
              limitText(plan.limits.maxShops, t, 'shops'),
            ];
            return (
              <li key={plan.id} className={cx(p.plan, on && p.planOn)} data-reveal>
                {on ? (
                  <span className={p.badge}>
                    <CmsIcon name="sparkles" size={12} />
                    {t.mostPopular}
                  </span>
                ) : null}
                <h3 className="text-h4 text-fg-strong">{plan.name}</h3>
                {plan.display.tagline || plan.description ? <p className="mt-1.5 min-h-[2.6rem] text-small text-fg-muted">{plan.display.tagline || plan.description}</p> : null}
                <div className="mt-5 min-h-[4rem]">
                  {free ? (
                    <p className="text-[1.9rem] font-650 leading-tight tracking-[-0.03em] text-fg-strong">{plan.trialDays > 0 ? t.freeTrial(plan.trialDays) : formatPkr(0)}</p>
                  ) : (
                    (['monthly', 'quarterly', 'yearly'] as PricingPeriod[]).map((period) => {
                      const price = priceOf(plan, period);
                      const pct = savingPercent(plan, period);
                      return (
                        <div key={period} data-price={period} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                          {price > 0 ? (
                            <>
                              <span className="text-[2.35rem] font-650 leading-none tracking-[-0.035em] text-fg-strong tabular-nums">{formatPkr(price)}</span>
                              <span className="text-small text-fg-muted">{period === 'yearly' ? t.perYear : period === 'quarterly' ? t.perQuarter : t.perMonth}</span>
                              {pct ? <span className={p.save}>{`${t.save} ${pct}%`}</span> : null}
                            </>
                          ) : (
                            <span className="text-small text-fg-subtle">{t.monthly}: {formatPkr(plan.priceMonthly)}</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <CtaButton
                  cta={{ label: plan.display.ctaLabel || t.getStarted, href, trackAs: `home-pricing:${plan.slug}` }}
                  fallbackVariant={on ? 'primary' : 'secondary'}
                  area="pricing"
                  className="mt-5 w-full justify-center"
                />
                <p className="mt-2 min-h-[1rem] text-center text-xs text-fg-subtle">{!free && plan.trialDays > 0 ? t.trialIncluded(plan.trialDays) : null}</p>
                <ul className="mt-5 space-y-2.5 border-t border-line pt-5 text-small">
                  {limits.map((text) => (
                    <li key={text} className="flex gap-2.5 font-medium text-fg-strong">
                      <Tick on />
                      {text}
                    </li>
                  ))}
                  {plan.features.map((f) => (
                    <li key={f.key} className={cx('flex gap-2.5', f.included ? 'text-fg' : 'text-fg-subtle')}>
                      <Tick on={f.included} />
                      <span>
                        {f.included ? null : <span className="sr-only">Not included: </span>}
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        <div className={p.trust} data-reveal>
          {trust.map((item) => (
            <span key={item} className={p.trustItem}>
              <CmsIcon name="circle-check" size={16} />
              <InlineMarkdown text={item} />
            </span>
          ))}
          <span className={p.trustItem}>
            <CmsIcon name="tag" size={16} />
            Prices in PKR, from our price list
          </span>
          {compareLink ? (
            <Link href={compareLink} prefetch={false} className="group inline-flex items-center gap-1.5 text-small font-semibold text-link">
              Compare all plans
              <Arrow className="transition-transform duration-fast ease-out group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function HomeFaq({ block, entry, site }: { block: FaqBlock; entry: PublicEntry; site: SiteSettings }) {
  const faqs = entry.faqs;
  if (!faqs.length) return null;
  const wa = whatsappHref(site.whatsapp);
  return (
    <section aria-labelledby="home-faq" className="relative isolate border-t border-line/70 py-section">
      <div className="mx-auto box-content grid max-w-wide gap-12 px-gutter lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-20">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start" data-reveal>
          <p className="text-eyebrow uppercase text-link">FAQ</p>
          <h2 id="home-faq" className="mt-3 text-h2 text-fg-strong">
            {block.heading?.trim() || 'Questions people ask first'}
          </h2>
          <p className="mt-4 text-body-lg text-fg-muted">Short, straight answers. Anything else, ask us directly.</p>
          {wa ? (
            <div className={p.ask}>
              <span aria-hidden className={p.askMark}>
                <svg viewBox="112 112 288 288" className="size-7">
                  <path d={LOGO_BOWL} fill="currentColor" />
                  <path d={LOGO_DOT} fill="#fbbf24" />
                </svg>
              </span>
              <div>
                <p className="text-body font-semibold text-fg-strong">Still have questions?</p>
                <p className="mt-1 text-small text-fg-muted">
                  Message the Nafaa team on WhatsApp, in English or <span lang="ur-Latn">Roman Urdu</span>.
                </p>
                <a href={wa} rel="noopener" data-track="whatsapp_click" data-track-label="Home FAQ: WhatsApp us" className={p.askBtn}>
                  <CmsIcon name="message-circle" size={16} />
                  WhatsApp us
                </a>
              </div>
            </div>
          ) : null}
        </div>
        <div className={cx(blockStyles.faqList, p.faqs)}>
          {faqs.map((faq, i) => (
            <details key={faq.id} className={cx(blockStyles.faqItem, p.faq)} open={i === 0} id={`faq-${faq.id}`}>
              <summary>
                <span className="flex gap-4">
                  <span aria-hidden className={p.faqNo}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <InlineMarkdown text={faq.question} opts={{ plainLinks: true }} />
                  </span>
                </span>
                <span aria-hidden className={blockStyles.faqIcon} />
              </summary>
              <div className={cx(blockStyles.faqAnswer, p.faqAnswer)}>
                <Prose className="text-[0.9875rem] text-fg-muted">
                  <Markdown text={faq.answer} opts={{ media: entry.media, locale: entry.locale, slugger: scopedSlugger(`faq-${faq.id}`), idPrefix: `faq-${faq.id}` }} />
                </Prose>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
