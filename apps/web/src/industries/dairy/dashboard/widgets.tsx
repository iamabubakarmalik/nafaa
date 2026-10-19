/** Dairy-only dashboard widgets. */

import { AlertTriangle, BookOpen, Milk, Sunrise, Sunset, Truck, Users, Warehouse } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { EmptyHint, fmtQty, IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { useDairyOps } from './useDairyOps';

const liters = (v: number) => `${fmtQty(Math.round(v * 10) / 10)}L`;

/** Dairy headline numbers, offered next to the common ones. */
export const dairyKpis: KpiDef[] = [
  {
    id: 'dairy-deliveries', label: 'Aaj ki delivery', icon: Truck, tone: 'brand',
    useValue: () => {
      const { today: t, loading } = useDairyOps();
      return {
        loading, to: '/dairy/deliveries',
        value: t.scheduled > 0 ? `${t.delivered}/${t.scheduled}` : '—',
        hint: t.scheduled === 0 ? 'aaj koi delivery nahi' : t.pending > 0 ? `${t.pending} baqi · ${liters(t.liters)} pohncha` : `${liters(t.liters)} pohncha`,
      };
    },
  },
  {
    id: 'dairy-milk-in', label: 'Gawale se doodh', icon: Warehouse, tone: 'success',
    useValue: () => {
      const { today: t, loading } = useDairyOps();
      const { cost } = useMasked();
      return {
        loading, to: '/dairy/supplies',
        value: liters(t.suppliedLiters),
        hint: t.supplies > 0 ? `${t.supplies} entries · ${cost(t.suppliedAmount)}` : 'aaj abhi kuch nahi aaya',
      };
    },
  },
  {
    id: 'dairy-volume', label: 'Rozana doodh', icon: Milk, tone: 'info',
    useValue: () => {
      const { subscribers: s, loading } = useDairyOps();
      return { loading, to: '/dairy/customers', value: liters(s.daily), hint: `Subah ${liters(s.morning)} · Shaam ${liters(s.evening)}` };
    },
  },
  {
    id: 'dairy-subscribers', label: 'Pakke customer', icon: Users, tone: 'neutral',
    useValue: () => {
      const { subscribers: s, loading } = useDairyOps();
      return { loading, to: '/dairy/customers', value: s.active, hint: s.paused ? `${s.paused} ruke hue` : `${s.total} kul` };
    },
  },
  {
    id: 'dairy-receivable', label: 'Doodh ka khata', icon: BookOpen, tone: 'danger', sensitive: true,
    useValue: () => {
      const { money, loading } = useDairyOps();
      const { cost } = useMasked();
      return { loading, to: '/dairy/customers', value: cost(money.receivable), hint: `${money.debtorCount} customers se lena` };
    },
  },
  {
    id: 'dairy-farmer-payable', label: 'Gawalon ko dena', icon: Warehouse, tone: 'warning', sensitive: true,
    useValue: () => {
      const { money, totals, loading } = useDairyOps();
      const { cost } = useMasked();
      return { loading, to: '/dairy/farmers', value: cost(money.farmerPayable), hint: `${totals.farmers} gawale` };
    },
  },
];

export function useDairyAttention(): AttentionItem[] {
  const { today, money, subscribers, totals, loading } = useDairyOps();
  const { cost } = useMasked();
  const items: AttentionItem[] = [];
  if (loading) return items;

  if (today.pending > 0) items.push({ icon: Truck, level: 'warning', text: `${today.pending} delivery abhi baqi hai — rider se pata karein`, to: '/dairy/deliveries', cta: 'Delivery dekhein' });
  if (money.debtorCount > 0 && money.receivable > 0) items.push({ icon: BookOpen, level: 'warning', text: `${money.debtorCount} customers ka ${cost(money.receivable)} baqi hai — mahine ka bill bhejein`, to: '/dairy/bills', cta: 'Bill banayein' });
  if (totals.farmers > 0 && today.supplies === 0) items.push({ icon: Warehouse, level: 'info', text: 'Aaj gawalon se aaya doodh abhi tak darj nahi hua', to: '/dairy/supplies', cta: 'Darj karein' });
  if (money.farmerPayable > 0) items.push({ icon: Warehouse, level: 'neutral', text: `Gawalon ko ${cost(money.farmerPayable)} dena hai`, to: '/dairy/farmers', cta: 'Gawale dekhein' });
  if (subscribers.paused > 0) items.push({ icon: Users, level: 'neutral', text: `${subscribers.paused} customer ki delivery ruki hui hai`, to: '/dairy/customers', cta: 'Dekhein' });
  return items;
}

export function DairyDeliveries() {
  const { today: t, subscribers: s } = useDairyOps();
  const { sales } = useMasked();
  const pct = t.scheduled > 0 ? Math.round((t.delivered / t.scheduled) * 100) : 0;
  return (
    <WidgetCard
      title="Aaj ki delivery"
      icon={Truck}
      description={t.scheduled ? `${t.delivered}/${t.scheduled} pohnch gayi · ${sales(t.revenue)}` : 'Aaj koi delivery schedule nahi'}
      to="/dairy/deliveries"
    >
      {t.scheduled > 0 && (
        <div className="mb-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-[0.75rem] text-slate-500">{pct}% mukammal · {liters(t.liters)} doodh pohncha</p>
        </div>
      )}
      <dl className="grid grid-cols-3 gap-2 text-center">
        {([
          ['Subah', s.morning, Sunrise, 'text-amber-700'],
          ['Shaam', s.evening, Sunset, 'text-brand-700'],
          ['Baqi', t.pending, Truck, t.pending > 0 ? 'text-rose-700' : 'text-success-700'],
        ] as const).map(([label, v, Icon, color]) => (
          <div key={label} className="rounded-lg bg-slate-50 py-2.5">
            <Icon className={cn('mx-auto h-4 w-4', color)} />
            <dd className={cn('mt-1 text-lg font-bold tabular-nums', color)}>{label === 'Baqi' ? v : liters(v)}</dd>
            <dt className="text-[0.75rem] text-slate-500">{label === 'Baqi' ? 'delivery baqi' : 'rozana'}</dt>
          </div>
        ))}
      </dl>
    </WidgetCard>
  );
}

export function DairyCollection() {
  const { today: t, farmers } = useDairyOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title="Gawalon se doodh"
      icon={Warehouse}
      description={t.supplies ? `Aaj ${liters(t.suppliedLiters)} aaya · ${cost(t.suppliedAmount)}` : 'Aaj abhi kuch darj nahi hua'}
      to="/dairy/supplies"
      flush
    >
      {farmers.length === 0 ? (
        <EmptyHint icon={Warehouse} text="30 din me kisi gawale se doodh darj nahi hua" />
      ) : (
        <>
          <p className="px-4 pt-1 text-[0.75rem] font-medium text-slate-500 sm:px-5">Sab se zyada dene wale · 30 din</p>
          <RowList empty="" emptyIcon={Warehouse}>
            {farmers.map((f, i) => (
              <ListRow
                key={f.id || i}
                to="/dairy/farmers"
                leading={<IconBubble icon={Milk} tone={i === 0 ? 'success' : 'neutral'} />}
                title={f.name}
                meta={liters(f.liters)}
                value={cost(f.amount)}
              />
            ))}
          </RowList>
        </>
      )}
    </WidgetCard>
  );
}

export function DairyDebtors() {
  const { debtors, money } = useDairyOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title="Doodh ka khata baqi"
      icon={BookOpen}
      description={money.receivable > 0 ? `${cost(money.receivable)} · ${money.debtorCount} customers` : 'Sab ka hisaab saaf'}
      to="/dairy/customers"
      flush
    >
      <RowList empty="Kisi ka khata baqi nahi" emptyIcon={BookOpen}>
        {debtors.map((d) => (
          <ListRow
            key={d.id}
            to="/dairy/customers"
            leading={<IconBubble icon={AlertTriangle} tone="danger" />}
            title={d.name}
            meta={d.phone}
            value={<Badge variant="danger" size="xs">{cost(d.balance)}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Money owed to farmers and by milk customers, as extra money-map tiles. */
export function useDairyMoneyTiles(): MoneyTileProps[] {
  const { money, totals } = useDairyOps();
  return [
    {
      key: 'dairy-receivable', icon: BookOpen, tone: 'danger', to: '/dairy/customers', label: 'Doodh ka khata',
      value: formatPKR(money.receivable), hint: `${money.debtorCount} customers se lena`,
    },
    {
      key: 'dairy-farmers', icon: Warehouse, tone: 'warning', to: '/dairy/farmers', label: 'Gawalon ko dena',
      value: formatPKR(money.farmerPayable), hint: `${totals.farmers} gawale`,
    },
  ];
}
