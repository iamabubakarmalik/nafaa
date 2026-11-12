/**
 * Template main sections: main_collection, main_search, main_cart,
 * main_page, main_blog, main_article, main_account, not_found.
 */
import Link from 'next/link';
import { Search } from 'lucide-react';
import { formatDate, href } from '@/lib/format';
import { t } from '@/lib/i18n';
import { reader } from '@/lib/settings';
import { CollectionView } from '../collection/CollectionView';
import { CartPageClient } from '../checkout/CartPageClient';
import { AccountClient } from '../account/AccountClient';
import { Img } from '../ui/Img';
import { RichText } from '../ui/RichText';
import type { SectionProps } from './types';

export function MainCollection({ section, ctx, data }: SectionProps) {
  const c = data?.collection;
  if (!c) return null;
  const r = reader(section, ctx.lang);
  const { collection } = c;
  return (
    <section className="pb-16 pt-6 md:pb-24">
      {collection.image && r.bool('showBanner', r.bool('showImage', true)) ? (
        <div className="page mb-8">
          <div className="relative isolate flex min-h-[200px] items-end overflow-hidden rounded-card bg-neutral-900 p-6 text-white md:min-h-[300px] md:p-10">
            <Img src={collection.image} alt={collection.title} priority sizes="100vw" className="-z-10 object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 to-black/5" />
            <div className="max-w-2xl">
              <h1 className="h-display text-3xl font-semibold md:text-5xl">{collection.title}</h1>
              {collection.descriptionHtml && <RichText html={collection.descriptionHtml} className="mt-2 !text-white/90 [&_*]:!text-white/90" />}
            </div>
          </div>
        </div>
      ) : (
        <div className="page mb-8 border-b border-line pb-8 pt-4 md:pt-8">
          <h1 className="h-display text-3xl font-semibold md:text-[2.6rem]">{collection.title}</h1>
          {collection.descriptionHtml && <RichText html={collection.descriptionHtml} className="mt-3 max-w-2xl" />}
        </div>
      )}
      <div className="page">
        <CollectionView
          list={c.products}
          ctx={ctx}
          base={href(ctx.lang, collection.url)}
          query={data?.query ?? {}}
          showFilters={r.bool('filters', r.bool('showFilters', true))}
          showSort={r.bool('sort', true)}
          columns={r.num('columns', 4)}
          mobileColumns={r.num('mobileColumns', 2)}
          quickAdd={r.bool('quickAdd', ctx.theme.layout.quickAdd)}
        />
      </div>
    </section>
  );
}

export function MainSearch({ section, ctx, data }: SectionProps) {
  const r = reader(section, ctx.lang);
  const s = data?.search;
  const q = s?.q ?? '';
  return (
    <section className="pb-16 pt-8 md:pb-24">
      <div className="page">
        <h1 className="h-display mb-5 text-3xl font-semibold md:text-4xl">{q ? t(ctx.lang, 'search.resultsFor', { q }) : t(ctx.lang, 'search.title')}</h1>
        <form action={href(ctx.lang, '/search')} className="mb-10 flex max-w-xl gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={q} placeholder={t(ctx.lang, 'search.placeholder')} className="field ps-11" type="search" />
          </div>
          <button className="btn btn-primary" type="submit">
            {t(ctx.lang, 'nav.search')}
          </button>
        </form>
        {s && q ? (
          s.products.total ? (
            <CollectionView list={s.products} ctx={ctx} base={href(ctx.lang, '/search')} query={data?.query ?? {}} showFilters={r.bool('filters', true)} />
          ) : (
            <p className="rounded-card bg-surface px-6 py-16 text-center text-muted">{t(ctx.lang, 'search.none', { q })}</p>
          )
        ) : null}
      </div>
    </section>
  );
}

export function MainCart({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  return <CartPageClient freeShippingBar={r.bool('freeShippingBar', true)} coupon={r.bool('coupon', true)} notes={r.bool('notes', true)} />;
}

export function MainPage({ section, ctx, data }: SectionProps) {
  const p = data?.html;
  if (!p) return null;
  const wide = reader(section, ctx.lang).pick('width', ['narrow', 'wide'] as const, 'narrow') === 'wide';
  return (
    <section className="pb-20 pt-10 md:pt-16">
      <div className={`page ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <h1 className="h-display mb-8 text-3xl font-semibold md:text-[2.6rem]">{p.title}</h1>
        <RichText html={p.bodyHtml} className="text-[16px]" />
      </div>
    </section>
  );
}

export function MainBlog({ section, ctx, data }: SectionProps) {
  const b = data?.blog;
  if (!b) return null;
  const showImage = reader(section, ctx.lang).bool('showImage', true);
  return (
    <section className="pb-20 pt-10">
      <div className="page">
        <h1 className="h-display mb-10 text-3xl font-semibold md:text-[2.6rem]">{b.blog.title}</h1>
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {b.items.map((p) => (
            <article key={p.handle} className="group">
              {showImage && <Link href={href(ctx.lang, p.url)} className="relative block aspect-[16/10] overflow-hidden rounded-card bg-surface">
                {p.image && <Img src={p.image} alt={p.title} sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
              </Link>}
              <p className="mt-4 text-[12.5px] text-muted">{formatDate(p.publishedAt, ctx.lang)}</p>
              <h2 className="mt-1 text-xl font-semibold leading-snug">
                <Link href={href(ctx.lang, p.url)} className="hover:underline">
                  {p.title}
                </Link>
              </h2>
              {p.excerpt && <p className="mt-2 line-clamp-3 text-[14.5px] text-muted">{p.excerpt}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MainArticle({ section, ctx, data }: SectionProps) {
  const a = data?.article;
  if (!a) return null;
  const r = reader(section, ctx.lang);
  const showDate = r.bool('showDate', true);
  const showAuthor = r.bool('showAuthor', true);
  return (
    <article className="pb-20 pt-10">
      <div className="page max-w-3xl">
        <p className="text-[13px] text-muted">
          {showDate ? formatDate(a.publishedAt, ctx.lang) : ''}
          {showAuthor && a.author ? `${showDate ? ' · ' : ''}${t(ctx.lang, 'blog.by', { author: a.author })}` : ''}
        </p>
        <h1 className="h-display mt-2 text-3xl font-semibold leading-tight md:text-5xl">{a.title}</h1>
      </div>
      {a.image && r.bool('showImage', true) && (
        <div className="page mt-8 max-w-5xl">
          <div className="relative aspect-[16/8] overflow-hidden rounded-card bg-surface">
            <Img src={a.image} alt={a.title} priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
          </div>
        </div>
      )}
      <div className="page mt-10 max-w-3xl">
        <RichText html={a.bodyHtml} className="text-[17px]" />
        {a.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {a.tags.map((x) => (
              <span key={x} className="badge bg-surface text-fg">
                {x}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function MainAccount() {
  return <AccountClient />;
}

export function NotFoundView({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  return (
    <section className="page flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-heading text-7xl font-semibold text-fg/15">404</p>
      <h1 className="mt-2 text-2xl font-semibold">{r.text('heading', t(ctx.lang, 'notFound.title'))}</h1>
      <p className="mt-2 max-w-md text-muted">{r.text('subheading', t(ctx.lang, 'notFound.text'))}</p>
      <div className="mt-7 flex gap-3">
        <Link href={href(ctx.lang, '/')} className="btn btn-primary">
          {t(ctx.lang, 'notFound.home')}
        </Link>
        <Link href={href(ctx.lang, r.text('buttonLink', '/collections/all'))} className="btn btn-outline">
          {r.text('buttonLabel', t(ctx.lang, 'nav.shopAll'))}
        </Link>
      </div>
    </section>
  );
}
