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
import { PrintButton } from '@core/print';
import { t as tr } from '@core/i18n';

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
      <WidgetCard title={tr('Paisa kahan hai')}>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </WidgetCard>
    );
  }
  if (!m) return null;

  const tiles: MoneyTileProps[] = [
    {
      key: 'stock', icon: Boxes, tone: 'info', to: '/stock-report', label: tr('Dukaan me maal'),
      value: formatPKR(m.inventory.valueAtCost),
      hint: tr('{{productCount}} cheezein · bikne par {{valueAtRetail}}', { productCount: m.inventory.productCount, valueAtRetail: formatPKR(m.inventory.valueAtRetail) }),
    },
    ...extra,
    {
      key: 'purchases', icon: ShoppingBag, tone: 'brand', to: '/purchases', label: tr('Is mahine maal aaya'),
      value: formatPKR(m.purchases.monthTotal),
      hint: tr('{{monthCount}} bill{{value}}', { monthCount: m.purchases.monthCount, value: m.purchases.monthUnpaid > 0 ? tr(' · {{monthUnpaid}} baqi', { monthUnpaid: formatPKR(m.purchases.monthUnpaid) }) : '' }),
    },
    {
      key: 'expenses', icon: Wallet, tone: 'warning', to: '/expenses', label: tr('Is mahine expense'),
      value: formatPKR(m.expenses.month),
      hint: tr('{{monthCount}} entries · pichhla mahina {{value}}', { monthCount: m.expenses.monthCount, value: formatPKR(m.expenses.lastMonth ?? 0) }),
    },
    {
      key: 'receivable', icon: BookOpen, tone: 'danger', to: '/khata', label: tr('Logon se lena'),
      value: formatPKR(m.receivable.total), hint: tr('{{customerCount}} logon ka udhaar', { customerCount: m.receivable.customerCount }),
    },
    {
      key: 'payable', icon: Truck, tone: 'neutral', to: '/suppliers', label: tr('Suppliers ko dena'),
      value: formatPKR(m.payable.total), hint: tr('{{supplierCount}} suppliers', { supplierCount: m.payable.supplierCount }),
    },
    {
      key: 'cash', icon: Banknote, tone: 'success', to: '/cash-register', label: tr('Galle me cash'),
      value: m.cash.registerOpen ? formatPKR(m.cash.expected) : '—',
      hint: m.cash.registerOpen ? tr('Opening {{opening}}', { opening: formatPKR(m.cash.opening) }) : tr('Register band hai'),
    },
  ];

  return (
    <WidgetCard title={tr('Paisa kahan hai')} icon={Wallet} description={tr('Maal, expense, lena aur dena — sab ek nazar me')}
      actions={<PrintButton size="sm" doc={() => ({
        title: tr('Paisa kahan hai'),
        sections: [{ kind: 'rows', rows: tiles.map((t) => ({ label: `${t.label}${typeof t.hint === 'string' ? ` (${t.hint})` : ''}`, value: String(t.value) })) },
          ...(m.inventory.deadStockValue > 0 ? [{ kind: 'text' as const, text: tr('{{deadStockValue}} ka maal 60 din se atka hua hai ({{deadStockCount}} cheezein)', { deadStockValue: formatPKR(m.inventory.deadStockValue), deadStockCount: m.inventory.deadStockCount }) }] : [])],
      })} />}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map(({ key, ...t }) => <MetricTile key={key} {...t} />)}
      </div>
      {notes}
      {m.inventory.deadStockValue > 0 && (
        <MoneyNote
          icon={Hourglass}
          title={tr('{{deadStockValue}} ka maal atka hua hai', { deadStockValue: formatPKR(m.inventory.deadStockValue) })}
          text={tr('{{deadStockCount}} cheezein 60 din se nahi bikin — deal bana kar nikalein', { deadStockCount: m.inventory.deadStockCount })}
          to={productsPath}
          cta={tr('Maal dekhein')}
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
        {cta} <ArrowRight className="h-3.5 w-3.5 rtl-flip" />
      </Link>
    </div>
  );
}
