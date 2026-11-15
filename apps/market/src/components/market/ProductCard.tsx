'use client';
/**
 * Product card used in grids and carousels. Simple products get an inline
 * +/− stepper; products with sizes, colours, add-ons or forms open the
 * product sheet instead (onOpen) or link to the product page.
 */
import { Heart, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/providers/AppProvider';
import { Badge, Img, Price, Stepper, cn } from '@/components/ui';
import { isSignedIn } from '@/lib/client';
import { GATE_LOOK } from '@/lib/site';
import type { Gate, ProductSummary } from '@/lib/types';
import { GateIcon } from './GateIcon';
import { useCart } from './useCart';

interface Props {
  product: ProductSummary;
  gate?: Gate;
  /** Open the options sheet instead of adding straight away. */
  onOpen?: (p: ProductSummary) => void;
  needsOptions?: boolean;
  extraOptions?: Record<string, unknown>;
  layout?: 'grid' | 'row';
  showShop?: boolean;
  className?: string;
}

export function ProductCard({ product: p, gate = 'SHOPPING', onOpen, needsOptions, extraOptions, layout = 'grid', showShop, className }: Props) {
  const { t, href } = useApp();
  const cart = useCart();
  const router = useRouter();
  const line = cart.lineFor(p.productId);
  const qty = line?.quantity ?? 0;
  const color = GATE_LOOK[gate]?.color;
  const out = !p.inStock || p.maxQty <= 0;
  const options = needsOptions || p.priceMax > p.price;

  const control = out ? (
    <Badge tone="gray" className="shadow-card">{t('common.outOfStock')}</Badge>
  ) : options ? (
    onOpen ? (
      <Stepper value={0} onChange={() => onOpen(p)} addLabel={t('common.add')} size="sm" />
    ) : (
      <Link href={href(`/p/${p.productId}`)} className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-xs font-bold text-brand-700 shadow-card ring-1 ring-brand-200 hover:bg-brand-50">
        <Plus className="h-4 w-4" aria-hidden />
        {t('common.add')}
      </Link>
    )
  ) : (
    <Stepper
      value={qty}
      max={p.maxQty}
      busy={cart.busy === p.productId}
      size="sm"
      trashAtOne
      addLabel={t('common.add')}
      onChange={async (v) => {
        if (line) return void cart.setQty(line, v);
        // Lists do not carry sizes or add-ons; when the shop needs a choice, the product page asks for it.
        const ok = await cart.add({ productId: p.productId, quantity: v, options: extraOptions }, { silent: true });
        if (!ok && !onOpen && isSignedIn()) router.push(href(`/p/${p.productId}`));
      }}
    />
  );

  const image = (
    <Img src={p.image} alt={p.name} color={color} className={cn(layout === 'row' ? 'h-24 w-24 shrink-0 rounded-xl md:h-28 md:w-28' : 'aspect-square rounded-xl', out && 'opacity-60')} fallback={<GateIcon gate={gate} className="h-8 w-8 opacity-50" />} />
  );

  const info = (
    <>
      <div className="flex flex-wrap items-center gap-1">
        {p.requiresPrescription && <Badge tone="red">{t('common.rx')}</Badge>}
        {p.compareAt && p.compareAt > p.price && <Badge tone="amber">-{Math.round((1 - p.price / p.compareAt) * 100)}%</Badge>}
      </div>
      <Link href={href(`/p/${p.productId}`)} className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 hover:text-brand-700">
        {p.name}
      </Link>
      {layout === 'row' && p.description && <p className="line-clamp-2 text-xs text-gray-500">{p.description}</p>}
      {showShop && p.shop && <p className="line-clamp-1 text-2xs text-gray-500">{p.shop.name}</p>}
    </>
  );

  if (layout === 'row') {
    return (
      <div className={cn('flex gap-3 py-3', className)}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {info}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <Price value={p.price} compareAt={p.compareAt} max={p.priceMax} />
          </div>
        </div>
        <div className="relative">
          <button type="button" onClick={() => onOpen?.(p)} className="block" aria-label={p.name}>{image}</button>
          <div className="absolute -bottom-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">{control}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('card relative flex flex-col p-2', className)}>
      <div className="relative">
        {onOpen ? <button type="button" onClick={() => onOpen(p)} className="block w-full" aria-label={p.name}>{image}</button> : <Link href={href(`/p/${p.productId}`)} aria-label={p.name}>{image}</Link>}
        <div className="absolute bottom-1.5 end-1.5">{control}</div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1 pt-2">
        <Price value={p.price} compareAt={p.compareAt} max={p.priceMax} />
        {info}
      </div>
    </div>
  );
}

export function WishButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-card ring-1 ring-gray-200 hover:bg-white">
      <Heart className={cn('h-5 w-5', active ? 'fill-red-500 text-red-500' : 'text-gray-600')} />
    </button>
  );
}
