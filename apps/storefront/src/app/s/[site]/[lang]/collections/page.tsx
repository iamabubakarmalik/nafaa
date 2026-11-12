import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { href } from '@/lib/format';
import { t } from '@/lib/i18n';
import { meta } from '@/lib/seo';
import { site, type SiteParams } from '@/lib/store';
import { Img } from '@/components/ui/Img';

type Props = { params: Promise<SiteParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await site(params);
  return meta(ctx, { title: t(ctx.lang, 'collection.allCollections'), path: '/collections' });
}

export default async function Collections({ params }: Props) {
  const ctx = await site(params);
  if (ctx.blocked) return null;
  const list = await api.collections(ctx.storeId, ctx.opts);
  return (
    <section className="page pb-20 pt-10">
      <h1 className="h-display mb-8 text-3xl font-semibold md:text-[2.6rem]">{t(ctx.lang, 'collection.allCollections')}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        <Link href={href(ctx.lang, '/collections/all')} className="group relative grid aspect-[3/4] place-items-center overflow-hidden rounded-card bg-primary text-primary-fg">
          <span className="h-display font-heading text-xl font-semibold md:text-2xl">{t(ctx.lang, 'collection.all')}</span>
        </Link>
        {list.map((c) => (
          <Link key={c.id} href={href(ctx.lang, c.url)} className="group relative block aspect-[3/4] overflow-hidden rounded-card bg-surface">
            {c.image && <Img src={c.image} alt={c.title} sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-4 text-white">
              <span className="h-display block font-heading text-lg font-semibold md:text-xl">{c.title}</span>
              <span className="text-[13px] opacity-85">{t(ctx.lang, 'cart.items', { n: c.productCount })}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
