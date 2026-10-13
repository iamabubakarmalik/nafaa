/** Jewelry-only dashboard widgets. */

import { AlertTriangle, CalendarClock, Coins, Gem, Hammer, Palette, Repeat, Scale, Users } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { fmtGrams, metalLabel, useJewelryOps } from './useJewelryOps';

/** Jewelry headline numbers, offered next to the common ones. */
export const jewelryKpis: KpiDef[] = [
  {
    id: 'jewelry-gold-rate', label: 'Sone ka rate', icon: Coins, tone: 'warning',
    useValue: () => {
      const { rates, loading } = useJewelryOps();
      const { sales } = useMasked();
      const g = rates.gold;
      return {
        loading, to: '/jewelry/metal-rates', alert: !g || rates.stale,
        value: g ? sales(g.ratePerGram) : '—',
        hint: !g ? 'rate nahi lagaya' : rates.stale ? `${rates.ageDays} din purana` : `${metalLabel(g.metalType, g.purity)} · fi gram`,
      };
    },
  },
  {
    id: 'jewelry-weight', label: 'Aaj wazan bika', icon: Scale, tone: 'brand',
    useValue: () => {
      const { today, loading } = useJewelryOps();
      return { loading, to: '/jewelry/sales', value: fmtGrams(today.weightSold), hint: `${today.sales} bill` };
    },
  },
  {
    id: 'jewelry-orders', label: 'Custom order', icon: Palette, tone: 'warning',
    useValue: () => {
      const { orders, loading } = useJewelryOps();
      return {
        loading, to: '/jewelry/custom-orders', value: orders.pending, alert: orders.late.length > 0,
        hint: orders.late.length ? `${orders.late.length} late!` : orders.soon.length ? `${orders.soon.length} 2 din me dene` : 'chaalu',
      };
    },
  },
  {
    id: 'jewelry-exchanges', label: 'Aaj purana sona', icon: Repeat, tone: 'info',
    useValue: () => {
      const { today, monthly, loading } = useJewelryOps();
      return { loading, to: '/jewelry/exchanges', value: today.exchanges, hint: `30 din: ${monthly.exchangesCount} · ${fmtGrams(monthly.exchangesGold)}` };
    },
  },
  {
    id: 'jewelry-metal', label: 'Kachcha sona-chandi', icon: Gem, tone: 'success', sensitive: true,
    useValue: () => {
      const { metal, loading } = useJewelryOps();
      const { cost } = useMasked();
      return { loading, to: '/jewelry/metal-stock', value: cost(metal.value), hint: `${fmtGrams(metal.gold)} sona · ${fmtGrams(metal.silver)} chandi` };
    },
  },
];

export function useJewelryAttention(): AttentionItem[] {
  const { rates, orders, karigars } = useJewelryOps();
  const items: AttentionItem[] = [];
  if (rates.list.length === 0) items.push({ icon: Coins, level: 'danger', text: 'Sone-chandi ka rate nahi lagaya — bill sahi qeemat par nahi banenge', to: '/jewelry/metal-rates', cta: 'Rate lagayein' });
  else if (rates.stale) items.push({ icon: Coins, level: 'warning', text: `Rate ${rates.ageDays} din purana hai — aaj ka rate update karein`, to: '/jewelry/metal-rates', cta: 'Rate update' });
  if (orders.late.length) items.push({ icon: AlertTriangle, level: 'danger', text: `${orders.late.length} custom order ka waada guzar gaya — customer ko batayein`, to: '/jewelry/custom-orders', cta: 'Orders dekhein' });
  if (orders.soon.length) items.push({ icon: CalendarClock, level: 'info', text: `${orders.soon.length} custom order agle 2 din me dena hai`, to: '/jewelry/custom-orders', cta: 'Dekhein' });
  if (karigars.gramsOut > 0) items.push({ icon: Hammer, level: 'neutral', text: `Karigaron ke paas ${fmtGrams(karigars.gramsOut)} metal hai — return ka hisaab rakhein`, to: '/jewelry/karigars', cta: 'Karigar' });
  return items;
}

export function JewelryRates() {
  const { rates } = useJewelryOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title="Aaj ke rate"
      icon={Coins}
      description={rates.list.length === 0 ? 'Rate nahi lagaya' : rates.stale ? `${rates.ageDays} din purana — update karein` : 'Fi gram, aaj ka'}
      to="/jewelry/metal-rates"
      linkLabel="Update"
      flush
    >
      <RowList empty="Aaj ka sone-chandi ka rate lagayein" emptyIcon={Coins}>
        {rates.list.slice(0, 8).map((r) => (
          <ListRow
            key={r.id}
            leading={<IconBubble icon={Coins} tone={r.metalType === 'GOLD' ? 'warning' : 'neutral'} />}
            title={metalLabel(r.metalType, r.purity)}
            meta={r.ratePerTola ? `Tola ${sales(r.ratePerTola)}` : undefined}
            value={sales(r.ratePerGram)}
            valueHint={rates.stale ? <Badge variant="warning" size="xs">Purana</Badge> : undefined}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

export function JewelryOrders() {
  const { orders } = useJewelryOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title="Custom order"
      icon={Palette}
      description={orders.late.length ? `${orders.late.length} late · ${orders.pending} chaalu` : `${orders.pending} chaalu`}
      to="/jewelry/custom-orders"
      flush
    >
      <RowList empty="Koi custom order baqi nahi" emptyIcon={Palette}>
        {orders.list.map((o) => {
          const late = o.left !== null && o.left < 0;
          const soon = o.left !== null && o.left <= 2;
          const when = o.left === null ? '—' : late ? `${-o.left} din late` : o.left === 0 ? 'Aaj' : `${o.left} din`;
          return (
            <ListRow
              key={o.id}
              to="/jewelry/custom-orders"
              icon={Palette}
              title={o.customerName || 'Customer'}
              meta={<span><span className="font-mono">{o.orderNumber}</span>{o.category ? ` · ${o.category}` : ''}{o.due > 0 ? ` · baqi ${cost(o.due)}` : ''}</span>}
              value={<Badge variant={late ? 'danger' : soon ? 'warning' : 'default'} size="xs">{when}</Badge>}
            />
          );
        })}
      </RowList>
    </WidgetCard>
  );
}

export function JewelryMetal() {
  const { metal, karigars } = useJewelryOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title="Kachcha metal"
      icon={Gem}
      description={metal.list.length ? `Aaj ke rate par ${cost(metal.value)}` : 'Tijori me kachcha sona-chandi'}
      to="/jewelry/metal-stock"
      flush
    >
      <RowList empty="Metal stock ki entry nahi — purchase ya opening darj karein" emptyIcon={Gem}>
        {[
          ...metal.list.slice(0, 6).map((b) => (
            <ListRow
              key={`${b.metalType}-${b.purity}`}
              leading={<IconBubble icon={Gem} tone={b.metalType === 'GOLD' ? 'warning' : 'neutral'} />}
              title={metalLabel(b.metalType, b.purity)}
              meta={b.value ? cost(b.value) : 'rate nahi laga'}
              value={fmtGrams(b.balanceGrams)}
            />
          )),
          ...(karigars.gramsOut > 0 ? [
            <ListRow key="karigar" to="/jewelry/karigars" leading={<IconBubble icon={Hammer} tone="info" />} title="Karigaron ke paas" meta="Diya hua, abhi wapas nahi aaya" value={fmtGrams(karigars.gramsOut)} />,
          ] : []),
        ]}
      </RowList>
    </WidgetCard>
  );
}

export function JewelryWeight() {
  const { today, monthly } = useJewelryOps();
  const { cost } = useMasked();
  return (
    <WidgetCard title="Wazan ka hisaab" icon={Scale} description="Pichle 30 din, gram me" to="/jewelry/sales">
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={Coins} tone="warning" label="Sona bika" value={fmtGrams(monthly.goldSold)} hint={`Aaj ${fmtGrams(today.weightSold)} kul`} />
        <MetricTile icon={Gem} tone="neutral" label="Chandi biki" value={fmtGrams(monthly.silverSold)} hint={`${monthly.sales} bill`} />
        <MetricTile icon={Repeat} tone="info" label="Purana sona aaya" value={fmtGrams(monthly.exchangesGold)} hint={`${monthly.exchangesCount} exchange · ${cost(monthly.exchangesValue)}`} to="/jewelry/exchanges" />
        <MetricTile icon={AlertTriangle} tone="danger" label="Baqi lena" value={cost(monthly.outstanding)} hint="Zewar ke bill par" alert={monthly.outstanding > 0} to="/jewelry/sales" />
      </div>
    </WidgetCard>
  );
}

export function JewelryKarigars() {
  const { karigars } = useJewelryOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title="Karigar"
      icon={Users}
      description={karigars.gramsOut > 0 ? `${fmtGrams(karigars.gramsOut)} metal un ke paas` : `${karigars.active} kaam par`}
      to="/jewelry/karigars"
      flush
    >
      <RowList empty="Koi karigar darj nahi" emptyIcon={Users}>
        {karigars.list.map((k) => (
          <ListRow
            key={k.id}
            to="/jewelry/karigars"
            icon={Hammer}
            title={k.fullName}
            meta={`${k.completedOrders} order${k.skillLevel ? ` · ${k.skillLevel}` : ''} · ${cost(k.totalEarnings)}`}
            value={k.outstandingGrams > 0 ? <Badge variant="warning" size="xs">{fmtGrams(k.outstandingGrams)} baqi</Badge> : <Badge variant="success" size="xs">Saaf</Badge>}
          />
        ))}
      </RowList>
    </WidgetCard>
  );
}

/** Raw metal valued at today's rate, as an extra "where the money is" tile. */
export function useJewelryMoneyTiles(): MoneyTileProps[] {
  const { metal, karigars } = useJewelryOps();
  if (!metal.list.length && !karigars.gramsOut) return [];
  return [{
    key: 'metal', icon: Gem, tone: 'warning', to: '/jewelry/metal-stock', label: 'Kachcha sona-chandi',
    value: formatPKR(metal.value),
    hint: karigars.gramsOut > 0 ? `${fmtGrams(metal.gold)} sona · ${fmtGrams(karigars.gramsOut)} karigar ke paas` : `${fmtGrams(metal.gold)} sona · ${fmtGrams(metal.silver)} chandi`,
  }];
}
