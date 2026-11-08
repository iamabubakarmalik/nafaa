/**
 * One order on the board. Wide screens get a dense table row; phones and
 * small laptops get a stacked card with the same cells. Clicking the row
 * opens the side drawer; the checkbox, WhatsApp button, Status menu and
 * "⋯" menu work on their own.
 */

import type { ReactNode } from 'react';
import { CalendarClock, MapPin, Package, Truck } from 'lucide-react';
import { Avatar } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import type { CourierAccount, OnlineOrder } from '../../api/online-orders.api';
import type { BoardStatus, CustomStage } from '../../api/order-board.api';
import { courierBrand, sourceOf, timeAgo, waNumber } from '../../lib/labels';
import { boardOf, isClosed, itemQty, orderNo, stageEntry, tint } from '../../lib/orders';
import { RiskBadge } from '../RiskBadge';
import { moneyOf } from './OrderMoneyCard';
import { RowActions } from './RowActions';
import { WaButton } from './WaButton';
import { StatusMenu } from './StatusMenu';
import type { ToolKind } from './OrderTools';
import type { QuickAction } from './useOrderActions';
import { t } from '@core/i18n';

/** Tag added when the confirmation message was opened in WhatsApp. */
export const TEXTED_TAG = 'Texted';

/** Grid columns of the wide layout; the header in OrdersTable uses the same. */
export const ROW_GRID = 'xl:grid xl:grid-cols-[1.5rem_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_6.5rem_minmax(0,1fr)_minmax(0,1fr)_1.75rem_auto] xl:items-center xl:gap-3';

const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold';
const qtyText = (n: number) => String(Number(n.toFixed(2)));

export interface BoardRowProps {
  order: OnlineOrder;
  money: (n: number) => string;
  custom: CustomStage[];
  shopName?: string;
  siteUrl?: string | null;
  assignee?: string | null;
  couriers: CourierAccount[];
  checked: boolean;
  active: boolean;
  busy: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onMove: (to: BoardStatus) => void;
  onTool: (kind: ToolKind) => void;
  onQuick: (a: QuickAction) => void;
  onTexted: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermanent: () => void;
}

export function BoardRow(p: BoardRowProps) {
  const { order: o, active, checked } = p;
  const c = cells(p);
  return (
    <li className={cn('group relative px-3 py-2.5 transition sm:px-4', active ? 'bg-brand-50/70' : checked ? 'bg-brand-50/40' : 'hover:bg-slate-50/80', (isClosed(o) || o.deletedAt) && 'opacity-75')}>
      <button type="button" onClick={p.onOpen} className="absolute inset-0" aria-label={t('Order #{{no}} kholein', { no: orderNo(o) })} />
      {active && <span className="absolute inset-y-0 start-0 w-1 bg-brand-500" aria-hidden />}
      {/* Wide screens: one table row. */}
      <div className={cn('pointer-events-none relative hidden', ROW_GRID)}>
        {c.check}{c.order}{c.customer}{c.items}{c.amount}{c.badges}{c.tracking}{c.assignee}
        <div className="flex items-center justify-end gap-1.5">{c.stage}{c.status}{c.menu}</div>
      </div>
      {/* Phones and small laptops: stacked card. */}
      <div className="pointer-events-none relative flex gap-2.5 xl:hidden">
        {c.check}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">{c.order}{c.amount}</div>
          {c.customer}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">{c.items}{c.badges}</div>
          {(o.trackingNumber || o.courierLabel) && c.tracking}
          <div className="flex flex-wrap items-center justify-end gap-1.5">{c.assignee}{c.stage}<span className="flex-1" />{c.status}{c.menu}</div>
        </div>
      </div>
    </li>
  );
}

function Live({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('pointer-events-auto relative', className)}>{children}</span>;
}

function cells(p: BoardRowProps) {
  const { order: o, money, custom } = p;
  const src = sourceOf(o);
  const closed = isClosed(o);
  const m = moneyOf(o);
  const stage = stageEntry(o.stage, custom);
  const tags = o.metadata?.tags ?? [];
  const wa = waNumber(o.customerPhone);
  const chStatus = o.metadata?.channelStatus;
  const conf = o.confirmation?.result;
  const due = o.followUpAt && new Date(o.followUpAt).getTime() <= Date.now();
  const trail = o.courierTrail?.label ?? (o.courierStatus ? String(o.courierStatus).replace(/_/g, ' ').toLowerCase() : null);

  return {
    check: (
      <Live className="flex h-6 items-start pt-0.5">
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={p.checked} onChange={p.onToggle} aria-label={t('Order #{{no}} chunein', { no: orderNo(o) })} />
      </Live>
    ),
    order: (
      <div className="flex min-w-0 items-center gap-2">
        <BrandLogo name={src.brand} size={28} title={o.integration?.displayName ?? src.label} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-mono text-[0.8125rem] font-semibold text-slate-900">
            #{orderNo(o)}
            {o.isTest && <span className={cn(pill, 'bg-amber-100 font-sans text-amber-800')}>{t('TEST')}</span>}
            {o.replacementOfId && <span className={cn(pill, 'bg-cyan-50 font-sans text-cyan-700')}>{t('Replacement')}</span>}
          </p>
          <p className="truncate text-[0.6875rem] text-slate-500">{timeAgo(o.receivedAt)}</p>
        </div>
      </div>
    ),
    customer: (
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[0.8125rem] font-medium text-slate-900">{o.customerName}</span>
          {!closed && <RiskBadge risk={o.risk} />}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-[0.6875rem] text-slate-500">
          {o.customerPhone && <span className="tabular-nums">{o.customerPhone}</span>}
          {o.customerCity && <span className="inline-flex max-w-[8rem] items-center gap-0.5 truncate rounded-full bg-slate-100 px-1.5 py-px font-medium text-slate-600"><MapPin className="h-2.5 w-2.5 shrink-0" />{o.customerCity}</span>}
        </p>
      </div>
    ),
    items: (
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="flex -space-x-2 rtl:space-x-reverse">
          {o.items.slice(0, 3).map((it, i) => (
            <span key={i} title={it.name} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-slate-100 ring-2 ring-white">
              {it.image ? <img src={it.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-3.5 w-3.5 text-slate-400" />}
            </span>
          ))}
        </span>
        <span className="min-w-0 truncate text-[0.6875rem] text-slate-600" title={o.items.map((i) => `${qtyText(Number(i.quantity))} × ${i.name}`).join('\n')}>
          {t('{{qty}} qty', { qty: qtyText(itemQty(o)) })}{o.items.length > 3 ? ` · +${o.items.length - 3}` : ''}
        </span>
      </div>
    ),
    amount: (
      <div className="flex shrink-0 flex-col items-end xl:items-start">
        <span className={cn('text-[0.875rem] font-bold tabular-nums', closed ? 'text-slate-400 line-through' : 'text-slate-900')}>{money(o.total)}</span>
        {o.paymentStatus === 'PAID' ? <span className={cn(pill, 'bg-success-50 text-success-700')}>{t('Paid')}</span>
          : m.advance > 0 && !closed ? <span className={cn(pill, 'bg-success-50 text-success-700')}>{t('Adv {{value}}', { value: money(m.advance) })}</span>
            : o.isCod ? <span className={cn(pill, 'bg-orange-50 text-orange-700')}>{t('COD')}</span> : null}
      </div>
    ),
    badges: (
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {o.isCod && !closed && (
          <span className={cn(pill, conf === 'CONFIRMED' ? 'bg-success-50 text-success-700' : conf === 'REFUSED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800')}>
            {conf === 'CONFIRMED' ? t('WA Confirmed') : conf === 'REFUSED' ? t('Mana kiya') : conf === 'NO_ANSWER' ? t('Jawab nahi') : t('WA Unconfirmed')}
          </span>
        )}
        {wa && !o.deletedAt && (
          <Live>
            <WaButton order={o} shopName={p.shopName} money={money} onTexted={() => { if (!tags.includes(TEXTED_TAG)) p.onTexted(); }} />
          </Live>
        )}
        {tags.includes(TEXTED_TAG) && <span className={cn(pill, 'bg-emerald-50 text-emerald-700')}>{t('Texted')}</span>}
        {chStatus && <span className={cn(pill, /cancel|refund|void/i.test(chStatus) ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600')}>{`${src.label} ${chStatus}`}</span>}
        {o.metadata?.cancelRequested && o.orderStatus !== 'CANCELLED' && <span className={cn(pill, 'bg-rose-600 text-white')}>{t('Cancel maanga')}</span>}
        {tags.filter((x) => x !== TEXTED_TAG).slice(0, 2).map((x) => <span key={x} className={cn(pill, 'bg-brand-50 text-brand-700')}>{x}</span>)}
      </div>
    ),
    tracking: (
      <div className="flex min-w-0 items-center gap-1.5">
        {o.trackingNumber || o.courierLabel ? (
          <>
            <BrandLogo name={courierBrand(o.courierCode ?? o.courierLabel)} size={22} title={o.courierLabel ?? undefined} />
            <span className="min-w-0">
              <span className="block truncate font-mono text-[0.6875rem] text-slate-700">{o.trackingNumber ?? o.courierLabel}</span>
              {trail && <span className="block truncate text-[0.6875rem] capitalize text-slate-500">{trail}</span>}
            </span>
          </>
        ) : <span className="hidden text-[0.6875rem] text-slate-400 xl:inline-flex xl:items-center xl:gap-1"><Truck className="h-3 w-3" />—</span>}
      </div>
    ),
    assignee: (
      <span className="flex items-center gap-1">
        {p.assignee ? <span title={t('Zimme: {{name}}', { name: p.assignee })}><Avatar name={p.assignee} size={24} /></span> : <span className="hidden h-6 w-6 rounded-full border border-dashed border-slate-300 xl:block" title={t('Kisi ke paas nahi')} />}
        {o.followUpAt && (
          <span title={`${t('Follow-up')}: ${new Date(o.followUpAt).toLocaleString('en-PK')}${o.followUpNote ? ` · ${o.followUpNote}` : ''}`}
            className={cn('flex h-6 w-6 items-center justify-center rounded-full', due ? 'bg-rose-100 text-rose-700' : 'bg-pink-50 text-pink-600')}>
            <CalendarClock className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
    ),
    stage: stage ? <span className={cn(pill, 'max-w-[7rem] truncate')} style={tint(stage.color)} title={stage.hint}>{stage.short}</span> : null,
    status: (
      <Live>
        {o.deletedAt ? <span className={cn(pill, 'bg-slate-100 text-slate-600')}>{t('Deleted')}</span>
          : <StatusMenu current={boardOf({ ...o, stage: null })} custom={custom} busy={p.busy} onPick={p.onMove} />}
      </Live>
    ),
    menu: (
      <Live>
        <RowActions order={o} siteUrl={p.siteUrl} couriers={p.couriers} onTool={p.onTool} onQuick={p.onQuick} onOpen={p.onOpen}
          onDelete={p.onDelete} onRestore={p.onRestore} onPermanent={p.onPermanent} />
      </Live>
    ),
  };
}
