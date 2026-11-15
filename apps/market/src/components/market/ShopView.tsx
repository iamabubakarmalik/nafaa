'use client';
/**
 * The shop's catalogue, laid out by gate:
 *   FOOD      menu sections with a sticky section bar, row cards, options sheet
 *   GROCERY   quick basket grid with +/− steppers and a substitutes switch
 *   PHARMACY  basket grid with Rx badges
 *   SHOPPING  catalogue grid; products open the size/colour sheet
 *   BOOKING   services list with "Book" (slot picker)
 *   WHOLESALE basket grid (browse only for now)
 * A floating bar shows this shop's cart total.
 */
import { CalendarCheck, Search, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { Button, EmptyState, Price, cn } from '@/components/ui';
import { m } from '@/lib/client';
import { money } from '@/lib/format';
import type { Cart, ProductSummary, ShopDetail } from '@/lib/types';
import { BookingSheet } from './BookingSheet';
import { ProductCard } from './ProductCard';
import { ProductSheet } from './ProductSheet';

const SUB_KEY = 'nm-substitute';

export function ShopView({ shop, products }: { shop: ShopDetail; products: ProductSummary[] }) {
  const app = useApp();
  const { t } = app;
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<ProductSummary | null>(null);
  const [booking, setBooking] = useState<ProductSummary | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [substitute, setSubstitute] = useState(true);
  const nav = useRef<HTMLDivElement>(null);
  const gate = shop.gate;
  const flow = shop.flow;

  useEffect(() => {
    try {
      setSubstitute(localStorage.getItem(SUB_KEY) !== '0');
    } catch {
      // Storage blocked: keep the default.
    }
  }, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? products.filter((p) => `${p.name} ${p.category ?? ''} ${p.description ?? ''}`.toLowerCase().includes(s)) : products;
  }, [products, q]);

  const sections = useMemo(() => {
    const map = new Map<string, ProductSummary[]>();
    for (const p of list) {
      const k = p.category || t('shop.products');
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return [...map.entries()];
  }, [list, t]);

  useEffect(() => {
    if (gate === 'BOOKING' || sections.length < 2) return;
    const els = sections.map(([name]) => document.getElementById(`sec-${slug(name)}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.getAttribute('data-name'));
      },
      { rootMargin: '-140px 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections, gate]);

  useEffect(() => {
    if (!active || !nav.current) return;
    nav.current.querySelector(`[data-chip="${CSS.escape(active)}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [active]);

  const group = app.cart?.shopGroups.find((g) => g.shopId === shop.shopId);
  const closed = !shop.open || shop.paused;

  const toggleSubstitute = async (v: boolean) => {
    setSubstitute(v);
    try {
      localStorage.setItem(SUB_KEY, v ? '1' : '0');
    } catch {
      // Storage blocked: the choice still applies to this visit.
    }
    for (const l of group?.lines ?? []) {
      if (l.notes) continue;
      try {
        app.setCart(await m<Cart>(`cart/lines/${l.id}`, { method: 'PATCH', body: { options: { ...(l.options ?? {}), substitute: v } } }));
      } catch {
        // The next add carries the new choice anyway.
      }
    }
  };

  const basket = gate === 'GROCERY' || gate === 'PHARMACY' || gate === 'WHOLESALE';
  const needsSheet = gate === 'SHOPPING' && !!flow.sizeColour;
  const extra = flow.substitutes ? { substitute } : undefined;

  if (!products.length) {
    return (
      <div className="card mt-6">
        <EmptyState icon={<ShoppingBag />} title={t('shop.noProducts')} body={t('shop.noProductsSub')} />
      </div>
    );
  }

  return (
    <div className="mt-6">
      {(closed || shop.paused) && (
        <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
          {shop.paused ? t('shop.pausedBanner') : flow.deliverySlots ? t('shop.closedSlots', { shop: shop.name }) : t('shop.closedBanner', { shop: shop.name })}
        </p>
      )}

      <div className="sticky top-16 z-30 -mx-4 border-b border-shell-line bg-shell-canvas/95 px-4 pb-2 pt-2 backdrop-blur md:-mx-6 md:px-6">
        <label className="flex h-11 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-brand-500">
          <Search className="h-4 w-4 text-gray-500" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('shop.searchIn', { shop: shop.name })} aria-label={t('shop.searchIn', { shop: shop.name })} className="h-full w-full bg-transparent text-sm focus:outline-none" />
        </label>
        {gate !== 'BOOKING' && sections.length > 1 && (
          <div ref={nav} className="scroll-x mt-2">
            {sections.map(([name, items]) => (
              <a
                key={name}
                data-chip={name}
                href={`#sec-${slug(name)}`}
                className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition', active === name ? 'bg-brand-600 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200')}
              >
                {name} <span className="num opacity-60">{items.length}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {basket && flow.substitutes && (
        <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white p-3 text-sm shadow-card ring-1 ring-gray-200">
          <span>
            <span className="block font-semibold text-gray-900">{t('shop.substituteShort')}</span>
            <span className="block text-xs text-gray-500">{t('shop.substitute')}</span>
          </span>
          <input type="checkbox" role="switch" checked={substitute} onChange={(e) => toggleSubstitute(e.target.checked)} className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-gray-300 transition before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-brand-600 checked:before:translate-x-5 rtl:checked:before:-translate-x-5" />
        </label>
      )}

      {sections.map(([name, items]) => (
        <section key={name} id={`sec-${slug(name)}`} data-name={name} className="scroll-mt-40 pt-6">
          <h2 className="mb-2 text-lg font-bold text-gray-900">{name}</h2>
          {gate === 'BOOKING' ? (
            <ul className="card divide-y divide-gray-100">
              {items.map((p) => (
                <li key={p.productId} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <Link href={app.href(`/p/${p.productId}`)} className="font-semibold text-gray-900 hover:text-brand-700">{p.name}</Link>
                    {p.description && <p className="line-clamp-2 text-xs text-gray-500">{p.description}</p>}
                    <Price value={p.price} className="mt-1" />
                  </div>
                  <Button size="sm" disabled={shop.paused} icon={<CalendarCheck className="h-4 w-4" />} onClick={() => app.requireSignIn() && setBooking(p)}>
                    {t('shop.book')}
                  </Button>
                </li>
              ))}
            </ul>
          ) : gate === 'FOOD' ? (
            <div className="card divide-y divide-gray-100 px-4">
              {items.map((p) => (
                <ProductCard key={p.productId} product={p} gate={gate} layout="row" onOpen={setOpen} needsOptions={!!flow.modifiers} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {items.map((p) => (
                <ProductCard key={p.productId} product={p} gate={gate} onOpen={setOpen} needsOptions={needsSheet} extraOptions={extra} />
              ))}
            </div>
          )}
        </section>
      ))}
      {!list.length && <p className="py-10 text-center text-sm text-gray-500">{t('search.noResults', { q })}</p>}

      {group && group.itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(var(--bottom-nav)+0.75rem)] z-30 px-4">
          <Link href={app.href('/cart')} className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl bg-brand-600 px-4 py-3 text-white shadow-brand-lg">
            <span className="num grid h-8 min-w-8 place-items-center rounded-lg bg-white/20 px-2 text-sm font-bold">{group.itemCount}</span>
            <span className="flex-1 text-sm font-bold">{t('common.viewCart')}</span>
            <span className="text-end">
              <span className="num block text-sm font-bold">{money(group.subtotal)}</span>
              {!group.meetsMinOrder && <span className="block text-2xs text-white/80">{t('shop.minNote', { amount: money(group.minOrderAmount) })}</span>}
            </span>
          </Link>
        </div>
      )}

      <ProductSheet product={open} gate={gate} flow={flow} onClose={() => setOpen(null)} />
      {gate === 'BOOKING' && <BookingSheet service={booking} shopId={shop.shopId} onClose={() => setBooking(null)} />}
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-|-$/g, '') || 'items';
}
