/**
 * testimonial (API-CONTRACT 4.12): consented customer quotes only. The API
 * returns a quote only with QUOTE consent and fills the business name, logo
 * and photo only with their own consents; this block shows what it gets.
 * With no consented quotes it renders nothing, never a placeholder (ARCH D12).
 * No Review or AggregateRating schema is emitted.
 */
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { CmsImage } from '@/lib/media';
import { SmartLink } from './parts/SmartLink';
import { formatDate, isoDate } from './lib/format';
import { strings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';

const SOURCE_LABEL: Record<string, string> = { GOOGLE: 'Google', PLAY_STORE: 'Play Store', G2: 'G2', CAPTERRA: 'Capterra' };

export async function Testimonials({ block, ctx }: BlockProps<'testimonial'>) {
  const items = await ctx.source.testimonials({
    locale: ctx.locale,
    ids: block.mode === 'pick' ? block.ids : undefined,
    industry: block.mode === 'auto' ? block.filter?.industryId : undefined,
    city: block.mode === 'auto' ? block.filter?.cityId : undefined,
    limit: block.limit,
  });
  if (!items.length) return null;
  const t = strings(ctx.locale);

  return (
    <Container>
      <h2 id={ctx.headingId} className="text-center text-h2 text-fg-strong">
        {block.heading?.trim() || t.testimonialsHeading}
      </h2>
      <ul className={cx('mt-12 grid gap-5', items.length === 1 ? 'mx-auto max-w-[48rem]' : items.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3')} {...reveal(ctx.index, 'stagger')}>
        {items.map((item) => {
          const place = [item.customer.industry, item.customer.city].filter(Boolean).join(' · ');
          const big = items.length === 1;
          return (
            <li key={item.id}>
              <figure className="flex h-full flex-col rounded-xl border border-line bg-surface p-7 shadow-e1 ink:shadow-none md:p-8">
                <svg aria-hidden="true" focusable="false" viewBox="0 0 32 24" className="h-6 w-8 text-brand-500/70">
                  <path fill="currentColor" d="M0 24V14.4C0 6.6 4.2 1.8 12.6 0l1.2 2.7C9.3 4.2 7.2 7 7.2 10.8H12V24H0Zm18 0V14.4C18 6.6 22.2 1.8 30.6 0l1.2 2.7c-4.5 1.5-6.6 4.3-6.6 8.1H30V24H18Z" />
                </svg>
                <blockquote className={cx('mt-5 text-fg-strong', big ? 'text-[1.375rem] leading-[1.5] tracking-[-0.01em]' : 'text-body-lg')}>
                  <p>{item.quote}</p>
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-3.5 pt-7">
                  {item.photo ? (
                    <CmsImage media={item.photo} sizes="44px" maxWidth={88} aspectRatio="1:1" className="size-11 rounded-full object-cover" />
                  ) : item.customer.logo ? (
                    <CmsImage media={item.customer.logo} sizes="44px" maxWidth={88} placeholder={false} className="size-11 rounded-md border border-line bg-white object-contain p-1" />
                  ) : null}
                  <span className="min-w-0 text-small">
                    <span className="block font-semibold text-fg-strong">{item.personName}</span>
                    <span className="block text-fg-muted">
                      {[item.personRole, item.customer.name].filter(Boolean).join(', ')}
                    </span>
                    {place || item.sourceUrl ? (
                      <span className="mt-0.5 block text-xs text-fg-subtle">
                        {place}
                        {item.sourceUrl ? (
                          <>
                            {place ? ' · ' : ''}
                            {t.sourceVia}{' '}
                            <SmartLink href={item.sourceUrl} className="underline decoration-line-strong underline-offset-2 hover:text-fg">
                              {SOURCE_LABEL[item.sourceType] ?? 'source'}
                            </SmartLink>
                          </>
                        ) : null}
                        {item.collectedAt ? (
                          <>
                            {' · '}
                            <time dateTime={isoDate(item.collectedAt)}>{formatDate(item.collectedAt, ctx.locale)}</time>
                          </>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                </figcaption>
                {item.customer.caseStudyPath ? (
                  <SmartLink href={item.customer.caseStudyPath} className="mt-5 inline-flex text-small font-medium text-link hover:underline">
                    {t.readMore}
                  </SmartLink>
                ) : null}
              </figure>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
