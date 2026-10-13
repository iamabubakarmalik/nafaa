/** Furniture-only dashboard widgets: custom order pipeline, late orders, deliveries and carpenters. */

import { CheckCircle2, ClipboardList, Clock, Hammer, PackageCheck, Truck, Wallet } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { useFurnitureOps } from './useFurnitureOps';

const ORDERS = '/furniture/custom-orders';
const DELIVERIES = '/furniture/deliveries';

export const furnitureKpis: KpiDef[] = [
  {
    id: 'furniture-orders', label: 'Chaalu orders', icon: ClipboardList, tone: 'brand',
    useValue: () => {
      const f = useFurnitureOps();
      return { loading: f.loading, to: ORDERS, value: f.activeOrders, hint: f.quotations ? `${f.quotations} quotation baqi` : 'custom orders' };
    },
  },
  {
    id: 'furniture-late', label: 'Late orders', icon: Clock, tone: 'danger',
    useValue: () => {
      const f = useFurnitureOps();
      return { loading: f.loading, to: ORDERS, value: f.overdue.length, alert: f.overdue.length > 0, hint: f.overdue.length ? 'waqt guzar gaya' : 'sab waqt par' };
    },
  },
  {
    id: 'furniture-deliveries', label: 'Aaj delivery', icon: Truck, tone: 'info',
    useValue: () => {
      const f = useFurnitureOps();
      return { loading: f.loading, to: DELIVERIES, value: f.todayDeliveries, hint: `${f.pendingDeliveries} baqi kul` };
    },
  },
  {
    id: 'furniture-receivable', label: 'Orders ka baqi', icon: Wallet, tone: 'warning', sensitive: true,
    useValue: () => {
      const f = useFurnitureOps();
      const { cost } = useMasked();
      return { loading: f.loading, to: ORDERS, value: cost(f.receivable), hint: `${cost(f.collected)} mil chuka` };
    },
  },
];

export function useFurnitureAttention(): AttentionItem[] {
  const f = useFurnitureOps();
  const items: AttentionItem[] = [];
  if (f.overdue.length) items.push({ icon: Clock, level: 'danger', text: `${f.overdue.length} custom order late hai — customer ko nayi date batayein`, to: ORDERS, cta: 'Orders dekhein' });
  if (f.ready.length) items.push({ icon: PackageCheck, level: 'warning', text: `${f.ready.length} order tayyar para hai — delivery schedule karein aur baqi paisa lein`, to: DELIVERIES, cta: 'Delivery lagayein' });
  if (f.todayDeliveries) items.push({ icon: Truck, level: 'info', text: `${f.todayDeliveries} delivery aaj jani hai`, to: DELIVERIES, cta: 'Deliveries' });
  if (f.quotations) items.push({ icon: ClipboardList, level: 'info', text: `${f.quotations} quotation customer ki haan ka intezar kar rahi hai — follow up karein`, to: `${ORDERS}?status=QUOTATION`, cta: 'Quotations' });
  return items;
}

export function FurniturePipeline() {
  const f = useFurnitureOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title="Custom orders"
      icon={ClipboardList}
      description={`${f.pipelineTotal} chaalu · ${f.delivered} de chuke`}
      to={ORDERS}
    >
      {f.pipelineTotal === 0 ? (
        <div className="flex items-center gap-3">
          <IconBubble icon={ClipboardList} />
          <p className="text-[0.8125rem] text-slate-600">Abhi koi custom order nahi — naya order banayein, naap aur advance sab yahan nazar aayega.</p>
        </div>
      ) : (
        <>
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
            {f.pipeline.filter((p) => p.count > 0).map((p) => (
              <div key={p.key} className={p.color} style={{ width: `${(p.count / f.pipelineTotal) * 100}%` }} />
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {f.pipeline.map((p) => (
              <div key={p.key} className="rounded-lg bg-slate-50 px-2 py-2.5 text-center">
                <dd className="text-xl font-bold tabular-nums text-slate-900">{p.count}</dd>
                <dt className="flex items-center justify-center gap-1.5 text-[0.75rem] text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${p.color}`} />{p.label}
                </dt>
              </div>
            ))}
          </dl>
        </>
      )}
      {!costHidden && (f.receivable > 0 || f.monthRevenue > 0) && (
        <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 text-[0.8125rem]">
          <span className="text-slate-500">Baqi lena <strong className="tabular-nums text-amber-700">{cost(f.receivable)}</strong></span>
          <span className="text-slate-500">Mahine ki kamai <strong className="tabular-nums text-slate-900">{cost(f.monthRevenue)}</strong></span>
        </div>
      )}
    </WidgetCard>
  );
}

export function FurnitureLateOrders() {
  const f = useFurnitureOps();
  const { cost } = useMasked();
  return (
    <WidgetCard title="Late orders" icon={Clock} description="Delivery ki date guzar gayi" to={ORDERS} flush>
      <RowList empty="Sab orders waqt par hain" emptyIcon={CheckCircle2}>
        {f.overdue.slice(0, 6).map((o) => (
          <ListRow
            key={o.id}
            to={`${ORDERS}/${o.id}`}
            leading={<IconBubble icon={Clock} tone="danger" />}
            title={o.customerName || 'Customer'}
            meta={<span className="font-mono">{o.orderNumber} · {o.productType}{Number(o.balanceAmount) > 0 ? ` · baqi ${cost(Number(o.balanceAmount))}` : ''}</span>}
            value={<Badge variant="danger" size="xs">{o.daysLate} din late</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function FurnitureDeliveries() {
  const f = useFurnitureOps();
  return (
    <WidgetCard title="Aaj ki deliveries" icon={Truck} description={`${f.schedule.length} aaj · ${f.pendingDeliveries} baqi kul`} to={DELIVERIES} flush>
      <RowList empty="Aaj koi delivery nahi" emptyIcon={Truck}>
        {f.schedule.slice(0, 6).map((d) => {
          const done = d.status === 'DELIVERED' || d.status === 'COMPLETED';
          return (
            <ListRow
              key={d.id}
              to={DELIVERIES}
              leading={<IconBubble icon={Truck} tone={done ? 'success' : 'info'} />}
              title={d.customerName || 'Customer'}
              meta={<span className="font-mono">{d.deliveryNumber}{d.itemsCount ? ` · ${d.itemsCount} items` : ''}</span>}
              value={<Badge variant={done ? 'success' : 'default'} size="xs">{done ? 'Pohanch gaya' : d.scheduledSlot || 'Kisi bhi waqt'}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function FurnitureCarpenters() {
  const f = useFurnitureOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title="Karigar" icon={Hammer} description={`${f.activeCarpenters}/${f.carpenters} kaam par`} to="/furniture/carpenters" flush>
      <RowList empty="Abhi koi karigar nahi — team add karein" emptyIcon={Hammer}>
        {f.topCarpenters.slice(0, 6).map((c) => (
          <ListRow
            key={c.id}
            to="/furniture/carpenters"
            leading={c.photoUrl
              ? <img src={c.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
              : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">{c.name.charAt(0)}</span>}
            title={c.name}
            meta={`${c.activeProjects ?? 0} chaalu · ${c.completedProjects ?? 0} mukammal`}
            value={sales(Number(c.totalRevenue || 0))}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Money still due on custom orders, as an extra money-map tile. */
export function useFurnitureMoneyTiles(): MoneyTileProps[] {
  const f = useFurnitureOps();
  if (f.receivable <= 0) return [];
  return [{
    key: 'custom-orders', icon: ClipboardList, tone: 'warning', to: ORDERS, label: 'Custom orders ka baqi',
    value: formatPKR(f.receivable), hint: `${f.activeOrders} chaalu · ${formatPKR(f.collected)} mil chuka`,
  }];
}
