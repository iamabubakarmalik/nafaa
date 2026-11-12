/**
 * The products grid: one row per Nafaa product (sizes fold out), one column
 * per channel. The header and the product column stay put while the table
 * scrolls both ways. A channel cell shows the sync dot, the channel price
 * (own price marked, sale price struck), the stock sent and the Listed
 * switch; price and stock change in place. Not linked = an empty cell with
 * "Link" on hover. A Nafaa website column is always linked: it shows the
 * Nafaa price and stock read-only and a "show on website" switch per product.
 * ↑ ↓ move between rows, Enter opens the product panel.
 * On phones each product is a card with its channels listed inside.
 */

import { memo, type KeyboardEvent, type ReactNode } from 'react';
import { AlertTriangle, ChevronRight, Link2, Package } from 'lucide-react';
import { Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { isStoreCell, isStoreChannel, type GridCell, type GridItem, type GridRow, type LinkedCell, type OnlineChannel, type StoreCell } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { ChannelMark, channelName, lastPushText, rs } from './meta';
import { InlineEdit } from './InlineEdit';
import { causeInfo, causeShort, syncCause } from './syncErrors';
import { HoldTag } from './StockHold';
import { priceHoldNumbers } from './PriceHold';

export interface GridHandlers {
  onPick: (productId: string) => void;
  onOpen: (item: GridItem, channelId?: string) => void;
  onToggle: (productId: string) => void;
  onLink: (c: OnlineChannel, item: GridItem, row: GridRow) => void;
  onListed: (mappingId: string, listed: boolean) => void;
  onSizeLess: (mappingId: string, c: OnlineChannel) => void;
  /** Nafaa website column: show or hide the product on the website. */
  onWebsite: (c: OnlineChannel, productId: string, visible: boolean) => void;
}

const isSized = (item: GridItem) => item.hasVariants && item.rows.some((r) => r.variantId);
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/** ↑ ↓ between rows, Enter opens the panel. */
function rowKeys(e: KeyboardEvent<HTMLElement>, open: () => void) {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter') { e.preventDefault(); open(); return; }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const rows = [...document.querySelectorAll<HTMLElement>('[data-op-row]')].filter((el) => el.offsetParent !== null);
  const i = rows.indexOf(e.currentTarget);
  rows[e.key === 'ArrowDown' ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1)]?.focus();
}

/* ─── Small parts ─── */

export function Thumb({ src, size = 'md' }: { src: string | null; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80',
      size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-12 w-12 rounded-xl' : 'h-9 w-9')}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-4 w-4 text-slate-400" />}
    </span>
  );
}

/** Sync state of a linked cell: green synced, amber waiting or held, red failed, grey off or not pushed. */
export function dotOf(c: OnlineChannel, cell: LinkedCell): { cls: string; label: string } {
  // A held link sends nothing, whatever its last push said.
  if (cell.hold) return { cls: 'bg-amber-500', label: t('Stock milana baqi') };
  if (cell.priceHold) return { cls: 'bg-amber-500', label: t('Qeemat ka faisla baqi') };
  if (cell.listed === false) return { cls: 'bg-slate-300', label: t('Band (unlisted)') };
  if (!c.canPush || cell.status === null) return { cls: 'bg-slate-300', label: c.mode === 'website' ? t('Website khud leti hai') : t('Kuch nahi bheja jata') };
  if (cell.status === 'FAILED') return { cls: 'bg-rose-500', label: causeInfo(syncCause(cell.error)).title };
  if (cell.status === 'SUCCESS') return { cls: 'bg-success-500', label: t('Channel par barabar') };
  return { cls: 'bg-amber-400', label: t('Bhejna baqi') };
}

/** The channel does not count stock for this item (Shopify "Track quantity" off) and the user has not asked Nafaa to start. */
export const notCounted = (cell: LinkedCell) => cell.tracksStock === false && !cell.countOptIn;

/** Blue tag for an item the channel does not count: it sells without a number, so it is not out of stock. */
export function UntrackedTag({ long }: { long?: boolean }) {
  return (
    <span title={t('Channel ginti nahi karta')}
      className="inline-flex shrink-0 items-center rounded bg-sky-50 px-1 text-[0.65625rem] font-semibold leading-4 text-sky-800 ring-1 ring-sky-200">
      {long ? t('Channel ginti nahi karta') : t('Ginti nahi')}
    </span>
  );
}

export function Dot({ cls, label }: { cls: string; label: string }) {
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', cls)} title={label} aria-label={label} role="img" />;
}

/** Price, sale price and stock of one linked cell, with in-place edits. */
function CellBody({ c, cell, canManage, compact }: { c: OnlineChannel; cell: LinkedCell; canManage: boolean; compact?: boolean }) {
  const off = cell.listed === false;
  const failed = cell.status === 'FAILED';
  const dot = dotOf(c, cell);
  const push = lastPushText(cell.lastPush);
  const priceEdit = canManage && c.canPush && c.pushPrice;
  const stockEdit = canManage && c.canPush && c.tracksStock;
  const ruleStock = cell.allocQty !== null && cell.allocQty !== undefined;
  return (
    <span className="flex min-w-0 flex-1 items-start gap-2" title={[dot.label, push].filter(Boolean).join(' · ')}>
      <span className="mt-[0.4rem]"><Dot {...dot} /></span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-baseline gap-1.5">
          <InlineEdit mappingId={cell.mappingId} field="priceOverride" value={cell.override} disabled={!priceEdit}
            label={t('{{channel}} par Price', { channel: channelName(c) })} ruleHint={t('Rule: {{price}}', { price: rs(cell.price) })}
            className={cn('text-[0.8125rem] font-semibold tabular-nums', off ? 'text-slate-400' : cell.priceDiffers ? 'text-amber-700' : 'text-slate-900')}>
            {rs(cell.price)}
          </InlineEdit>
          {cell.override ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" title={t('Apni Price (rule nahi)')} /> : null}
          {cell.compareAtPrice ? <span className="text-[0.6875rem] tabular-nums text-slate-400 line-through">{rs(cell.compareAtPrice).replace('Rs ', '')}</span> : null}
          {cell.priceHold ? <span className="shrink-0 rounded bg-amber-50 px-1 text-[0.65625rem] font-semibold leading-4 text-amber-800 ring-1 ring-amber-200" title={`${t('Qeemat ka faisla baqi')} · ${priceHoldNumbers(cell.priceHold)}`}>{t('Faisla baqi')}</span> : null}
          {cell.priceDiffers && cell.channelPrice !== null && !compact && !cell.priceHold ? <span className="truncate text-[0.6875rem] text-amber-700" title={t('Channel par abhi {{price}}', { price: rs(cell.channelPrice) })}>≠ {rs(cell.channelPrice).replace('Rs ', '')}</span> : null}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[0.71875rem] text-slate-500">
          {failed ? <span className="inline-flex items-center gap-1 font-semibold text-rose-700"><AlertTriangle className="h-3 w-3" />{causeShort(syncCause(cell.error))}</span>
            : cell.hold ? <HoldTag hold={cell.hold} compact />
            : off ? <span className="font-semibold text-slate-400">{t('Band')}</span>
            : c.tracksStock && notCounted(cell) ? <UntrackedTag />
              : !c.tracksStock ? <span>{t('Stock track nahi')}</span>
                : <>
                  <InlineEdit mappingId={cell.mappingId} field="allocQty" value={cell.allocQty} disabled={!stockEdit}
                    label={t('{{channel}} ko kitna Stock', { channel: channelName(c) })} ruleHint={t('Rule: {{qty}}', { qty: cell.stock ?? 0 })}
                    className={cn('font-semibold', (cell.stock ?? 0) <= 0 ? 'text-rose-600' : 'text-slate-700')}>
                    {t('Stock {{qty}}', { qty: cell.stock ?? '—' })}
                  </InlineEdit>
                  {ruleStock && <span className="rounded bg-brand-50 px-1 text-[0.625rem] font-semibold text-brand-700">{t('fixed')}</span>}
                  {!compact && cell.status === 'SUCCESS' && cell.lastSyncedAt ? <span className="truncate text-slate-400">· {timeAgo(cell.lastSyncedAt)}</span> : null}
                </>}
        </span>
      </span>
    </span>
  );
}

function ListedSwitch({ c, cell, canManage, onListed }: { c: OnlineChannel; cell: LinkedCell; canManage: boolean; onListed: GridHandlers['onListed'] }) {
  if (!c.canPush) return null;
  const off = cell.listed === false;
  return (
    <span onClick={stop} className="shrink-0">
      <Switch size="sm" checked={!off} disabled={!canManage} onChange={(e) => onListed(cell.mappingId, e.target.checked)}
        aria-label={off ? t('{{channelName}} par Listed karein', { channelName: channelName(c) }) : t('{{channelName}} par band karein', { channelName: channelName(c) })} />
    </span>
  );
}

/* ─── Nafaa website cells ─── */

export function storeDot(c: OnlineChannel, visible: boolean): { cls: string; label: string } {
  if (!visible) return { cls: 'bg-slate-300', label: t('Website par chhupa hai') };
  if (!c.live) return { cls: 'bg-amber-400', label: t('Website abhi live nahi') };
  return { cls: 'bg-success-500', label: t('Website par dikh raha hai') };
}

/** Price and stock on the Nafaa website: read-only, straight from Nafaa. */
function StoreCellBody({ c, cell, showDot = true }: { c: OnlineChannel; cell: StoreCell; showDot?: boolean }) {
  const dot = storeDot(c, cell.visible);
  const off = !cell.visible;
  return (
    <span className="flex min-w-0 flex-1 items-start gap-2" title={`${dot.label} · ${t('Price aur Stock Nafaa se')}`}>
      {showDot && <span className="mt-[0.4rem]"><Dot {...dot} /></span>}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-baseline gap-1.5">
          <span className={cn('text-[0.8125rem] font-semibold tabular-nums', off ? 'text-slate-400' : 'text-slate-900')}>{rs(cell.price)}</span>
          {cell.compareAtPrice ? <span className="text-[0.6875rem] tabular-nums text-slate-400 line-through">{rs(cell.compareAtPrice).replace('Rs ', '')}</span> : null}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[0.71875rem] text-slate-500">
          {off ? <span className="font-semibold text-slate-400">{t('Chhupa')}</span>
            : <span className={cn('font-semibold', cell.stock <= 0 && !cell.backorderOn ? 'text-rose-600' : 'text-slate-700')}>{t('Stock {{qty}}', { qty: cell.stock })}</span>}
        </span>
      </span>
    </span>
  );
}

/** "Show on website" for one product (sizes follow the product). */
function WebsiteSwitch({ c, productId, visible, canManage, onWebsite }: { c: OnlineChannel; productId: string; visible: boolean; canManage: boolean; onWebsite: GridHandlers['onWebsite'] }) {
  return (
    <span onClick={stop} className="shrink-0">
      <Switch size="sm" checked={visible} disabled={!canManage} onChange={(e) => onWebsite(c, productId, e.target.checked)}
        aria-label={visible ? t('{{channelName}} se chhupayein', { channelName: channelName(c) }) : t('{{channelName}} par dikhayein', { channelName: channelName(c) })} />
    </span>
  );
}

/** Parent row of a product with sizes on the Nafaa website: shown or hidden, and the total stock. */
function StoreSizedSummary({ item, c, canManage, onWebsite }: { item: GridItem; c: OnlineChannel; canManage: boolean; onWebsite: GridHandlers['onWebsite'] }) {
  const cells = item.rows.map((r) => r.cells[c.id]).filter(isStoreCell);
  if (!cells.length) return <span className="text-[0.75rem] text-slate-300">—</span>;
  const visible = cells[0].visible;
  const dot = storeDot(c, visible);
  const stock = cells.reduce((n, x) => n + Math.max(0, x.stock), 0);
  return (
    <span className="flex items-center gap-2 text-[0.75rem]">
      <Dot {...dot} />
      <span className={cn('min-w-0 flex-1 truncate', visible ? 'text-slate-700' : 'font-semibold text-slate-400')}>
        {visible ? t('Stock {{sent}}', { sent: stock }) : t('Chhupa')}
      </span>
      <WebsiteSwitch c={c} productId={item.productId} visible={visible} canManage={canManage} onWebsite={onWebsite} />
    </span>
  );
}

function OpenCell({ c, canManage, onLink }: { c: OnlineChannel; canManage: boolean; onLink: () => void }) {
  if (!(canManage && c.canFetch)) return <span className="text-[0.75rem] text-slate-300">—</span>;
  return (
    <button type="button" onClick={(e) => { stop(e); onLink(); }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.75rem] font-semibold text-brand-700 opacity-0 transition hover:bg-brand-50 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
      <Link2 className="h-3.5 w-3.5" />{t('Link')}
    </button>
  );
}

function ChannelCell({ c, cell, canManage, onLink, onListed, website }: {
  c: OnlineChannel; cell?: GridCell; canManage: boolean; onLink: () => void; onListed: GridHandlers['onListed'];
  /** Nafaa website: the product's switch (left out on size rows; the product row holds it). */
  website?: { productId: string; onWebsite: GridHandlers['onWebsite'] };
}) {
  if (!cell) return null;
  if (isStoreCell(cell)) {
    return (
      <span className="flex items-start gap-2">
        <StoreCellBody c={c} cell={cell} />
        {website && <WebsiteSwitch c={c} productId={website.productId} visible={cell.visible} canManage={canManage} onWebsite={website.onWebsite} />}
      </span>
    );
  }
  if (!cell.linked) return <OpenCell c={c} canManage={canManage} onLink={onLink} />;
  return (
    <span className="flex items-start gap-2">
      <CellBody c={c} cell={cell} canManage={canManage} />
      <ListedSwitch c={c} cell={cell} canManage={canManage} onListed={onListed} />
    </span>
  );
}

/** Parent row of a product with sizes: "3/4 sizes · Stock 30" per channel. */
function SizedSummary({ item, c, canManage, onSizeLess }: { item: GridItem; c: OnlineChannel; canManage: boolean; onSizeLess: GridHandlers['onSizeLess'] }) {
  const bad = item.sizeLess[c.id];
  if (bad) {
    return (
      <button type="button" disabled={!canManage} onClick={(e) => { stop(e); onSizeLess(bad, c); }} title={causeInfo('size').text}
        className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[0.75rem] font-semibold text-rose-700 hover:bg-rose-50">
        <Dot cls="bg-rose-500" label={causeInfo('size').title} />{t('Size ke baghair')}
      </button>
    );
  }
  const linked = item.rows.filter((r) => r.cells[c.id]?.linked);
  if (!linked.length) return <span className="text-[0.75rem] text-slate-300">—</span>;
  const failed = linked.some((r) => (r.cells[c.id] as LinkedCell).status === 'FAILED');
  const held = linked.filter((r) => (r.cells[c.id] as LinkedCell).hold).length;
  const sent = linked.reduce((n, r) => n + Number((r.cells[c.id] as LinkedCell).stock ?? 0), 0);
  const all = linked.length === item.rows.length;
  return (
    <span className="flex items-center gap-2 text-[0.75rem]">
      <Dot cls={failed ? 'bg-rose-500' : held ? 'bg-amber-500' : all ? 'bg-success-500' : 'bg-amber-400'}
        label={failed ? t('Kuch sizes nahi gaye') : held ? t('Stock milana baqi') : all ? t('Sab sizes jure') : t('Kuch sizes jorna baqi')} />
      <span className={cn('font-semibold tabular-nums', all ? 'text-slate-700' : 'text-slate-500')}>{t('{{linked}}/{{count}} sizes', { linked: linked.length, count: item.rows.length })}</span>
      {held > 0 ? <span className="truncate font-semibold text-amber-800" title={t('Stock milana baqi')}>{t('{{held}} ruke', { held })}</span>
        : c.tracksStock && <span className="tabular-nums text-slate-500">{t('Stock {{sent}}', { sent })}</span>}
    </span>
  );
}

/* ─── Desktop table ─── */

const td = 'border-b border-slate-100 bg-white transition-colors group-hover/row:bg-slate-50 group-focus-visible/row:bg-brand-50';

/**
 * Sell when out of stock: "Backorder" when it is on, "Backorder: N" when N
 * units are owed to customers (Nafaa stock below zero).
 */
export function BackorderTag({ on, owed }: { on?: boolean; owed?: number }) {
  if (!on && !owed) return null;
  return (
    <span title={owed ? t('{{owed}} customers ko dena baqi — stock aane par pehle inhe bhejein', { owed }) : t('Stock khatam ho to bhi order chalu')}
      className={cn('inline-flex shrink-0 items-center rounded px-1 text-[0.65625rem] font-semibold leading-4 ring-1',
        owed ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-sky-50 text-sky-800 ring-sky-200')}>
      {owed ? t('Backorder: {{owed}}', { owed }) : t('Backorder')}
    </span>
  );
}

const ProductRows = memo(function ProductRows({ item, cols, canManage, picked, open, h }: {
  item: GridItem; cols: OnlineChannel[]; canManage: boolean; picked: boolean; open: boolean; h: GridHandlers;
}) {
  const sized = isSized(item);
  const first = item.rows[0];
  const nafaaStock = sized ? item.rows.reduce((n, r) => n + Number(r.nafaaStock ?? 0), 0) : first?.nafaaStock ?? null;
  const owed = item.rows.reduce((n, r) => n + Number(r.owed ?? 0), 0);
  const backorderOn = item.rows.some((r) => r.backorder);
  const pickedBg = picked ? '!bg-brand-50' : '';
  const openPanel = () => h.onOpen(item);
  return (
    <>
      <tr data-op-row tabIndex={0} onClick={openPanel} onKeyDown={(e) => rowKeys(e, openPanel)} aria-selected={picked}
        className="group/row cursor-pointer outline-none">
        {canManage && (
          <td className={cn(td, pickedBg, 'sticky start-0 z-[2] w-10 ps-3')} onClick={stop}>
            <input type="checkbox" checked={picked} onChange={() => h.onPick(item.productId)} aria-label={t('{{name}} chunein', { name: item.name })} className="h-4 w-4 rounded border-slate-300" />
          </td>
        )}
        <td className={cn(td, pickedBg, 'sticky z-[2] border-e py-2 pe-3 ps-2', canManage ? 'start-10' : 'start-0 ps-4')}>
          <div className="flex min-w-0 items-center gap-2.5">
            {sized ? (
              <button type="button" onClick={(e) => { stop(e); h.onToggle(item.productId); }} aria-expanded={open} aria-label={open ? t('Sizes chhupayein') : t('Sizes dikhayein')}
                className="-ms-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/60 hover:text-slate-700">
                <ChevronRight className={cn('h-4 w-4 transition rtl:rotate-180', open && 'rotate-90 rtl:rotate-90')} />
              </button>
            ) : <span className="w-5 shrink-0" />}
            <Thumb src={item.image} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[0.8125rem] font-semibold text-slate-900" title={item.name}>{item.name}</p>
              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[0.71875rem] text-slate-500">
                {sized ? <span>{t('{{count}} sizes', { count: item.rows.length })}</span>
                  : item.sku ? <span className="truncate font-mono">{item.sku}</span> : <span>{t('SKU nahi')}</span>}
                <span aria-hidden>·</span>
                <span className="tabular-nums">{rs(first?.price ?? item.price)}</span>
                {nafaaStock !== null && <><span aria-hidden>·</span><span className={cn('tabular-nums', nafaaStock <= 0 && !backorderOn && 'font-semibold text-rose-600')}>{t('Stock {{qty}}', { qty: nafaaStock })}</span></>}
                <BackorderTag on={backorderOn} owed={owed} />
              </p>
            </div>
          </div>
        </td>
        {cols.map((c) => (
          <td key={c.id} className={cn(td, pickedBg, 'px-3 py-2 align-middle')}>
            {sized ? (isStoreChannel(c) ? <StoreSizedSummary item={item} c={c} canManage={canManage} onWebsite={h.onWebsite} /> : <SizedSummary item={item} c={c} canManage={canManage} onSizeLess={h.onSizeLess} />)
              : <ChannelCell c={c} cell={first?.cells[c.id]} canManage={canManage} onLink={() => h.onLink(c, item, first)} onListed={h.onListed}
                website={{ productId: item.productId, onWebsite: h.onWebsite }} />}
          </td>
        ))}
        <td className={cn(td, pickedBg)} />
      </tr>
      {sized && open && item.rows.map((row) => (
        <tr key={row.variantId ?? 'base'} className="group/row" onClick={openPanel}>
          {canManage && <td className={cn(td, 'sticky start-0 z-[2] bg-slate-50')} />}
          <td className={cn(td, 'sticky z-[2] border-e bg-slate-50 py-1.5 pe-3 ps-[4.25rem]', canManage ? 'start-10' : 'start-0')}>
            <p className="flex min-w-0 items-center gap-2 text-[0.75rem]">
              <span className="rounded-md bg-white px-1.5 py-0.5 font-semibold text-slate-800 ring-1 ring-slate-200">{row.label}</span>
              <span className="min-w-0 truncate text-slate-500">
                {row.sku ? <span className="font-mono">{row.sku} · </span> : null}<span className="tabular-nums">{rs(row.price)}</span>
                {row.nafaaStock !== null && <span className={cn('tabular-nums', row.nafaaStock <= 0 && !row.backorder && 'font-semibold text-rose-600')}> · {t('Stock {{qty}}', { qty: row.nafaaStock })}</span>}
              </span>
              <BackorderTag on={row.backorder} owed={row.owed} />
            </p>
          </td>
          {cols.map((c) => (
            <td key={c.id} className={cn(td, 'bg-slate-50/60 px-3 py-1.5')}>
              <ChannelCell c={c} cell={row.cells[c.id]} canManage={canManage} onLink={() => h.onLink(c, item, row)} onListed={h.onListed} />
            </td>
          ))}
          <td className={cn(td, 'bg-slate-50/60')} />
        </tr>
      ))}
    </>
  );
});

export function ProductsTable({ items, cols, canManage, picked, allMatching, expanded, pagePicked, onPickPage, h, footer }: {
  items: GridItem[]; cols: OnlineChannel[]; canManage: boolean; picked: Set<string>; allMatching: boolean; expanded: Set<string>;
  pagePicked: boolean; onPickPage: () => void; h: GridHandlers; footer?: ReactNode;
}) {
  const th = 'sticky top-0 z-[3] border-b border-slate-200 bg-slate-50 text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500';
  return (
    <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 md:block">
      <div className="max-h-[calc(100dvh-11rem)] min-h-[16rem] overflow-auto overscroll-x-contain">
        <table className="w-full border-separate border-spacing-0" style={{ minWidth: `${20 + cols.length * 12.5}rem` }}>
          <thead>
            <tr>
              {canManage && (
                <th className={cn(th, 'start-0 z-[4] w-10 ps-3')}>
                  <input type="checkbox" aria-label={t('Is safhe ke sab chunein')} checked={pagePicked || allMatching} onChange={onPickPage} className="h-4 w-4 rounded border-slate-300" />
                </th>
              )}
              <th className={cn(th, 'z-[4] w-[22rem] min-w-[18rem] border-e py-2.5 pe-3 ps-2', canManage ? 'start-10' : 'start-0 ps-4')}>
                <span className="ps-[3.25rem]">{t('Product')}</span>
              </th>
              {cols.map((c) => (
                <th key={c.id} className={cn(th, 'w-[12.5rem] min-w-[12.5rem] px-3 py-2 normal-case tracking-normal')}>
                  <span className="flex items-center gap-2">
                    <ChannelMark channel={c} size="sm" />
                    <span className="min-w-0 truncate text-[0.8125rem] font-semibold text-slate-800">{channelName(c)}</span>
                  </span>
                </th>
              ))}
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ProductRows key={item.productId} item={item} cols={cols} canManage={canManage}
                picked={allMatching || picked.has(item.productId)} open={expanded.has(item.productId)} h={h} />
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

/* ─── Phone cards ─── */

const ProductCard = memo(function ProductCard({ item, cols, canManage, picked, h }: { item: GridItem; cols: OnlineChannel[]; canManage: boolean; picked: boolean; h: GridHandlers }) {
  const sized = isSized(item);
  const first = item.rows[0];
  return (
    <li className={cn('overflow-hidden rounded-2xl bg-white shadow-sm ring-1', picked ? 'ring-2 ring-brand-400' : 'ring-slate-200/80')}>
      <div className="flex items-center gap-3 px-3 py-2.5" onClick={() => h.onOpen(item)} role="button" tabIndex={0} data-op-row onKeyDown={(e) => rowKeys(e, () => h.onOpen(item))}>
        {canManage && <span onClick={stop}><input type="checkbox" checked={picked} onChange={() => h.onPick(item.productId)} aria-label={t('{{name}} chunein', { name: item.name })} className="h-4 w-4 rounded border-slate-300" /></span>}
        <Thumb src={item.image} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] font-semibold text-slate-900">{item.name}</p>
          <p className="truncate text-[0.75rem] text-slate-500">
            {sized ? t('{{count}} sizes', { count: item.rows.length }) : item.sku || t('SKU nahi')} · <span className="tabular-nums">{rs(first?.price ?? item.price)}</span>
            {!sized && first?.nafaaStock !== null && first?.nafaaStock !== undefined ? <> · {t('Stock {{qty}}', { qty: first.nafaaStock })}</> : null}
          </p>
          <BackorderTag on={item.rows.some((r) => r.backorder)} owed={item.rows.reduce((n, r) => n + Number(r.owed ?? 0), 0)} />
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 rtl:rotate-180" />
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {cols.map((c) => {
          const bad = item.sizeLess[c.id];
          const cell = sized ? undefined : first?.cells[c.id];
          return (
            <li key={c.id} className="flex items-center gap-2.5 px-3 py-2">
              <ChannelMark channel={c} size="sm" />
              <span className="w-20 shrink-0 truncate text-[0.75rem] font-medium text-slate-600">{channelName(c)}</span>
              <span className="flex min-w-0 flex-1 items-start justify-end gap-2">
                {sized ? (isStoreChannel(c) ? <StoreSizedSummary item={item} c={c} canManage={canManage} onWebsite={h.onWebsite} /> : <SizedSummary item={item} c={c} canManage={canManage} onSizeLess={h.onSizeLess} />)
                  : !cell ? null
                    : isStoreCell(cell) ? <><StoreCellBody c={c} cell={cell} /><WebsiteSwitch c={c} productId={item.productId} visible={cell.visible} canManage={canManage} onWebsite={h.onWebsite} /></>
                    : cell.linked ? <><CellBody c={c} cell={cell} canManage={canManage} compact /><ListedSwitch c={c} cell={cell} canManage={canManage} onListed={h.onListed} /></>
                      : canManage && c.canFetch
                        ? <button type="button" onClick={() => h.onLink(c, item, first)} className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700"><Link2 className="h-3.5 w-3.5" />{t('Link')}</button>
                        : <span className="text-[0.75rem] text-slate-300">—</span>}
                {bad && !sized ? <AlertTriangle className="h-4 w-4 text-rose-600" /> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
});

export function ProductCards({ items, cols, canManage, picked, allMatching, h }: {
  items: GridItem[]; cols: OnlineChannel[]; canManage: boolean; picked: Set<string>; allMatching: boolean; h: GridHandlers;
}) {
  return (
    <ul className="space-y-2.5 md:hidden">
      {items.map((item) => <ProductCard key={item.productId} item={item} cols={cols} canManage={canManage} picked={allMatching || picked.has(item.productId)} h={h} />)}
    </ul>
  );
}
