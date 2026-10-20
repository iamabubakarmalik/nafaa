/**
 * cityFacts (API-CONTRACT 4.16): facts from a CITY entry's data: the tax
 * rules (authority, services tax rate with its source, Tier-1 note), main
 * markets, areas (each an H3, never a URL), support and nearby cities.
 *
 * On a CITY_INDUSTRY page the facts come from the parent CITY entry. Each
 * section renders only when it has real data. Headings: without a block
 * heading each section title is an H2 (so "Which tax rules apply in X" is a
 * page-level question); with one, sections step down to H3.
 */
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import type { EntryDataOf } from '@/lib/cms/contract/cms-contract';
import { BlockHeading } from './parts/BlockHeading';
import { EntryCardItem } from './parts/EntryCards';
import { SmartLink } from './parts/SmartLink';
import { formatDate, isoDate } from './lib/format';
import { strings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockContext, BlockProps } from './types';

type CityData = EntryDataOf<'CITY'>;

async function cityData(ctx: BlockContext): Promise<CityData | null> {
  if (ctx.entry.data.type === 'CITY') return ctx.entry.data;
  if (ctx.entry.data.type === 'CITY_INDUSTRY' && ctx.entry.parent) {
    const parent = await ctx.source.entry(ctx.entry.parent.path, ctx.locale);
    return parent?.data.type === 'CITY' ? parent.data : null;
  }
  return null;
}

export async function CityFacts({ block, ctx }: BlockProps<'cityFacts'>) {
  const city = await cityData(ctx);
  if (!city) return null;
  const t = strings(ctx.locale).city;
  const tAll = strings(ctx.locale);
  const nested = Boolean(block.heading);
  const H = nested ? 'h3' : 'h2';
  const Sub = nested ? 'h4' : 'h3';
  const titleClass = nested ? 'text-h3 text-fg-strong' : 'text-h2 text-fg-strong';

  const nearby =
    block.show.includes('nearby') && city.nearbyCityIds.length
      ? (await ctx.source.entries({ type: 'CITY', locale: ctx.locale, limit: 200 }))
          .filter((card) => city.nearbyCityIds.includes(card.id))
          .sort((a, b) => city.nearbyCityIds.indexOf(a.id) - city.nearbyCityIds.indexOf(b.id))
      : [];

  const sections = block.show.map((section) => {
    const id = `${ctx.headingId}-${section}`;
    switch (section) {
      case 'tax':
        return (
          <section key={section} aria-labelledby={id}>
            <H id={id} className={titleClass}>
              {t.taxHeading(city.name)}
            </H>
            <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" {...reveal(ctx.index)}>
              <dl className="divide-y divide-line rounded-xl border border-line bg-surface px-6 shadow-e1 ink:shadow-none">
                <div className="flex justify-between gap-6 py-4">
                  <dt className="text-small text-fg-muted">{t.authority}</dt>
                  <dd className="text-small font-semibold text-fg-strong">{city.authority}</dd>
                </div>
                <div className="flex justify-between gap-6 py-4">
                  <dt className="text-small text-fg-muted">{t.province}</dt>
                  <dd className="text-right text-small font-semibold text-fg-strong">{city.province}</dd>
                </div>
                {city.servicesTax ? (
                  <>
                    <div className="flex justify-between gap-6 py-4">
                      <dt className="text-small text-fg-muted">{t.servicesTax}</dt>
                      <dd className="text-right text-small font-semibold text-fg-strong">{city.servicesTax.rate}</dd>
                    </div>
                    <div className="py-4">
                      <dt className="text-small text-fg-muted">{t.appliesTo}</dt>
                      <dd className="mt-1 text-small text-fg">{city.servicesTax.appliesTo}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
              <div className="flex flex-col gap-5">
                {city.tier1Note ? (
                  <div className="rounded-xl border border-line bg-surface-2 p-6">
                    <p className="text-eyebrow uppercase text-fg-subtle">{t.tier1}</p>
                    <p className="mt-2 text-small text-fg">{city.tier1Note}</p>
                  </div>
                ) : null}
                {city.servicesTax?.source ? (
                  <p className="text-xs text-fg-subtle">
                    {tAll.sources}:{' '}
                    <SmartLink href={city.servicesTax.source.url} className="text-link underline decoration-link/30 underline-offset-2 hover:decoration-current">
                      {city.servicesTax.source.title}
                    </SmartLink>{' '}
                    · {city.servicesTax.source.publisher} · {tAll.accessed}{' '}
                    <time dateTime={isoDate(city.servicesTax.source.accessedAt)}>{formatDate(city.servicesTax.source.accessedAt, ctx.locale)}</time>
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        );
      case 'markets':
        if (!city.markets.length) return null;
        return (
          <section key={section} aria-labelledby={id}>
            <H id={id} className={titleClass}>
              {t.marketsHeading(city.name)}
            </H>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" {...reveal(ctx.index, 'stagger')}>
              {city.markets.map((market, i) => (
                <li key={i} className="rounded-lg border border-line bg-surface p-5 shadow-e1 ink:shadow-none">
                  <p className="font-semibold text-fg-strong">{market.name}</p>
                  {market.area ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-fg-subtle">
                      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {market.area}
                    </p>
                  ) : null}
                  <p className="mt-3 text-small text-fg-muted">{market.note}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      case 'areas':
        if (!city.areas.length) return null;
        return (
          <section key={section} aria-labelledby={id}>
            <H id={id} className={titleClass}>
              {t.areasHeading(city.name)}
            </H>
            <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
              {city.areas.map((area, i) => (
                <div key={i} className="border-l-2 border-brand-500/40 pl-5">
                  <Sub className="text-h4 text-fg-strong">{area.name}</Sub>
                  <p className="mt-1.5 text-small text-fg-muted">{area.note}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case 'support':
        if (!city.support.note && !city.support.onsite) return null;
        return (
          <section key={section} aria-labelledby={id}>
            <H id={id} className={titleClass}>
              {t.supportHeading(city.name)}
            </H>
            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-e1 ink:shadow-none md:flex-row md:items-center md:gap-8">
              <p className="flex shrink-0 items-center gap-2.5 text-small">
                <span className={cx('size-2.5 rounded-full', city.support.onsite ? 'bg-brand-500' : 'bg-fg-subtle')} aria-hidden />
                <span className="text-fg-muted">{t.onsite}:</span>
                <span className="font-semibold text-fg-strong">{city.support.onsite ? t.onsiteYes : t.onsiteNo}</span>
              </p>
              {city.support.note ? <p className="text-small text-fg">{city.support.note}</p> : null}
            </div>
          </section>
        );
      case 'nearby':
        if (!nearby.length) return null;
        return (
          <section key={section} aria-labelledby={id}>
            <H id={id} className={titleClass}>
              {t.nearbyHeading}
            </H>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" {...reveal(ctx.index, 'stagger')}>
              {nearby.map((card) => (
                <li key={card.id}>
                  <EntryCardItem card={card} locale={ctx.locale} headingAs={nested ? 'h4' : 'h3'} />
                </li>
              ))}
            </ul>
          </section>
        );
      default:
        return null;
    }
  });

  if (!sections.some(Boolean)) return null;
  return (
    <Container>
      {block.heading ? <BlockHeading id={ctx.headingId} title={block.heading} index={ctx.index} /> : null}
      <div className={cx('space-y-16 md:space-y-20', block.heading && 'mt-12')}>{sections}</div>
    </Container>
  );
}
