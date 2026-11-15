/**
 * Gate page (/food, /grocery, /pharmacy, /shopping, /booking, /wholesale):
 * gate hero, sub-filter chips, sort and quick filters as links (crawlable,
 * no client state), and the shop list. Wholesale shows the business-only note.
 */
import type { Metadata } from 'next';
import { Briefcase, Store } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GateIcon } from '@/components/market/GateIcon';
import { ShopCard } from '@/components/market/ShopCard';
import { ButtonLink, EmptyState, tabClass } from '@/components/ui';
import { api, type ShopQuery } from '@/lib/api';
import { pick } from '@/lib/i18n';
import { pageLang, readLoc } from '@/lib/page';
import { JsonLd, pageMeta } from '@/lib/seo';
import { GATE_LOOK, GATE_SLUGS, SITE_URL } from '@/lib/site';
import type { GateDef } from '@/lib/types';

type Params = Promise<{ lang: string; gate: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

async function gateFor(slug: string): Promise<GateDef | null> {
  const id = GATE_SLUGS[slug.toLowerCase()];
  if (!id) return null;
  const config = await api.config().catch(() => null);
  return config?.gates.find((g) => g.id === id) ?? null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, t } = await pageLang(params);
  const gate = await gateFor((await params).gate);
  if (!gate) return {};
  const label = pick(gate.label, lang);
  return pageMeta({ lang, path: `/${gate.slug}`, title: t('seo.gateTitle', { gate: label }), description: t('seo.gateDesc', { tagline: pick(gate.tagline, lang) }) });
}

const SORTS = [
  { id: 'popular', key: 'gate.sortPopular' },
  { id: 'rating', key: 'gate.sortRating' },
  { id: 'distance', key: 'gate.sortDistance' },
  { id: 'delivery_time', key: 'gate.sortFast' },
] as const;

export default async function GatePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { lang, t, h } = await pageLang(params);
  const gate = await gateFor((await params).gate);
  if (!gate) notFound();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);
  const loc = await readLoc();
  const filter = gate.filters.some((f) => f.id === one('f')) ? one('f') : undefined;
  const sortParam = SORTS.find((s) => s.id === one('sort'))?.id;
  const sort: ShopQuery['sort'] = sortParam === 'distance' && !loc?.lat ? 'popular' : sortParam;
  const open = one('open') === '1';
  const free = one('free') === '1';
  const page = Math.max(1, Math.min(50, Number(one('page')) || 1));

  const res = await api
    .shops({ gate: gate.id, city: loc?.city, lat: loc?.lat, lng: loc?.lng, filter, sort, onlyOpen: open, freeDelivery: free, limit: 24 * page })
    .catch(() => ({ items: [], total: 0, hasMore: false }));

  const color = GATE_LOOK[gate.id].color;
  const base = h(`/${gate.slug}`);
  const link = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const next = { f: filter, sort: sortParam, open: open ? '1' : undefined, free: free ? '1' : undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <div className="container-page pt-4 md:pt-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Nafaa Market', item: `${SITE_URL}${h('/')}` },
            { '@type': 'ListItem', position: 2, name: pick(gate.label, lang), item: `${SITE_URL}${base}` },
          ],
        }}
      />
      <section className="relative overflow-hidden rounded-3xl px-5 py-6 md:px-8 md:py-8" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}>
        <div className="relative z-10 flex items-center gap-4 text-white">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur"><GateIcon gate={gate.id} className="h-7 w-7" /></span>
          <div>
            <h1 className="text-2xl font-extrabold md:text-3xl">{pick(gate.label, lang)}</h1>
            <p className="text-sm text-white/85">{pick(gate.tagline, lang)}</p>
          </div>
        </div>
        <GateIcon gate={gate.id} className="pointer-events-none absolute -bottom-6 -end-4 h-40 w-40 text-white/10" />
      </section>

      {gate.businessOnly && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-bold text-amber-900">{t('gate.businessOnly')}</p>
              <p className="text-sm text-amber-800">{t('gate.businessOnlySub')}</p>
            </div>
          </div>
          <ButtonLink href={`${h('/login')}?next=${encodeURIComponent(base)}&business=1`} variant="outline" size="sm" className="shrink-0">
            {t('gate.businessCta')}
          </ButtonLink>
        </div>
      )}

      {gate.filters.length > 0 && (
        <nav aria-label={pick(gate.label, lang)} className="scroll-x mt-5">
          <Link href={link({ f: undefined })} className={tabClass(!filter)}>{t('gate.all')}</Link>
          {gate.filters.map((f) => (
            <Link key={f.id} href={link({ f: f.id })} className={tabClass(filter === f.id)}>{pick(f.label, lang)}</Link>
          ))}
        </nav>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {SORTS.filter((s) => s.id !== 'distance' || loc?.lat).map((s) => {
          const on = (sortParam ?? 'popular') === s.id;
          return (
            <Link key={s.id} href={link({ sort: s.id === 'popular' ? undefined : s.id })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ${on ? 'bg-gray-900 text-white ring-gray-900' : 'bg-white text-gray-700 ring-gray-200'}`}>
              {t(s.key)}
            </Link>
          );
        })}
        <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
        <Link href={link({ open: open ? undefined : '1' })} aria-pressed={open} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ${open ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-gray-700 ring-gray-200'}`}>{t('gate.openNow')}</Link>
        {gate.id !== 'BOOKING' && (
          <Link href={link({ free: free ? undefined : '1' })} aria-pressed={free} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ${free ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-gray-700 ring-gray-200'}`}>{t('gate.freeDelivery')}</Link>
        )}
        <span className="num ms-auto text-xs text-gray-500">{t('gate.shops', { count: res.items.length })}</span>
      </div>

      {res.items.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {res.items.map((s, i) => (
            <ShopCard key={s.shopId} shop={s} t={t} href={h} priority={i < 3} />
          ))}
        </div>
      ) : (
        <div className="card mt-4">
          <EmptyState icon={<Store />} title={t('gate.noShops')} body={t('gate.noShopsSub')} />
        </div>
      )}
      {res.hasMore && (
        <div className="mt-6 text-center">
          <ButtonLink href={link({ page: String(page + 1) })} variant="outline" scroll={false}>{t('gate.loadMore')}</ButtonLink>
        </div>
      )}
    </div>
  );
}
