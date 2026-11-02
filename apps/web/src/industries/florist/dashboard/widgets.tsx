/** Florist-only dashboard widgets. */

import { AlertTriangle, CalendarHeart, Flower2, Heart, Leaf, Package, Repeat, Truck } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import type { FloristDeliveryTimeSlot } from '../api/orders.api';
import { flowerName, useFloristOps } from './useFloristOps';
import { t } from '@core/i18n';

const SLOT: Record<FloristDeliveryTimeSlot, { label: string; variant: 'warning' | 'info' | 'brand' | 'danger' | 'default' }> = {
  MORNING_9_12: { label: t('Subah 9–12'), variant: 'warning' },
  AFTERNOON_12_3: { label: t('Dopahar 12–3'), variant: 'info' },
  EVENING_3_6: { label: t('Shaam 3–6'), variant: 'brand' },
  NIGHT_6_9: { label: t('Raat 6–9'), variant: 'default' },
  URGENT: { label: t('Foran'), variant: 'danger' },
  SCHEDULED: { label: t('Khaas waqt'), variant: 'default' },
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: t('Pakka'), IN_PREPARATION: t('Ban raha'), READY_FOR_DELIVERY: t('Tayyar'), OUT_FOR_DELIVERY: t('Raste me'),
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

/** Florist headline numbers, offered next to the common ones. */
export const floristKpis: KpiDef[] = [
  {
    id: 'florist-deliveries', label: t('Aaj ki delivery'), icon: Truck, tone: 'brand',
    useValue: () => {
      const { deliveries: d, loading } = useFloristOps();
      return {
        loading, to: '/florist/deliveries', value: d.pending,
        hint: d.notReady ? t('{{notReady}} abhi banana hai', { notReady: d.notReady }) : t('{{delivered}} pohnch gayi', { delivered: d.delivered }),
      };
    },
  },
  {
    id: 'florist-orders', label: t('Chaalu order'), icon: Package, tone: 'info',
    useValue: () => {
      const { activeOrders, deliveries, loading } = useFloristOps();
      return { loading, to: '/florist/orders', value: activeOrders, hint: deliveries.out ? t('{{out}} raste me', { out: deliveries.out }) : t('tayyari se delivery tak') };
    },
  },
  {
    id: 'florist-weddings', label: t('Shadiyan'), icon: Heart, tone: 'warning',
    useValue: () => {
      const { weddings: w, loading } = useFloristOps();
      const next = w.list[0];
      return {
        loading, to: '/florist/weddings', value: w.count, alert: w.soon.length > 0,
        hint: next ? t('agli {{weddingDate}}', { weddingDate: shortDate(next.weddingDate) }) : t('30 din me koi nahi'),
      };
    },
  },
  {
    id: 'florist-wilting', label: t('Murjhane wale'), icon: Leaf, tone: 'danger',
    useValue: () => {
      const { wilting, loading } = useFloristOps();
      return {
        loading, to: '/florist/freshness', value: wilting.soon + wilting.withered.length, alert: wilting.withered.length > 0,
        hint: wilting.withered.length ? t('{{count}} murjha gaye', { count: wilting.withered.length }) : t('3 din ke andar'),
      };
    },
  },
  {
    id: 'florist-subscriptions', label: t('Subscription'), icon: Repeat, tone: 'neutral',
    useValue: () => {
      const { subs, loading } = useFloristOps();
      return { loading, to: '/florist/subscriptions', value: subs.list.length, hint: t('hafte me · {{active}} chaalu', { active: subs.active }) };
    },
  },
  {
    id: 'florist-wedding-due', label: t('Shadi ka baqi'), icon: CalendarHeart, tone: 'danger', sensitive: true,
    useValue: () => {
      const { weddings: w, loading } = useFloristOps();
      const { cost } = useMasked();
      return { loading, to: '/florist/weddings', value: cost(w.balance), hint: t('{{count}} aane wali shadiyan', { count: w.list.length }) };
    },
  },
];

export function useFloristAttention(): AttentionItem[] {
  const { deliveries, weddings, wilting, subs, loading } = useFloristOps();
  const items: AttentionItem[] = [];
  if (loading) return items;

  if (wilting.withered.length) items.push({ icon: Leaf, level: 'danger', text: t('{{count}} phool murjha chuke — shelf se hatayein', { count: wilting.withered.length }), to: '/florist/freshness', cta: t('Freshness dekhein') });
  if (deliveries.notReady) items.push({ icon: Truck, level: 'warning', text: t('{{notReady}} delivery aaj ki hai aur bouquet abhi tayyar nahi', { notReady: deliveries.notReady }), to: '/florist/deliveries', cta: t('Delivery dekhein') });
  if (weddings.soon.length) items.push({ icon: Heart, level: 'warning', text: t('{{count}} shadi 3 din ke andar — phool aur setup ka intezam karein', { count: weddings.soon.length }), to: '/florist/weddings', cta: t('Shadiyan dekhein') });
  if (wilting.soon > 0) items.push({ icon: Leaf, level: 'warning', text: t('{{soon}} phool 3 din me murjha jayenge — discount laga dein', { soon: wilting.soon }), to: '/florist/freshness', cta: t('Jaldi bechein') });
  if (subs.today.length) items.push({ icon: Repeat, level: 'info', text: t('{{count}} subscription bouquet kal tak dena hai', { count: subs.today.length }), to: '/florist/subscriptions', cta: t('Dekhein') });
  if (weddings.unconfirmed.length) items.push({ icon: AlertTriangle, level: 'neutral', text: t('{{count}} shadi ka quote abhi pakka nahi hua', { count: weddings.unconfirmed.length }), to: '/florist/weddings', cta: t('Follow up') });
  return items;
}

export function FloristDeliveries() {
  const { deliveries: d } = useFloristOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title={t('Aaj ki delivery')}
      icon={Truck}
      description={d.pending ? t('{{pending}} baqi · {{sales}}', { pending: d.pending, sales: sales(d.value) }) : d.delivered ? t('{{delivered}} pohnch gayi', { delivered: d.delivered }) : t('Aaj koi delivery nahi')}
      to="/florist/deliveries"
      flush
    >
      <RowList empty={t('Aaj koi delivery baqi nahi')} emptyIcon={Truck}>
        {d.list.slice(0, 6).map((o) => {
          const slot = SLOT[o.deliveryTimeSlot ?? 'SCHEDULED'] ?? SLOT.SCHEDULED;
          return (
            <ListRow
              key={o.id}
              to="/florist/orders"
              leading={<IconBubble icon={Flower2} tone={o.status === 'OUT_FOR_DELIVERY' ? 'success' : 'neutral'} />}
              title={o.recipientName || o.customerName || t('Customer')}
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
      title={t('Aane wali shadiyan')}
      icon={Heart}
      description={w.balance > 0 && !costHidden ? t('{{balance}} baqi lena hai', { balance: formatPKR(w.balance) }) : t('Agle 30 din')}
      to="/florist/weddings"
      flush
    >
      <RowList empty={t('30 din me koi shadi book nahi')} emptyIcon={Heart}>
        {w.list.slice(0, 6).map((x) => (
          <ListRow
            key={x.id}
            to="/florist/weddings"
            leading={<IconBubble icon={Heart} tone={x.days <= 3 ? 'danger' : x.status === 'QUOTED' ? 'neutral' : 'warning'} />}
            title={`${x.brideName} & ${x.groomName}`}
            meta={`${shortDate(x.weddingDate)}${x.status === 'QUOTED' ? ' · quote' : ''}${x.balance > 0 ? ` · baqi ${cost(x.balance)}` : ''}`}
            value={<Badge variant={x.days <= 3 ? 'danger' : x.days <= 7 ? 'warning' : 'default'} size="xs">{x.days <= 0 ? t('Aaj') : t('{{days}} din', { days: x.days })}</Badge>}
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
      title={t('Murjhane wale phool')}
      icon={Leaf}
      description={wilting.withered.length ? t('{{count}} murjha gaye · {{soon}} 3 din me', { count: wilting.withered.length, soon: wilting.soon }) : t('3 din ke andar')}
      to="/florist/freshness"
      flush
    >
      <RowList empty={t('Saare phool taaza hain')} emptyIcon={Leaf}>
        {wilting.list.slice(0, 6).map((p) => {
          const gone = p.days !== null && p.days <= 0;
          return (
            <ListRow
              key={p.id}
              to={`/florist-products/${p.productId}`}
              leading={<IconBubble icon={Leaf} tone={gone ? 'danger' : 'warning'} />}
              title={flowerName(p)}
              meta={p.color || undefined}
              value={<Badge variant={gone ? 'danger' : 'warning'} size="xs">{p.days === null ? '—' : gone ? t('Murjha gaya') : t('{{days}} din', { days: p.days })}</Badge>}
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
    <WidgetCard title={t('Subscription bouquet')} icon={Repeat} description={t('Agle 7 din · {{active}} chaalu plan', { active: subs.active })} to="/florist/subscriptions" flush>
      <RowList empty={t('Is hafte koi subscription delivery nahi')} emptyIcon={Repeat}>
        {subs.list.slice(0, 6).map((s) => {
          const due = s.days !== null && s.days <= 1;
          return (
            <ListRow
              key={s.id}
              to="/florist/subscriptions"
              icon={Repeat}
              title={s.customerName || t('Customer')}
              meta={`${s.planName}${s.bouquetType ? ` · ${s.bouquetType}` : ''}`}
              value={sales(s.pricePerDelivery)}
              valueHint={<Badge variant={due ? 'warning' : 'default'} size="xs">{s.days === null ? '—' : s.days < 0 ? t('Late') : s.days === 0 ? t('Aaj') : t('{{days}} din', { days: s.days })}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}
