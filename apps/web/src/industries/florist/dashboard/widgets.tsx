/** Florist-only dashboard widgets. */

import { AlertTriangle, CalendarHeart, Flower2, Heart, Leaf, Package, Repeat, Truck } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import type { FloristDeliveryTimeSlot } from '../api/orders.api';
import { flowerName, useFloristOps } from './useFloristOps';

const SLOT: Record<FloristDeliveryTimeSlot, { label: string; variant: 'warning' | 'info' | 'brand' | 'danger' | 'default' }> = {
  MORNING_9_12: { label: 'Subah 9–12', variant: 'warning' },
  AFTERNOON_12_3: { label: 'Dopahar 12–3', variant: 'info' },
  EVENING_3_6: { label: 'Shaam 3–6', variant: 'brand' },
  NIGHT_6_9: { label: 'Raat 6–9', variant: 'default' },
  URGENT: { label: 'Foran', variant: 'danger' },
  SCHEDULED: { label: 'Khaas waqt', variant: 'default' },
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Pakka', IN_PREPARATION: 'Ban raha', READY_FOR_DELIVERY: 'Tayyar', OUT_FOR_DELIVERY: 'Raste me',
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

/** Florist headline numbers, offered next to the common ones. */
export const floristKpis: KpiDef[] = [
  {
    id: 'florist-deliveries', label: 'Aaj ki delivery', icon: Truck, tone: 'brand',
    useValue: () => {
      const { deliveries: d, loading } = useFloristOps();
      return {
        loading, to: '/florist/deliveries', value: d.pending,
        hint: d.notReady ? `${d.notReady} abhi banana hai` : `${d.delivered} pohnch gayi`,
      };
    },
  },
  {
    id: 'florist-orders', label: 'Chaalu order', icon: Package, tone: 'info',
    useValue: () => {
      const { activeOrders, deliveries, loading } = useFloristOps();
      return { loading, to: '/florist/orders', value: activeOrders, hint: deliveries.out ? `${deliveries.out} raste me` : 'tayyari se delivery tak' };
    },
  },
  {
    id: 'florist-weddings', label: 'Shadiyan', icon: Heart, tone: 'warning',
    useValue: () => {
      const { weddings: w, loading } = useFloristOps();
      const next = w.list[0];
      return {
        loading, to: '/florist/weddings', value: w.count, alert: w.soon.length > 0,
        hint: next ? `agli ${shortDate(next.weddingDate)}` : '30 din me koi nahi',
      };
    },
  },
  {
    id: 'florist-wilting', label: 'Murjhane wale', icon: Leaf, tone: 'danger',
    useValue: () => {
      const { wilting, loading } = useFloristOps();
      return {
        loading, to: '/florist/freshness', value: wilting.soon + wilting.withered.length, alert: wilting.withered.length > 0,
        hint: wilting.withered.length ? `${wilting.withered.length} murjha gaye` : '3 din ke andar',
      };
    },
  },
  {
    id: 'florist-subscriptions', label: 'Subscription', icon: Repeat, tone: 'neutral',
    useValue: () => {
      const { subs, loading } = useFloristOps();
      return { loading, to: '/florist/subscriptions', value: subs.list.length, hint: `hafte me · ${subs.active} chaalu` };
    },
  },
  {
    id: 'florist-wedding-due', label: 'Shadi ka baqi', icon: CalendarHeart, tone: 'danger', sensitive: true,
    useValue: () => {
      const { weddings: w, loading } = useFloristOps();
      const { cost } = useMasked();
      return { loading, to: '/florist/weddings', value: cost(w.balance), hint: `${w.list.length} aane wali shadiyan` };
    },
  },
];

export function useFloristAttention(): AttentionItem[] {
  const { deliveries, weddings, wilting, subs, loading } = useFloristOps();
  const items: AttentionItem[] = [];
  if (loading) return items;

  if (wilting.withered.length) items.push({ icon: Leaf, level: 'danger', text: `${wilting.withered.length} phool murjha chuke — shelf se hatayein`, to: '/florist/freshness', cta: 'Freshness dekhein' });
  if (deliveries.notReady) items.push({ icon: Truck, level: 'warning', text: `${deliveries.notReady} delivery aaj ki hai aur bouquet abhi tayyar nahi`, to: '/florist/deliveries', cta: 'Delivery dekhein' });
  if (weddings.soon.length) items.push({ icon: Heart, level: 'warning', text: `${weddings.soon.length} shadi 3 din ke andar — phool aur setup ka intezam karein`, to: '/florist/weddings', cta: 'Shadiyan dekhein' });
  if (wilting.soon > 0) items.push({ icon: Leaf, level: 'warning', text: `${wilting.soon} phool 3 din me murjha jayenge — discount laga dein`, to: '/florist/freshness', cta: 'Jaldi bechein' });
  if (subs.today.length) items.push({ icon: Repeat, level: 'info', text: `${subs.today.length} subscription bouquet kal tak dena hai`, to: '/florist/subscriptions', cta: 'Dekhein' });
  if (weddings.unconfirmed.length) items.push({ icon: AlertTriangle, level: 'neutral', text: `${weddings.unconfirmed.length} shadi ka quote abhi pakka nahi hua`, to: '/florist/weddings', cta: 'Follow up' });
  return items;
}

export function FloristDeliveries() {
  const { deliveries: d } = useFloristOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title="Aaj ki delivery"
      icon={Truck}
      description={d.pending ? `${d.pending} baqi · ${sales(d.value)}` : d.delivered ? `${d.delivered} pohnch gayi` : 'Aaj koi delivery nahi'}
      to="/florist/deliveries"
      flush
    >
      <RowList empty="Aaj koi delivery baqi nahi" emptyIcon={Truck}>
        {d.list.slice(0, 6).map((o) => {
          const slot = SLOT[o.deliveryTimeSlot ?? 'SCHEDULED'] ?? SLOT.SCHEDULED;
          return (
            <ListRow
              key={o.id}
              to="/florist/orders"
              leading={<IconBubble icon={Flower2} tone={o.status === 'OUT_FOR_DELIVERY' ? 'success' : 'neutral'} />}
              title={o.recipientName || o.customerName || 'Customer'}
              meta={<span><span className="font-mono">{o.orderNumber}</span>{o.area ? ` · ${o.area}` : ''} · {STATUS_LABEL[o.status] ?? o.status}</span>}
              value={sales(o.totalAmount)}
              valueHint={<Badge variant={slot.variant} size="xs">{slot.label}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function FloristWeddings() {
  const { weddings: w } = useFloristOps();
  const { cost, costHidden } = useMasked();
  return (
    <WidgetCard
      title="Aane wali shadiyan"
      icon={Heart}
      description={w.balance > 0 && !costHidden ? `${formatPKR(w.balance)} baqi lena hai` : 'Agle 30 din'}
      to="/florist/weddings"
      flush
    >
      <RowList empty="30 din me koi shadi book nahi" emptyIcon={Heart}>
        {w.list.slice(0, 6).map((x) => (
          <ListRow
            key={x.id}
            to="/florist/weddings"
            leading={<IconBubble icon={Heart} tone={x.days <= 3 ? 'danger' : x.status === 'QUOTED' ? 'neutral' : 'warning'} />}
            title={`${x.brideName} & ${x.groomName}`}
            meta={`${shortDate(x.weddingDate)}${x.status === 'QUOTED' ? ' · quote' : ''}${x.balance > 0 ? ` · baqi ${cost(x.balance)}` : ''}`}
            value={<Badge variant={x.days <= 3 ? 'danger' : x.days <= 7 ? 'warning' : 'default'} size="xs">{x.days <= 0 ? 'Aaj' : `${x.days} din`}</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function FloristWilting() {
  const { wilting } = useFloristOps();
  return (
    <WidgetCard
      title="Murjhane wale phool"
      icon={Leaf}
      description={wilting.withered.length ? `${wilting.withered.length} murjha gaye · ${wilting.soon} 3 din me` : '3 din ke andar'}
      to="/florist/freshness"
      flush
    >
      <RowList empty="Saare phool taaza hain" emptyIcon={Leaf}>
        {wilting.list.slice(0, 6).map((p) => {
          const gone = p.days !== null && p.days <= 0;
          return (
            <ListRow
              key={p.id}
              to={`/florist-products/${p.productId}`}
              leading={<IconBubble icon={Leaf} tone={gone ? 'danger' : 'warning'} />}
              title={flowerName(p)}
              meta={p.color || undefined}
              value={<Badge variant={gone ? 'danger' : 'warning'} size="xs">{p.days === null ? '—' : gone ? 'Murjha gaya' : `${p.days} din`}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function FloristSubscriptions() {
  const { subs } = useFloristOps();
  const { sales } = useMasked();
  return (
    <WidgetCard title="Subscription bouquet" icon={Repeat} description={`Agle 7 din · ${subs.active} chaalu plan`} to="/florist/subscriptions" flush>
      <RowList empty="Is hafte koi subscription delivery nahi" emptyIcon={Repeat}>
        {subs.list.slice(0, 6).map((s) => {
          const due = s.days !== null && s.days <= 1;
          return (
            <ListRow
              key={s.id}
              to="/florist/subscriptions"
              icon={Repeat}
              title={s.customerName || 'Customer'}
              meta={`${s.planName}${s.bouquetType ? ` · ${s.bouquetType}` : ''}`}
              value={sales(s.pricePerDelivery)}
              valueHint={<Badge variant={due ? 'warning' : 'default'} size="xs">{s.days === null ? '—' : s.days < 0 ? 'Late' : s.days === 0 ? 'Aaj' : `${s.days} din`}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}
