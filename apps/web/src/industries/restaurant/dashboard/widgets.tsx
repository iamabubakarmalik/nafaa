/** Restaurant-only dashboard widgets. */

import { Link } from 'react-router-dom';
import {
  AlertTriangle, BellRing, Bike, CalendarClock, Car, ChefHat, Home, Package, ShoppingBag, Sparkles, Timer, Users, Utensils,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/design-system/components';
import { EmptyHint, IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { cn } from '@core/lib/cn';
import type { OrderMode, OrderStatus } from '../api/orders.api';
import type { TableStatus } from '../api/tables.api';
import { useRestaurantOps } from './useRestaurantOps';

const MODES: Record<OrderMode, { label: string; icon: LucideIcon }> = {
  DINE_IN: { label: 'Dine-in', icon: Utensils },
  TAKEAWAY: { label: 'Takeaway', icon: ShoppingBag },
  DELIVERY: { label: 'Delivery', icon: Bike },
  DRIVE_THRU: { label: 'Drive-thru', icon: Car },
  ROOM_SERVICE: { label: 'Room service', icon: Home },
  PICKUP: { label: 'Pickup', icon: Package },
};

const STATUS: Partial<Record<OrderStatus, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'brand' }>> = {
  PLACED: { label: 'Naya', variant: 'info' },
  CONFIRMED: { label: 'Confirm', variant: 'info' },
  COOKING: { label: 'Ban raha', variant: 'warning' },
  READY: { label: 'Tayyar', variant: 'success' },
  SERVED: { label: 'Serve ho gaya', variant: 'default' },
  OUT_FOR_DELIVERY: { label: 'Raste me', variant: 'brand' },
  ON_HOLD: { label: 'Ruka hua', variant: 'default' },
};

const TABLE: Record<TableStatus, { label: string; dot: string; tile: string }> = {
  AVAILABLE: { label: 'Khaali', dot: 'bg-success-500', tile: 'border-success-200 bg-success-50/50' },
  OCCUPIED: { label: 'Bhari', dot: 'bg-rose-500', tile: 'border-rose-200 bg-rose-50/60' },
  RESERVED: { label: 'Reserved', dot: 'bg-amber-500', tile: 'border-amber-200 bg-amber-50/60' },
  CLEANING: { label: 'Safai', dot: 'bg-sky-500', tile: 'border-sky-200 bg-sky-50/60' },
  OUT_OF_SERVICE: { label: 'Band', dot: 'bg-slate-400', tile: 'border-slate-200 bg-slate-50' },
};

const mins = (m: number) => (m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`);

/** Restaurant headline numbers, offered next to the common ones. */
export const restaurantKpis: KpiDef[] = [
  {
    id: 'restaurant-live', label: 'Chaalu orders', icon: ChefHat, tone: 'warning',
    useValue: () => {
      const { orders, loading } = useRestaurantOps();
      return {
        loading, to: '/restaurant/orders', value: orders.open.length, alert: orders.late.length > 0,
        hint: orders.late.length ? `${orders.late.length} late!` : `${orders.cooking} ban rahe · ${orders.ready.length} tayyar`,
      };
    },
  },
  {
    id: 'restaurant-tables', label: 'Tables bhari', icon: Utensils, tone: 'neutral',
    useValue: () => {
      const { tables, loading } = useRestaurantOps();
      return {
        loading, to: '/restaurant/tables',
        value: tables.total ? `${tables.occupied}/${tables.total}` : '—',
        hint: tables.total ? `${tables.available} khaali · ${tables.reserved} reserved` : 'Tables nahi banaye',
      };
    },
  },
  {
    id: 'restaurant-kitchen', label: 'Kitchen queue', icon: Timer, tone: 'warning',
    useValue: () => {
      const { kitchen, loading } = useRestaurantOps();
      return {
        loading, to: '/restaurant/kot', value: kitchen.active,
        hint: kitchen.avgPrep > 0 ? `Ausat ${kitchen.avgPrep.toFixed(0)} min` : `${kitchen.cooking} ban rahe`,
      };
    },
  },
  {
    id: 'restaurant-tips', label: 'Aaj ki tips', icon: Sparkles, tone: 'success',
    useValue: () => {
      const { tips, loading } = useRestaurantOps();
      const { sales } = useMasked();
      return { loading, value: sales(tips), hint: 'Staff ke liye' };
    },
  },
  {
    id: 'restaurant-deliveries', label: 'Delivery raste me', icon: Bike, tone: 'info',
    useValue: () => {
      const { deliveries, loading } = useRestaurantOps();
      return { loading, to: '/restaurant/delivery', value: deliveries, hint: 'Riders ke paas' };
    },
  },
];

export function useRestaurantAttention(): AttentionItem[] {
  const { orders, tables, kitchen } = useRestaurantOps();
  const items: AttentionItem[] = [];

  if (orders.late.length) items.push({ icon: AlertTriangle, level: 'danger', text: `${orders.late.length} order ka waqt guzar gaya — kitchen se poochein`, to: '/restaurant/kot', cta: 'Kitchen dekhein' });
  if (orders.ready.length) items.push({ icon: BellRing, level: 'warning', text: `${orders.ready.length} order tayyar pada hai — thanda hone se pehle serve karein`, to: '/restaurant/orders', cta: 'Orders dekhein' });
  if (tables.reservedSoon.length) items.push({ icon: CalendarClock, level: 'info', text: `${tables.reservedSoon.length} reservation agle ghante me — table tayyar rakhein`, to: '/restaurant/tables', cta: 'Tables dekhein' });
  if (tables.cleaning) items.push({ icon: Sparkles, level: 'info', text: `${tables.cleaning} table safai ke intezar me — saaf ho to naye customer baith sakte hain`, to: '/restaurant/tables', cta: 'Tables dekhein' });
  if (kitchen.active >= 10) items.push({ icon: ChefHat, level: 'warning', text: `Kitchen me ${kitchen.active} KOT chal rahe hain — rush hai`, to: '/restaurant/kot', cta: 'KOT dekhein' });
  if (tables.total > 0 && tables.available === 0) items.push({ icon: Users, level: 'neutral', text: 'Sab tables bhari hain — aane walon ko intezar ka waqt batayein', to: '/restaurant/tables', cta: 'Tables' });
  return items;
}

export function RestaurantFloor() {
  const { tables } = useRestaurantOps();
  return (
    <WidgetCard
      title="Table floor"
      icon={Utensils}
      description={tables.total ? `${tables.occupied} bhari · ${tables.available} khaali · ${tables.seats} log baithe` : 'Abhi koi table nahi'}
      to="/restaurant/tables"
      linkLabel="Tables"
    >
      {tables.total === 0 ? (
        <EmptyHint icon={Utensils} text="Tables bana lein — kaunsi bhari hai, kaunsi khaali, sab yahan nazar aayega." />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2">
            {tables.list.slice(0, 40).map((t) => {
              const s = TABLE[t.status] ?? TABLE.OUT_OF_SERVICE;
              return (
                <Link
                  key={t.id}
                  to="/restaurant/tables"
                  title={`${t.tableName || t.tableNumber} · ${s.label}`}
                  className={cn('relative rounded-lg border px-1 py-2 text-center transition hover:border-slate-400', s.tile)}
                >
                  <span className={cn('absolute right-1 top-1 h-1.5 w-1.5 rounded-full', s.dot)} />
                  <span className="block text-[0.875rem] font-bold tabular-nums text-slate-900">{t.tableNumber}</span>
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[0.6875rem] text-slate-500"><Users className="h-2.5 w-2.5" />{t.capacity}</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-slate-600">
            {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', TABLE[k].dot)} /> {TABLE[k].label}
              </span>
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
}

export function RestaurantLiveOrders() {
  const { orders } = useRestaurantOps();
  const { sales, salesHidden } = useMasked();
  return (
    <WidgetCard
      title="Chaalu orders"
      icon={ChefHat}
      description={orders.open.length ? `${orders.open.length} khule${salesHidden ? '' : ` · ${sales(orders.value)}`}` : 'Koi order khula nahi'}
      to="/restaurant/orders"
      flush
    >
      <RowList empty="Koi order khula nahi — POS se naya order banayein" emptyIcon={ChefHat}>
        {orders.list.map((o) => {
          const mode = MODES[o.mode] ?? MODES.DINE_IN;
          const st = STATUS[o.status];
          const table = (o.table as { tableNumber?: string } | undefined)?.tableNumber;
          return (
            <ListRow
              key={o.id}
              to={`/restaurant/orders/${o.id}`}
              leading={<IconBubble icon={mode.icon} tone={o.late ? 'danger' : o.status === 'READY' ? 'success' : 'neutral'} />}
              title={<>{o.customerName || (table ? `Table ${table}` : mode.label)} <span className="font-mono text-[0.75rem] font-normal text-slate-500">{o.orderNumber}</span></>}
              meta={`${mode.label}${table ? ` · T-${table}` : ''} · ${o.items?.length ?? 0} items · ${mins(o.age)} pehle`}
              value={sales(o.total)}
              valueHint={o.late ? <Badge variant="danger" size="xs">Late</Badge> : st && <Badge variant={st.variant} size="xs">{st.label}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function RestaurantKitchen() {
  const { kitchen, orders } = useRestaurantOps();
  return (
    <WidgetCard title="Kitchen" icon={Timer} description="Aaj ki raftaar aur abhi ki queue" to="/restaurant/kot" linkLabel="KOT">
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[['Queue me', kitchen.active, 'text-slate-900'], ['Ban rahe', kitchen.cooking, 'text-amber-700'], ['Tayyar', kitchen.ready, 'text-success-700']].map(([label, n, color]) => (
          <div key={label as string} className="rounded-lg bg-slate-50 py-2.5">
            <dd className={cn('text-xl font-bold tabular-nums', color as string)}>{n}</dd>
            <dt className="text-[0.75rem] text-slate-500">{label}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricTile icon={ChefHat} tone="warning" label="Banane ka ausat" value={kitchen.avgPrep > 0 ? `${kitchen.avgPrep.toFixed(1)} min` : '—'} hint="Cooking se tayyar tak" />
        <MetricTile icon={BellRing} tone="success" label="Serve ka ausat" value={kitchen.avgServe > 0 ? `${kitchen.avgServe.toFixed(1)} min` : '—'} hint={`Aaj ${kitchen.completed} mukammal`} />
      </div>
      {orders.late.length > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {orders.late.length} order apne waqt se late hain
        </p>
      )}
    </WidgetCard>
  );
}

export function RestaurantModes() {
  const { orders } = useRestaurantOps();
  const { sales } = useMasked();
  const max = Math.max(1, ...orders.modes.map((m) => m.count));
  return (
    <WidgetCard title="Order type" icon={ShoppingBag} description="Khule orders — dine-in, takeaway, delivery">
      {orders.modes.length === 0 ? (
        <EmptyHint icon={ShoppingBag} text="Abhi koi order khula nahi" />
      ) : (
        <ul className="space-y-3">
          {orders.modes.map((m) => {
            const cfg = MODES[m.mode] ?? MODES.DINE_IN;
            return (
              <li key={m.mode}>
                <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
                  <span className="inline-flex items-center gap-2 font-medium text-slate-800"><cfg.icon className="h-4 w-4 text-slate-500" /> {cfg.label}</span>
                  <span className="tabular-nums text-slate-600"><b className="text-slate-900">{m.count}</b> · {sales(m.value)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${(m.count / max) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
