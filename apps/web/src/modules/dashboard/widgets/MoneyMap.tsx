/**
 * Where the money is: stock, purchases, expenses, receivables, payables and
 * cash in the drawer. Industries can add their own tiles and notes (bakery
 * adds raw materials and stock about to expire).
 */

import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, BookOpen, Boxes, Hourglass, ShoppingBag, Truck, Wallet } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { useMoneyMap } from '../data/queries';
import { IconBubble, MetricTile, WidgetCard } from '../engine/parts';
import { Skeleton } from '@/design-system/components';

export type MoneyTileProps = ComponentProps<typeof MetricTile> & { key: string };

export interface MoneyMapOptions {
  /** Extra tiles from the industry, shown after the standard ones. */
  useExtraTiles?: () => MoneyTileProps[];
  /** Extra notes from the industry, shown above the dead-stock note. */
  useNotes?: () => ReactNode;
  productsPath?: string;
}

const noTiles = () => [] as MoneyTileProps[];
const noNotes = () => null;

export function MoneyMap({ useExtraTiles = noTiles, useNotes = noNotes, productsPath = '/products' }: MoneyMapOptions) {
  const { data: m, isLoading } = useMoneyMap();
  const extra = useExtraTiles();
  const notes = useNotes();

  if (isLoading) {
    return (
      <WidgetCard title="Paisa kahan hai">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </WidgetCard>
    );
  }
  if (!m) return null;

  const tiles: MoneyTileProps[] = [
    {
      key: 'stock', icon: Boxes, tone: 'info', to: '/stock-report', label: 'Dukaan me maal',
      value: formatPKR(m.inventory.valueAtCost),
      hint: `${m.inventory.productCount} cheezein · bikne par ${formatPKR(m.inventory.valueAtRetail)}`,
    },
    ...extra,
    {
      key: 'purchases', icon: ShoppingBag, tone: 'brand', to: '/purchases', label: 'Is mahine maal aaya',
      value: formatPKR(m.purchases.monthTotal),
      hint: `${m.purchases.monthCount} bill${m.purchases.monthUnpaid > 0 ? ` · ${formatPKR(m.purchases.monthUnpaid)} baqi` : ''}`,
    },
    {
      key: 'expenses', icon: Wallet, tone: 'warning', to: '/expenses', label: 'Is mahine kharcha',
      value: formatPKR(m.expenses.month),
      hint: `${m.expenses.monthCount} entries · pichhla mahina ${formatPKR(m.expenses.lastMonth ?? 0)}`,
    },
    {
      key: 'receivable', icon: BookOpen, tone: 'danger', to: '/khata', label: 'Logon se lena',
      value: formatPKR(m.receivable.total), hint: `${m.receivable.customerCount} logon ka udhaar`,
    },
    {
      key: 'payable', icon: Truck, tone: 'neutral', to: '/suppliers', label: 'Suppliers ko dena',
      value: formatPKR(m.payable.total), hint: `${m.payable.supplierCount} suppliers`,
    },
    {
      key: 'cash', icon: Banknote, tone: 'success', to: '/cash-register', label: 'Galle me cash',
      value: m.cash.registerOpen ? formatPKR(m.cash.expected) : '—',
      hint: m.cash.registerOpen ? `Opening ${formatPKR(m.cash.opening)}` : 'Register band hai',
    },
  ];

  return (
    <WidgetCard title="Paisa kahan hai" description="Maal, kharcha, lena aur dena — sab ek nazar me">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map(({ key, ...t }) => <MetricTile key={key} {...t} />)}
      </div>
      {notes}
      {m.inventory.deadStockValue > 0 && (
        <MoneyNote
          icon={Hourglass}
          title={`${formatPKR(m.inventory.deadStockValue)} ka maal atka hua hai`}
          text={`${m.inventory.deadStockCount} cheezein 60 din se nahi bikin — deal bana kar nikalein`}
          to={productsPath}
          cta="Maal dekhein"
        />
      )}
    </WidgetCard>
  );
}

export function MoneyNote({ icon, title, text, to, cta, tone = 'neutral' }: {
  icon: ComponentProps<typeof IconBubble>['icon']; title: string; text: string; to: string; cta: string; tone?: 'neutral' | 'danger';
}) {
  return (
    <div className={tone === 'danger'
      ? 'mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2.5'
      : 'mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5'}>
      <IconBubble icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <div className="text-[0.875rem] font-semibold text-slate-900">{title}</div>
        <div className="text-[0.75rem] text-slate-600">{text}</div>
      </div>
      <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
