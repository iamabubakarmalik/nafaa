/** Whole-catalog analytics (web CatalogAnalytics): money in stock, health, best and slow sellers, running out, expiring, and what to fix. */

import { router } from 'expo-router';
import { AlertTriangle, Barcode, ImageOff, Layers, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, EmptyState, ListRow, SkeletonRows, Text, useTheme } from '@/design';
import type { CatalogAnalytics as Data, CatalogStats } from '../../api/catalog';
import { Bars, StatStrip } from '../../stock/components/parts';
import { qty } from '../../lib/shared';

export function CatalogAnalytics({ data, stats, loading, costHidden, offline, detail }: {
  data?: Data; stats?: CatalogStats; loading: boolean; costHidden: boolean; offline: boolean; detail: (id: string) => string;
}) {
  const th = useTheme();
  const cost = (n: number) => (costHidden ? '••••' : formatPKR(n));
  if (offline && !data) return <EmptyState icon={AlertTriangle} title={t('Analytics ke liye internet chahiye')} tone="warning" />;
  if (loading || !data || !stats) return <SkeletonRows count={6} />;
  const open = (id: string) => router.push(detail(id) as never);
  const fix = [
    { key: 'noCost', icon: Wallet, n: data.fix.noCost, label: t('Cost nahi likhi'), href: '/products/bulk-edit?nocost=1', hide: costHidden },
    { key: 'belowCost', icon: AlertTriangle, n: data.fix.belowCost, label: t('Cost se sasti'), href: '/products/bulk-edit', hide: costHidden },
    { key: 'noBarcode', icon: Barcode, n: data.fix.noBarcode, label: t('Barcode nahi'), href: '/barcode-labels' },
    { key: 'noCategory', icon: Layers, n: data.fix.noCategory, label: t('Category nahi'), href: '/products/bulk-edit' },
    { key: 'noImage', icon: ImageOff, n: data.fix.noImage, label: t('Tasveer nahi') },
  ].filter((f) => f.n > 0 && !f.hide);
  return (
    <View style={{ gap: th.space(3) }}>
      <StatStrip items={[
        { label: t('Stock ki cost'), value: cost(stats.costValue), hint: t('{{units}} units', { units: qty(stats.units) }) },
        { label: t('Bechne par milega'), value: formatPKR(stats.saleValue), hint: costHidden ? undefined : t('profit {{cost}}', { cost: cost(stats.saleValue - stats.costValue) }), tone: 'success' },
        { label: t('{{value}} din ki sale', { value: stats.windowDays }), value: formatPKR(stats.revenue30), hint: t('{{sold30}} units biki', { sold30: qty(stats.sold30) }), tone: 'info' },
        { label: t('Pada hua maal'), value: cost(stats.deadValue), hint: t('{{dead}} nahi bik rahi', { dead: stats.dead }), tone: 'warning' },
      ]} />
      <Bars title={t('Category ke hisaab se stock')} rows={data.categories.slice(0, 8).map((c) => ({
        key: c.id, label: c.name, amount: costHidden ? c.saleValue : c.costValue, value: costHidden ? formatPKR(c.saleValue) : cost(c.costValue),
        hint: t('{{products}} cheezein · {{sold}} biki', { products: c.products, sold: qty(c.sold30) }),
      }))} />
      <Bars title={t('Zyada bikne wale')} tone="success" rows={data.topSellers.slice(0, 8).map((p) => ({
        key: p.id, label: p.name, amount: p.revenue, value: formatPKR(p.revenue), hint: t('{{sold}} {{unit}} · {{days}} din ka stock', { sold: qty(p.sold), unit: p.unit, days: Math.round(p.daysLeft) }),
      }))} empty={t('Abhi koi sale nahi')} />
      {data.runningOut.length > 0 && (
        <Card title={t('Jaldi khatam honge')} flush>
          {data.runningOut.slice(0, 8).map((p) => (
            <ListRow key={p.id} dense title={p.name} subtitle={t('Roz ~{{perDay}} · {{stock}} bacha', { perDay: qty(p.perDay), stock: qty(p.stock) })}
              trailing={<Text size="sm" weight="bold" tone={p.daysLeft <= 3 ? 'danger' : 'warning'}>{t('{{d}} din', { d: Math.round(p.daysLeft) })}</Text>} onPress={() => open(p.id)} />
          ))}
        </Card>
      )}
      {data.deadStock.length > 0 && (
        <Card title={t('Pada hua maal')} description={t('{{days}} din se nahi bika', { days: data.windowDays })} flush>
          {data.deadStock.slice(0, 8).map((p) => (
            <ListRow key={p.id} dense title={p.name} subtitle={`${qty(p.stock)} ${p.unit}`} trailing={<Text size="sm" weight="semibold" ltr>{cost(p.costValue)}</Text>} onPress={() => open(p.id)} />
          ))}
        </Card>
      )}
      {data.expiring.length > 0 && (
        <Card title={t('Expiry qareeb')} flush>
          {data.expiring.slice(0, 8).map((p) => (
            <ListRow key={p.id} dense title={p.name} subtitle={t('{{qty}} {{unit}} · {{date}}', { qty: qty(p.expiringQty), unit: p.unit, date: p.expiry.slice(0, 10) })} onPress={() => open(p.id)} />
          ))}
        </Card>
      )}
      {fix.length > 0 && (
        <Card title={t('Theek karne wali cheezein')} flush>
          {fix.map((f) => (
            <ListRow key={f.key} dense icon={f.icon} iconTone="warning" title={f.label} trailing={<Text weight="bold">{String(f.n)}</Text>}
              chevron={!!f.href} onPress={f.href ? () => router.push(f.href as never) : undefined} />
          ))}
        </Card>
      )}
    </View>
  );
}
