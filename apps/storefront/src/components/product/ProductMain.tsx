'use client';

/**
 * The product page's main area (section `main_product`): gallery plus the
 * merchant's ordered blocks (title, price, variant picker, stock, quantity,
 * buttons, WhatsApp order, delivery, description, tabs, size chart, share,
 * trust icons, custom text). Holds the selected variant, so price, stock and
 * photo follow the shopper's choice. A slim add-to-cart bar sticks to the
 * bottom on phones once the main button scrolls away.
 */
import { useRouter } from 'next/navigation';
import { BadgeCheck, Banknote, Check, ChevronDown, Link2, Minus, Plus, RotateCcw, Ruler, Share2, Truck, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Block, ProductDetail, ProductVariant } from '@/lib/api';
import { percentOff, waLink } from '@/lib/format';
import { track } from '@/lib/client/track';
import { t as enText, type MessageKey } from '@/lib/i18n';
import { useStore } from '../providers/StoreProvider';
import { Price } from '../ui/Price';
import { Stars } from '../ui/Stars';
import { WhatsAppIcon } from '../ui/brand-icons';
import { DeliveryEta } from './DeliveryEta';
import { Gallery } from './Gallery';

const COLOR_NAME = /colou?r|shade|rang/i;
const SIZE_NAME = /size|saiz|naap/i;

function findVariant(p: ProductDetail, sel: Record<string, string>): ProductVariant | null {
  return p.variants.find((v) => p.options.every((o) => v.options[o.name] === sel[o.name])) ?? null;
}

function initialSelection(p: ProductDetail): Record<string, string> {
  const v = p.variants.find((x) => x.availability !== 'out_of_stock') ?? p.variants[0];
  if (v) return { ...v.options };
  return Object.fromEntries(p.options.map((o) => [o.name, o.values[0]?.value ?? '']));
}

export function ProductMain({
  product: p,
  blocks,
  galleryLayout,
  zoom,
  stickyInfo = true,
  variantStyle = 'buttons',
  url,
}: {
  product: ProductDetail;
  blocks: Block[];
  galleryLayout: 'thumbnails' | 'grid' | 'slider';
  zoom: boolean;
  stickyInfo?: boolean;
  variantStyle?: 'buttons' | 'dropdown' | 'swatches';
  url: string;
}) {
  const { t, money, add, busy, shop, href, error } = useStore();
  const router = useRouter();
  const [sel, setSel] = useState<Record<string, string>>(() => initialSelection(p));
  const [qty, setQty] = useState(1);
  const [chart, setChart] = useState(false);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);

  const variant = p.options.length ? findVariant(p, sel) : p.variants[0] ?? null;
  const price = variant?.price ?? p.price;
  const compareAt = variant?.compareAtPrice ?? p.compareAtPrice;
  const availability = variant?.availability ?? p.availability;
  const soldOut = !variant || availability === 'out_of_stock';
  const max = variant && variant.maxQty > 0 ? variant.maxQty : 99;
  const leadTime = variant?.leadTime ?? p.leadTime;

  const images = useMemo(() => {
    const list = p.images.length ? p.images.map((i) => ({ url: i.url, alt: i.alt || p.title })) : p.image ? [{ url: p.image.url, alt: p.title }] : [];
    return list;
  }, [p]);
  const focus = useMemo(() => {
    if (!variant) return -1;
    const byId = variant.id ? p.images.findIndex((i) => i.variantIds.includes(variant.id!)) : -1;
    if (byId >= 0) return byId;
    return variant.image ? p.images.findIndex((i) => i.url === variant.image) : -1;
  }, [variant, p.images]);

  useEffect(() => {
    track('product_view', { productId: p.id, value: p.price, name: p.title });
  }, [p.id, p.price, p.title]);

  useEffect(() => {
    const onScroll = () => {
      const el = buyRef.current;
      setShowBar(!!el && el.getBoundingClientRect().bottom < 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('nf-bar', showBar && !soldOut);
    return () => document.body.classList.remove('nf-bar');
  }, [showBar, soldOut]);

  const isAvailable = (optName: string, value: string) => p.variants.some((v) => v.options[optName] === value && v.availability !== 'out_of_stock' && Object.entries(sel).every(([k, val]) => k === optName || v.options[k] === val));

  const doAdd = async (buyNow: boolean) => {
    if (soldOut || !variant) return;
    const c = await add({ productId: p.id, variantId: variant.id, quantity: qty, title: p.title, price }, { open: !buyNow });
    if (c && buyNow) router.push(href('/checkout'));
    if (c && !buyNow) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    }
  };

  const has = (type: string) => blocks.some((b) => b.type === type);
  const variantLabel = variant && variant.id ? ` (${variant.title})` : '';
  const waMsg = t('product.whatsappMsg', { title: p.title, variant: variantLabel, qty, url });
  const waUrl = waLink(shop.whatsapp, waMsg);
  const off = percentOff(price, compareAt);

  /** A block's button label: the merchant's text, else the built-in one in the page language (also when the theme kept the English default). */
  const label = (v: unknown, key: MessageKey) => {
    const text = typeof v === 'string' ? v : v && typeof v === 'object' ? ((v as Record<string, string>)[shop.lang] || (v as Record<string, string>).en || '') : '';
    return !text || text === enText('en', key) ? t(key) : text;
  };

  const render = (b: Block) => {
    const st = b.settings ?? {};
    switch (b.type) {
      case 'title':
        return (
          <div key={b.id}>
            {p.brand && <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">{p.brand}</p>}
            <h1 className="h-display font-heading text-[1.65rem] font-semibold leading-tight md:text-[2.1rem]">{p.title}</h1>
            {p.rating && p.rating.count > 0 && (
              <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-[13.5px] text-muted hover:text-fg">
                <Stars value={p.rating.average} size={15} />
                <span>
                  {p.rating.average.toFixed(1)} · {t('product.reviewsCount', { n: p.rating.count })}
                </span>
              </a>
            )}
          </div>
        );
      case 'price':
        return (
          <div key={b.id} className="flex flex-wrap items-center gap-3">
            <Price price={price} compareAt={compareAt} symbol={shop.symbol} size="lg" />
            {off > 0 && compareAt && st.showSaving !== false && <span className="text-[13px] font-medium text-sale">{t('product.save', { amount: money(compareAt - price) })}</span>}
          </div>
        );
      case 'badges':
        return p.badges.filter((x) => x !== 'Sale' && x !== 'Sold out').length ? (
          <div key={b.id} className="flex flex-wrap gap-1.5">
            {p.badges
              .filter((x) => x !== 'Sale' && x !== 'Sold out')
              .map((x) => (
                <span key={x} className="badge bg-accent/15 text-fg">
                  {x}
                </span>
              ))}
          </div>
        ) : null;
      case 'variant_picker':
        return p.options.length ? (
          <div key={b.id} className="space-y-5">
            {p.options.map((o) => {
              const isColor = (COLOR_NAME.test(o.name) || o.values.some((v) => v.swatch)) && variantStyle !== 'dropdown';
              if (variantStyle === 'dropdown') {
                return (
                  <label key={o.name} className="block">
                    <span className="mb-2 block text-[14px] font-semibold">{o.name}</span>
                    <select className="field" value={sel[o.name]} onChange={(e) => setSel({ ...sel, [o.name]: e.target.value })}>
                      {o.values.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.value}
                          {isAvailable(o.name, v.value) ? '' : ` (${t('product.soldOut')})`}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }
              return (
                <fieldset key={o.name}>
                  <legend className="mb-2.5 flex w-full items-center justify-between text-[14px]">
                    <span>
                      <span className="font-semibold">{o.name}:</span> <span className="text-muted">{sel[o.name]}</span>
                    </span>
                    {SIZE_NAME.test(o.name) && p.sizeChart && !has('size_chart') && (
                      <button type="button" onClick={() => setChart(true)} className="inline-flex items-center gap-1 text-[13px] underline underline-offset-2">
                        <Ruler size={14} /> {t('product.sizeChart')}
                      </button>
                    )}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {o.values.map((v) => {
                      const on = sel[o.name] === v.value;
                      const ok = isAvailable(o.name, v.value);
                      return isColor && v.swatch ? (
                        <button
                          key={v.value}
                          type="button"
                          title={v.value}
                          aria-label={v.value}
                          aria-pressed={on}
                          onClick={() => setSel({ ...sel, [o.name]: v.value })}
                          className={`relative h-10 w-10 rounded-full ring-offset-2 ring-offset-bg transition ${on ? 'ring-2 ring-fg' : 'ring-1 ring-line hover:ring-fg/40'}`}
                        >
                          <span className="absolute inset-[3px] rounded-full border border-black/10" style={v.swatch.startsWith('http') ? { backgroundImage: `url(${v.swatch})`, backgroundSize: 'cover' } : { background: v.swatch }} />
                          {!ok && <span className="absolute inset-0 m-auto h-[2px] w-full rotate-45 bg-fg/50" />}
                        </button>
                      ) : (
                        <button
                          key={v.value}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setSel({ ...sel, [o.name]: v.value })}
                          className={`min-h-[44px] min-w-[52px] rounded-btn border px-4 text-[14px] font-medium transition ${on ? 'border-fg bg-fg text-bg' : 'border-line hover:border-fg/50'} ${ok ? '' : 'text-muted line-through decoration-1'}`}
                        >
                          {v.value}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        ) : null;
      case 'stock_message':
        return (
          <p key={b.id} className="flex items-center gap-2 text-[14px] font-medium">
            {soldOut ? (
              <>
                <span className="h-2 w-2 rounded-full bg-sale" />
                <span className="text-sale">{t('product.outOfStock')}</span>
              </>
            ) : availability === 'backorder' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-warn" />
                <span className="text-warn">{leadTime || t('product.backorder')}</span>
              </>
            ) : variant && variant.maxQty > 0 && variant.maxQty <= (typeof st.lowStock === 'number' ? st.lowStock : 5) ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warn opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-warn" />
                </span>
                <span className="text-warn">{t('product.lowStock', { n: variant.maxQty })}</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-ok" />
                <span className="text-ok">{t('product.inStock')}</span>
              </>
            )}
          </p>
        );
      case 'quantity':
        return soldOut ? null : (
          <div key={b.id} className="flex items-center gap-4">
            <span className="text-[14px] font-semibold">{t('product.quantity')}</span>
            <div className="inline-flex h-12 items-center rounded-btn border border-line">
              <button type="button" aria-label="-" className="grid h-12 w-12 place-items-center disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>
                <Minus size={16} />
              </button>
              <span className="w-10 text-center text-[16px] font-semibold tabular-nums">{qty}</span>
              <button type="button" aria-label="+" className="grid h-12 w-12 place-items-center disabled:opacity-30" disabled={qty >= max} onClick={() => setQty(qty + 1)}>
                <Plus size={16} />
              </button>
            </div>
          </div>
        );
      case 'buy_buttons': {
        const showBuyNow = st.showBuyNow !== false;
        return (
          <div key={b.id} ref={buyRef} className="space-y-2.5">
            {soldOut ? (
              <button type="button" className="btn btn-lg btn-block bg-fg/10 text-muted" disabled>
                {t('product.soldOut')}
              </button>
            ) : (
              <>
                <button type="button" className={`btn btn-lg btn-block ${showBuyNow ? 'btn-outline' : 'btn-primary'}`} disabled={busy} onClick={() => doAdd(false)}>
                  {added ? <Check size={18} /> : null}
                  {added ? t('product.added') : availability === 'backorder' ? t('product.preorder') : t('product.addToCart')}
                </button>
                {showBuyNow && (
                  <button type="button" className="btn btn-lg btn-primary btn-block" disabled={busy} onClick={() => doAdd(true)}>
                    {t('product.buyNow')}
                  </button>
                )}
              </>
            )}
            {error && <p className="text-[13px] text-sale">{error}</p>}
          </div>
        );
      }
      case 'whatsapp_order':
        return waUrl ? (
          <a key={b.id} href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-lg btn-wa btn-block">
            <WhatsAppIcon size={20} /> {label(st.label, 'product.whatsapp')}
          </a>
        ) : null;
      case 'delivery_eta':
        return <DeliveryEta key={b.id} price={price * qty} />;
      case 'trust_icons':
        return (
          <ul key={b.id} className="grid grid-cols-3 gap-2 text-center text-[12px] leading-tight text-muted">
            {(
              [
                st.cod !== false && [Banknote, t('trust.cod')],
                st.delivery !== false && [Truck, t('trust.delivery')],
                st.returns !== false && [availability === 'backorder' ? BadgeCheck : RotateCcw, availability === 'backorder' ? t('trust.original') : t('trust.returns')],
              ].filter(Boolean) as Array<[typeof Truck, string]>
            ).map(([Icon, label], k) => {
              const I = Icon as typeof Truck;
              return (
                <li key={k} className="flex flex-col items-center gap-1.5 rounded-card bg-surface px-2 py-3">
                  <I size={20} className="text-fg" />
                  <span>{label as string}</span>
                </li>
              );
            })}
          </ul>
        );
      case 'description':
        return p.description ? (
          <details key={b.id} className="group border-t border-line" open={st.collapsed !== true && st.open !== false}>
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
              {t('product.description')}
              <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="rte pb-5 text-[15px]" dangerouslySetInnerHTML={{ __html: p.description }} />
          </details>
        ) : null;
      case 'tabs': {
        const tabs = [
          ...(!has('description') && p.description ? [{ title: t('product.description'), html: p.description }] : []),
          ...p.tabs,
          ...(!has('size_chart') && p.sizeChart && !p.options.some((o) => SIZE_NAME.test(o.name)) ? [{ title: p.sizeChart.title || t('product.sizeChart'), html: p.sizeChart.html }] : []),
        ];
        if (!tabs.length) return null;
        return (
          <div key={b.id} className="border-b border-line">
            {tabs.map((tab, k) => (
              <details key={k} className="group border-t border-line" open={k === 0 && !has('description')}>
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {tab.title}
                  <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="rte pb-5 text-[15px]" dangerouslySetInnerHTML={{ __html: tab.html }} />
              </details>
            ))}
          </div>
        );
      }
      case 'size_chart':
        return p.sizeChart ? (
          <button key={b.id} type="button" onClick={() => setChart(true)} className="inline-flex items-center gap-1.5 text-[14px] font-medium underline underline-offset-4">
            <Ruler size={16} /> {typeof st.label === 'string' && st.label ? st.label : p.sizeChart.title || t('product.sizeChart')}
          </button>
        ) : null;
      case 'share':
        return (
          <div key={b.id} className="flex items-center gap-2 text-[13px]">
            <span className="flex items-center gap-1.5 font-medium text-muted">
              <Share2 size={15} /> {t('product.share')}
            </span>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${p.title} ${url}`)}`} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-surface hover:bg-line" aria-label="WhatsApp">
              <WhatsAppIcon size={16} />
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-surface text-[13px] font-bold hover:bg-line" aria-label="Facebook">
              f
            </a>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full bg-surface hover:bg-line"
              aria-label="Copy link"
              onClick={() => {
                navigator.clipboard?.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? <Check size={15} /> : <Link2 size={15} />}
            </button>
          </div>
        );
      case 'custom_text': {
        const text = typeof st.text === 'string' ? st.text : typeof st.text === 'object' && st.text ? String((st.text as Record<string, string>)[shop.lang] ?? (st.text as Record<string, string>).en ?? '') : '';
        return text ? <div key={b.id} className="rte text-[14px]" dangerouslySetInnerHTML={{ __html: text }} /> : null;
      }
      default:
        return null;
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
      <div className={stickyInfo ? '' : 'lg:sticky lg:top-24 lg:self-start'}>
        <Gallery images={images} focus={focus} zoom={zoom} layout={galleryLayout === 'grid' ? 'grid' : 'thumbs'} />
      </div>
      <div className={`flex flex-col gap-5 ${stickyInfo ? 'lg:sticky lg:top-24 lg:self-start' : ''}`}>{blocks.filter((b) => !b.hidden).map(render)}</div>

      {chart && p.sizeChart && (
        <div className="fixed inset-0 z-[90] grid place-items-end md:place-items-center" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close" className="absolute inset-0 animate-fade-in bg-black/50" onClick={() => setChart(false)} />
          <div className="relative max-h-[85vh] w-full animate-rise overflow-y-auto rounded-t-card bg-bg p-5 shadow-pop md:max-w-xl md:rounded-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{p.sizeChart.title || t('product.sizeChart')}</h2>
              <button type="button" className="icon-btn -me-2" onClick={() => setChart(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="rte" dangerouslySetInnerHTML={{ __html: p.sizeChart.html }} />
          </div>
        </div>
      )}

      {!soldOut && (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur transition-transform duration-300 md:hidden ${showBar ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{p.title}</p>
              <p className="text-[15px] font-semibold">{money(price)}</p>
            </div>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => doAdd(false)}>
              {t('product.addToCart')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
