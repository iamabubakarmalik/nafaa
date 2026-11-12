/** `collection_list`: collection tiles (blocks of type `collection`), as circles or tall cards. */
import Link from 'next/link';
import { api, type CollectionCard } from '@/lib/api';
import { href } from '@/lib/format';
import { collectionRef, reader, visibleBlocks } from '@/lib/settings';
import { t } from '@/lib/i18n';
import { Img } from '../ui/Img';
import { SectionHeading } from './SectionHeading';
import type { SectionProps } from './types';

export async function CollectionList({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const all = await api.collections(ctx.storeId, ctx.opts);
  const blocks = visibleBlocks(section);
  const tiles: Array<CollectionCard & { label: string; img: string | null }> = (blocks.length
    ? blocks.map((b) => {
        const br = reader(b, ctx.lang);
        const ref = collectionRef(br.text('collection'), all);
        const c = all.find((x) => x.handle === ref);
        return c ? { ...c, label: br.text('title', c.title), img: br.image('image') ?? c.image } : null;
      })
    : all.slice(0, Math.max(2, Math.min(12, r.num('columns', 6)))).map((c) => ({ ...c, label: c.title, img: c.image }))
  ).filter((x): x is CollectionCard & { label: string; img: string | null } => !!x);
  if (!tiles.length) return null;
  const shape = r.pick('shape', ['square', 'circle', 'portrait'] as const, r.raw('style') === 'circle' ? 'circle' : 'portrait');
  const style = shape === 'circle' ? 'circle' : 'card';
  const columns = Math.max(2, Math.min(6, r.num('columns', tiles.length > 4 ? tiles.length : 4)));
  return (
    <section className="section-y">
      <div className="page">
        <SectionHeading title={r.text('heading')} text={r.text('text')} />
        {style === 'circle' ? (
          <div className="snap-row -mx-4 gap-4 px-4 md:mx-0 md:grid md:gap-6 md:overflow-visible md:px-0" style={{ ['--n' as string]: tiles.length, gridTemplateColumns: 'repeat(var(--n), minmax(0, 1fr))' }}>
            {tiles.map((c) => (
              <Link key={c.id} href={href(ctx.lang, c.url)} className="group flex w-[96px] shrink-0 snap-start flex-col items-center gap-3 text-center md:w-auto">
                <span className="relative aspect-square w-full overflow-hidden rounded-full bg-surface ring-1 ring-line transition group-hover:ring-2 group-hover:ring-primary">
                  {c.img && <Img src={c.img} alt={c.label} sizes="(min-width: 768px) 15vw, 96px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                </span>
                <span className="text-[13.5px] font-medium leading-tight md:text-[15px]">{c.label}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-2 gap-3 md:gap-5 ${({ 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-3 lg:grid-cols-5', 6: 'md:grid-cols-3 lg:grid-cols-6' } as Record<number, string>)[columns]}`}>
            {tiles.map((c) => (
              <Link key={c.id} href={href(ctx.lang, c.url)} className={`group relative block overflow-hidden rounded-card bg-surface ${shape === 'square' ? 'aspect-square' : 'aspect-[3/4]'}`}>
                {c.img && <Img src={c.img} alt={c.label} sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4 text-white md:p-6">
                  <span className="h-display block font-heading text-xl font-semibold md:text-2xl">{c.label}</span>
                  <span className="mt-1 inline-block text-[13px] opacity-85 underline-offset-4 group-hover:underline">{t(ctx.lang, 'cart.items', { n: c.productCount })}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
