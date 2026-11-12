/**
 * Product tile used by every grid and carousel. Server-safe and also usable
 * inside client components (search, bought-together). Shows the second photo
 * on hover, sale / sold-out / merchant badges, rating, and a quick Add button
 * when the theme turns it on (single-variant products add straight away;
 * others open the product page).
 */
import Link from 'next/link';
import type { Lang, ProductCard as Card } from '@/lib/api';
import { href, percentOff } from '@/lib/format';
import { t } from '@/lib/i18n';
import { Img } from '../ui/Img';
import { Price } from '../ui/Price';
import { Stars } from '../ui/Stars';
import { QuickAdd } from './QuickAdd';

export function ProductCard({
  p,
  lang,
  symbol,
  quickAdd,
  priority,
  sizes,
}: {
  p: Card;
  lang: Lang;
  symbol: string;
  quickAdd: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const url = href(lang, p.url || `/products/${p.handle}`);
  const off = percentOff(p.price, p.compareAtPrice);
  const soldOut = p.availability === 'out_of_stock';
  const merchantBadges = p.badges.filter((b) => !['Sale', 'Sold out'].includes(b)).slice(0, 1);
  return (
    <div className="group card card-frame relative flex h-full flex-col">
      <Link href={url} className="img-frame block" prefetch={false}>
        {p.image ? (
          <>
            <Img src={p.image.url} alt={p.image.alt || p.title} priority={priority} sizes={sizes} className={`object-cover transition-all duration-500 ${p.secondImage ? 'group-hover:opacity-0' : 'group-hover:scale-[1.04]'}`} />
            {p.secondImage && <Img src={p.secondImage} alt="" sizes={sizes} className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
          </>
        ) : (
          <span className="absolute inset-0 grid place-items-center text-4xl font-heading text-muted/40">{p.title.slice(0, 1)}</span>
        )}
        <span className="absolute start-2 top-2 flex flex-col items-start gap-1">
          {soldOut ? (
            <span className="badge bg-fg/85 text-bg">{t(lang, 'product.soldOut')}</span>
          ) : off > 0 ? (
            <span className="badge bg-sale text-white">-{off}%</span>
          ) : null}
          {merchantBadges.map((b) => (
            <span key={b} className="badge bg-bg/95 text-fg shadow-sm">
              {b}
            </span>
          ))}
        </span>
      </Link>
      <div className="card-pad flex flex-1 flex-col gap-1 px-3 pb-3 pt-3">
        {p.brand && <span className="text-[11px] font-medium uppercase tracking-wider text-muted">{p.brand}</span>}
        <Link href={url} prefetch={false} className="line-clamp-2 text-[14px] leading-snug text-fg hover:underline md:text-[15px]">
          {p.title}
        </Link>
        {p.rating && p.rating.count > 0 && (
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <Stars value={p.rating.average} size={12} />
            <span>({p.rating.count})</span>
          </span>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <Price price={p.price} compareAt={p.compareAtPrice} priceMax={p.priceMax} symbol={symbol} size="sm" fromLabel={(x) => t(lang, 'product.from', { price: x })} />
          {quickAdd && !soldOut && <QuickAdd p={p} url={url} />}
        </div>
        {p.availability === 'backorder' && <span className="text-[12px] text-warn">{t(lang, 'product.preorder')}</span>}
      </div>
    </div>
  );
}
