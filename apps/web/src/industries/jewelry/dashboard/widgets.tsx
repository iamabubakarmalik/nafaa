/** Jewelry-only dashboard widgets. */

import { AlertTriangle, CalendarClock, Coins, Gem, Hammer, Palette, Repeat, Scale, Users } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { IconBubble, ListRow, MetricTile, RowList, useMasked, WidgetCard, type KpiDef } from '@modules/dashboard/engine';
import type { AttentionItem, MoneyTileProps } from '@modules/dashboard/widgets';
import { formatPKR } from '@core/lib/format';
import { fmtGrams, metalLabel, useJewelryOps } from './useJewelryOps';
import { t } from '@core/i18n';

/** Jewelry headline numbers, offered next to the common ones. */
export const jewelryKpis: KpiDef[] = [
  {
    id: 'jewelry-gold-rate', label: t('Sone ka rate'), icon: Coins, tone: 'warning',
    useValue: () => {
      const { rates, loading } = useJewelryOps();
      const { sales } = useMasked();
      const g = rates.gold;
      return {
        loading, to: '/jewelry/metal-rates', alert: !g || rates.stale,
        value: g ? sales(g.ratePerGram) : '—',
        hint: !g ? t('rate nahi lagaya') : rates.stale ? t('{{ageDays}} din purana', { ageDays: rates.ageDays }) : t('{{metalType}} · fi gram', { metalType: metalLabel(g.metalType, g.purity) }),
      };
    },
  },
  {
    id: 'jewelry-weight', label: t('Aaj wazan bika'), icon: Scale, tone: 'brand',
    useValue: () => {
      const { today, loading } = useJewelryOps();
      return { loading, to: '/jewelry/sales', value: fmtGrams(today.weightSold), hint: t('{{sales}} bill', { sales: today.sales }) };
    },
  },
  {
    id: 'jewelry-orders', label: t('Custom order'), icon: Palette, tone: 'warning',
    useValue: () => {
      const { orders, loading } = useJewelryOps();
      return {
        loading, to: '/jewelry/custom-orders', value: orders.pending, alert: orders.late.length > 0,
        hint: orders.late.length ? t('{{count}} late!', { count: orders.late.length }) : orders.soon.length ? t('{{count}} 2 din me dene', { count: orders.soon.length }) : 'chaalu',
      };
    },
  },
  {
    id: 'jewelry-exchanges', label: t('Aaj purana sona'), icon: Repeat, tone: 'info',
    useValue: () => {
      const { today, monthly, loading } = useJewelryOps();
      return { loading, to: '/jewelry/exchanges', value: today.exchanges, hint: t('30 din: {{exchangesCount}} · {{exchangesGold}}', { exchangesCount: monthly.exchangesCount, exchangesGold: fmtGrams(monthly.exchangesGold) }) };
    },
  },
  {
    id: 'jewelry-metal', label: t('Kachcha sona-chandi'), icon: Gem, tone: 'success', sensitive: true,
    useValue: () => {
      const { metal, loading } = useJewelryOps();
      const { cost } = useMasked();
      return { loading, to: '/jewelry/metal-stock', value: cost(metal.value), hint: t('{{gold}} sona · {{silver}} chandi', { gold: fmtGrams(metal.gold), silver: fmtGrams(metal.silver) }) };
    },
  },
];

export function useJewelryAttention(): AttentionItem[] {
  const { rates, orders, karigars } = useJewelryOps();
  const items: AttentionItem[] = [];
  if (rates.list.length === 0) items.push({ icon: Coins, level: 'danger', text: t('Sone-chandi ka rate nahi lagaya — bill sahi qeemat par nahi banenge'), to: '/jewelry/metal-rates', cta: t('Rate lagayein') });
  else if (rates.stale) items.push({ icon: Coins, level: 'warning', text: t('Rate {{ageDays}} din purana hai — aaj ka rate update karein', { ageDays: rates.ageDays }), to: '/jewelry/metal-rates', cta: t('Rate update') });
  if (orders.late.length) items.push({ icon: AlertTriangle, level: 'danger', text: t('{{count}} custom order ka waada guzar gaya — customer ko batayein', { count: orders.late.length }), to: '/jewelry/custom-orders', cta: t('Orders dekhein') });
  if (orders.soon.length) items.push({ icon: CalendarClock, level: 'info', text: t('{{count}} custom order agle 2 din me dena hai', { count: orders.soon.length }), to: '/jewelry/custom-orders', cta: t('Dekhein') });
  if (karigars.gramsOut > 0) items.push({ icon: Hammer, level: 'neutral', text: t('Karigaron ke paas {{gramsOut}} metal hai — return ka hisaab rakhein', { gramsOut: fmtGrams(karigars.gramsOut) }), to: '/jewelry/karigars', cta: t('Karigar') });
  return items;
}

export function JewelryRates() {
  const { rates } = useJewelryOps();
  const { sales } = useMasked();
  return (
    <WidgetCard
      title={t('Aaj ke rate')}
      icon={Coins}
      description={rates.list.length === 0 ? t('Rate nahi lagaya') : rates.stale ? t('{{ageDays}} din purana — update karein', { ageDays: rates.ageDays }) : t('Fi gram, aaj ka')}
      to="/jewelry/metal-rates"
      linkLabel={t('Update')}
      flush
    >
      <RowList empty={t('Aaj ka sone-chandi ka rate lagayein')} emptyIcon={Coins}>
        {rates.list.slice(0, 8).map((r) => (
          <ListRow
            key={r.id}
            leading={<IconBubble icon={Coins} tone={r.metalType === 'GOLD' ? 'warning' : 'neutral'} />}
            title={metalLabel(r.metalType, r.purity)}
            meta={r.ratePerTola ? t('Tola {{ratePerTola}}', { ratePerTola: sales(r.ratePerTola) }) : undefined}
            value={sales(r.ratePerGram)}
            valueHint={rates.stale ? <Badge variant="warning" size="xs">{t('Purana')}</Badge> : undefined}
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
      title={t('Custom order')}
      icon={Palette}
      description={orders.late.length ? t('{{count}} late · {{pending}} chaalu', { count: orders.late.length, pending: orders.pending }) : t('{{pending}} chaalu', { pending: orders.pending })}
      to="/jewelry/custom-orders"
      flush
    >
      <RowList empty={t('Koi custom order baqi nahi')} emptyIcon={Palette}>
        {orders.list.map((o) => {
          const late = o.left !== null && o.left < 0;
          const soon = o.left !== null && o.left <= 2;
          const when = o.left === null ? '—' : late ? t('{{value}} din late', { value: -o.left }) : o.left === 0 ? t('Aaj') : t('{{left}} din', { left: o.left });
          return (
            <ListRow
              key={o.id}
              to="/jewelry/custom-orders"
              icon={Palette}
              title={o.customerName || t('Customer')}
              meta={<span><span className="font-mono">{o.orderNumber}</span>{o.category ? ` · ${o.category}` : ''}{o.due > 0 ? t(' · baqi {{due}}', { due: cost(o.due) }) : ''}</span>}
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
      title={t('Kachcha metal')}
      icon={Gem}
      description={metal.list.length ? t('Aaj ke rate par {{cost}}', { cost: cost(metal.value) }) : t('Tijori me kachcha sona-chandi')}
      to="/jewelry/metal-stock"
      flush
    >
      <RowList empty={t('Metal stock ki entry nahi — purchase ya opening darj karein')} emptyIcon={Gem}>
        {[
          ...metal.list.slice(0, 6).map((b) => (
            <ListRow
              key={`${b.metalType}-${b.purity}`}
              leading={<IconBubble icon={Gem} tone={b.metalType === 'GOLD' ? 'warning' : 'neutral'} />}
              title={metalLabel(b.metalType, b.purity)}
              meta={b.value ? cost(b.value) : t('rate nahi laga')}
              value={fmtGrams(b.balanceGrams)}
            />
          )),
          ...(karigars.gramsOut > 0 ? [
            <ListRow key="karigar" to="/jewelry/karigars" leading={<IconBubble icon={Hammer} tone="info" />} title={t('Karigaron ke paas')} meta={t('Diya hua, abhi wapas nahi aaya')} value={fmtGrams(karigars.gramsOut)} />,
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
    <WidgetCard title={t('Wazan ka hisaab')} icon={Scale} description={t('Pichle 30 din, gram me')} to="/jewelry/sales">
      <div className="grid grid-cols-2 gap-2">
        <MetricTile icon={Coins} tone="warning" label={t('Sona bika')} value={fmtGrams(monthly.goldSold)} hint={t('Aaj {{weightSold}} kul', { weightSold: fmtGrams(today.weightSold) })} />
        <MetricTile icon={Gem} tone="neutral" label={t('Chandi biki')} value={fmtGrams(monthly.silverSold)} hint={t('{{sales}} bill', { sales: monthly.sales })} />
        <MetricTile icon={Repeat} tone="info" label={t('Purana sona aaya')} value={fmtGrams(monthly.exchangesGold)} hint={t('{{exchangesCount}} exchange · {{exchangesValue}}', { exchangesCount: monthly.exchangesCount, exchangesValue: cost(monthly.exchangesValue) })} to="/jewelry/exchanges" />
        <MetricTile icon={AlertTriangle} tone="danger" label={t('Baqi lena')} value={cost(monthly.outstanding)} hint={t('Zewar ke bill par')} alert={monthly.outstanding > 0} to="/jewelry/sales" />
      </div>
    </WidgetCard>
  );
}

export function JewelryKarigars() {
  const { karigars } = useJewelryOps();
  const { cost } = useMasked();
  return (
    <WidgetCard
      title={t('Karigar')}
      icon={Users}
      description={karigars.gramsOut > 0 ? t('{{gramsOut}} metal un ke paas', { gramsOut: fmtGrams(karigars.gramsOut) }) : t('{{active}} kaam par', { active: karigars.active })}
      to="/jewelry/karigars"
      flush
    >
      <RowList empty={t('Koi karigar darj nahi')} emptyIcon={Users}>
        {karigars.list.map((k) => (
          <ListRow
            key={k.id}
            to="/jewelry/karigars"
            icon={Hammer}
            title={k.fullName}
            meta={t('{{completedOrders}} order{{value}} · {{totalEarnings}}', { completedOrders: k.completedOrders, value: k.skillLevel ? ` · ${k.skillLevel}` : '', totalEarnings: cost(k.totalEarnings) })}
            value={k.outstandingGrams > 0 ? <Badge variant="warning" size="xs">{t('{{outstandingGrams}} baqi', { outstandingGrams: fmtGrams(k.outstandingGrams) })}</Badge> : <Badge variant="success" size="xs">{t('Saaf')}</Badge>}
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
    key: 'metal', icon: Gem, tone: 'warning', to: '/jewelry/metal-stock', label: t('Kachcha sona-chandi'),
    value: formatPKR(metal.value),
    hint: karigars.gramsOut > 0 ? t('{{gold}} sona · {{gramsOut}} karigar ke paas', { gold: fmtGrams(metal.gold), gramsOut: fmtGrams(karigars.gramsOut) }) : t('{{gold}} sona · {{silver}} chandi', { gold: fmtGrams(metal.gold), silver: fmtGrams(metal.silver) }),
  }];
}
