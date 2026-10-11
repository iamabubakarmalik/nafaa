/** Meat-only dashboard widgets. */

import { AlertTriangle, Beef, CalendarClock, Heart, Package, Scissors, ShieldCheck, Truck, Weight } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { fmtQty, IconBubble, ListRow, MetricTile, ProgressRing, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { useMeatOps } from './useMeatOps';

const kg = (v: number) => `${fmtQty(Math.round(v * 10) / 10)} kg`;

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Pakka', PROCESSING: 'Tayyari', CUTTING: 'Cutting', PACKED: 'Pack', READY: 'Tayyar', OUT_FOR_DELIVERY: 'Raste me',
};

const when = (left: number | null) => {
  if (left === null) return '—';
  if (left < 0) return 'Late';
  if (left <= 24) return `${Math.round(left)}h`;
  return `${Math.round(left / 24)} din`;
};

/** Meat headline numbers, offered next to the common ones. */
export const meatKpis: KpiDef[] = [
  {
    id: 'meat-orders', label: 'Chaalu order', icon: Package, tone: 'brand',
    useValue: () => {
      const { orders, loading } = useMeatOps();
      return {
        loading, to: '/meat/weight-orders', value: orders.open.length, alert: orders.late.length > 0,
        hint: orders.late.length ? `${orders.late.length} late!` : orders.ready.length ? `${orders.ready.length} tayyar` : `${orders.todayCount} aaj aaye`,
      };
    },
  },
  {
    id: 'meat-animals', label: 'Zinda janwar', icon: Heart, tone: 'success',
    useValue: () => {
      const { livestock: l, loading } = useMeatOps();
      return { loading, to: '/meat/live-animals', value: l.alive, hint: l.kg > 0 ? `${kg(l.kg)} kul wazan` : 'koi janwar nahi' };
    },
  },
  {
    id: 'meat-invested', label: 'Janwaron par lagat', icon: Beef, tone: 'warning', sensitive: true,
    useValue: () => {
      const { livestock: l, loading } = useMeatOps();
      const { cost } = useMasked();
      return { loading, to: '/meat/live-animals', value: cost(l.invested), hint: `chara ${cost(l.feed)}` };
    },
  },
  {
    id: 'meat-halal', label: 'Halal record', icon: ShieldCheck, tone: 'success',
    useValue: () => {
      const { halal, loading } = useMeatOps();
      return {
        loading, to: '/meat/slaughter', alert: halal.total > 0 && halal.pct < 95,
        value: halal.total > 0 ? `${Math.round(halal.pct)}%` : '—',
        hint: halal.total > 0 ? `${halal.halal}/${halal.total} zabiha · 30 din` : '30 din me koi zabiha nahi',
      };
    },
  },
  {
    id: 'meat-cutting', label: 'Cutting chal rahi', icon: Scissors, tone: 'neutral',
    useValue: () => {
      const { cutting, loading } = useMeatOps();
      return { loading, to: '/meat/cutting', value: cutting.open, hint: cutting.open ? `${kg(cutting.kg)} gosht` : 'koi kaam nahi' };
    },
  },
  {
    id: 'meat-order-due', label: 'Order ka baqi', icon: AlertTriangle, tone: 'danger', sensitive: true,
    useValue: () => {
      const { orders, loading } = useMeatOps();
      const { cost } = useMasked();
      return { loading, to: '/meat/weight-orders', value: cost(orders.due), hint: `${orders.open.length} chaalu order` };
    },
  },
];

export function useMeatAttention(): AttentionItem[] {
  const { orders, subs, cutting, halal, loading } = useMeatOps();
  const items: AttentionItem[] = [];
  if (loading) return items;

  if (orders.late.length) items.push({ icon: AlertTriangle, level: 'danger', text: `${orders.late.length} order ka waqt guzar gaya — customer ko batayein`, to: '/meat/weight-orders', cta: 'Orders dekhein' });
  if (orders.ready.length) items.push({ icon: Package, level: 'warning', text: `${orders.ready.length} order tayyar pada hai — customer ko bulayein ya bhejein`, to: '/meat/weight-orders', cta: 'Dekhein' });
  if (halal.total > 0 && halal.pct < 95) items.push({ icon: ShieldCheck, level: 'warning', text: `Halal record ${Math.round(halal.pct)}% hai — har zabiha ka record poora karein`, to: '/meat/slaughter', cta: 'Record dekhein' });
  if (subs.today.length) items.push({ icon: CalendarClock, level: 'info', text: `${subs.today.length} subscription ki delivery aaj hai`, to: '/meat/subscriptions', cta: 'Dekhein' });
  if (orders.today.length) items.push({ icon: Truck, level: 'info', text: `${orders.today.length} order agle 24 ghante me dena hai`, to: '/meat/weight-orders', cta: 'Dekhein' });
  if (cutting.open) items.push({ icon: Scissors, level: 'neutral', text: `${cutting.open} cutting job abhi chal rahi hai`, to: '/meat/cutting', cta: 'Cutting dekhein' });
  return items;
}

export function MeatOrders() {
  const { orders } = useMeatOps();
  const { sales, costHidden } = useMasked();
  return (
    <WidgetCard
      title="Wazan wale order"
      icon={Weight}
      description={orders.due > 0 && !costHidden ? `${formatPKR(orders.due)} baqi lena hai` : `${orders.open.length} chaalu · ${orders.onRoad} raste me`}
      to="/meat/weight-orders"
      flush
    >
      <RowList empty="Koi order baqi nahi" emptyIcon={Package}>
        {orders.list.map((w) => {
          const late = w.left !== null && w.left < 0;
          const soon = w.left !== null && w.left <= 24;
          return (
            <ListRow
              key={w.id}
              to="/meat/weight-orders"
              leading={<IconBubble icon={w.status === 'OUT_FOR_DELIVERY' ? Truck : Package} tone={late ? 'danger' : w.status === 'READY' ? 'success' : 'neutral'} />}
              title={w.customerName || 'Customer'}
              meta={<span><span className="font-mono">{w.orderNumber}</span>{w.kg ? ` · ${kg(w.kg)}` : ''} · {STATUS_LABEL[w.status] ?? w.status}</span>}
              value={sales(w.total)}
              valueHint={<Badge variant={late ? 'danger' : soon ? 'warning' : 'default'} size="xs">{when(w.left)}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function MeatLivestock() {
  const { livestock: l } = useMeatOps();
  const { cost } = useMasked();
  return (
    <WidgetCard title="Zinda janwar" icon={Heart} description={l.alive ? `${l.alive} janwar · ${kg(l.kg)}` : 'Baara khaali hai'} to="/meat/live-animals" flush>
      <div className="grid grid-cols-2 gap-2 px-4 pb-3 sm:px-5">
        <MetricTile icon={Beef} tone="warning" label="Khareed" value={cost(l.purchase)} />
        <MetricTile icon={Heart} tone="success" label="Chara" value={cost(l.feed)} />
      </div>
      <RowList empty="Koi zinda janwar nahi" emptyIcon={Heart}>
        {l.types.slice(0, 6).map((t) => (
          <ListRow
            key={t.type}
            leading={<IconBubble icon={Beef} tone="neutral" />}
            title={t.label}
            meta={t.kg > 0 ? `${kg(t.kg)} kul` : undefined}
            value={t.count}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function MeatHalal() {
  const { halal } = useMeatOps();
  const good = halal.pct >= 95;
  return (
    <WidgetCard title="Halal record" icon={ShieldCheck} description="Pichhle 30 din ke zabihe" to="/meat/slaughter">
      {halal.total === 0 ? (
        <div className="flex items-center gap-3">
          <IconBubble icon={ShieldCheck} />
          <p className="text-[0.8125rem] text-slate-600">30 din me koi zabiha darj nahi hua. Har zabiha log karein taa ke halal record saaf rahe.</p>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <ProgressRing value={halal.pct / 100} size={96} stroke={9} className={good ? 'text-success-600' : 'text-amber-600'}>
            <span className="text-xl font-bold tabular-nums text-slate-900">{Math.round(halal.pct)}%</span>
          </ProgressRing>
          <dl className="grid flex-1 gap-2 text-[0.8125rem]">
            {([['Halal zabiha', `${halal.halal}/${halal.total}`], ['Certificate wale', halal.withCert], ['Vet check', halal.withVet]] as const).map(([label, v]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {halal.total > 0 && (
        <p className={cn('mt-3 text-[0.75rem] font-medium', good ? 'text-success-700' : 'text-amber-700')}>
          {good ? 'Record bohat acha hai' : 'Kuch zabihon ka halal record poora nahi'}
        </p>
      )}
    </WidgetCard>
  );
}

export function MeatSubscriptions() {
  const { subs } = useMeatOps();
  return (
    <WidgetCard title="Subscription delivery" icon={CalendarClock} description={`Agle 3 din · ${subs.active} chaalu plan`} to="/meat/subscriptions" flush>
      <RowList empty="Agle 3 din koi delivery nahi" emptyIcon={CalendarClock}>
        {subs.list.slice(0, 6).map((s) => {
          const today = s.left !== null && s.left <= 24;
          return (
            <ListRow
              key={s.id}
              to="/meat/subscriptions"
              icon={Truck}
              title={s.contactPerson || 'Customer'}
              meta={<span><span className="font-mono">{s.subscriptionNumber}</span>{s.totalMonthlyKg ? ` · ${kg(Number(s.totalMonthlyKg))}/mahina` : ''}</span>}
              value={<Badge variant={today ? 'warning' : 'default'} size="xs">{today ? 'Aaj' : when(s.left)}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

/** Money tied up in live animals, as an extra money-map tile. */
export function useMeatMoneyTiles(): MoneyTileProps[] {
  const { livestock: l } = useMeatOps();
  return [{
    key: 'meat-livestock', icon: Heart, tone: 'warning', to: '/meat/live-animals', label: 'Zinda janwar',
    value: formatPKR(l.invested), hint: `${l.alive} janwar · chara ${formatPKR(l.feed)}`,
  }];
}
