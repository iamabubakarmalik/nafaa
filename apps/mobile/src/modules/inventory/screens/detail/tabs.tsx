/** Product detail tabs: overview with a sales chart, stock by branch with the log, sales, purchases, batches, packs and variants. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowRight, CalendarClock, Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { expiryState, packSavingPct, perBaseUnit } from '@nafaa/core/inventory';
import { formatDate, formatDateTime, formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Button, DetailRow, DetailSection, EmptyState, ListRow, Row, Segmented, SkeletonRows, Text, useTheme } from '@/design';
import { productSuppliersApi } from '../../api/suppliers';
import { insightsApi, type Product, type ProductInsights, type ProductUnit } from '../../api/products';
import { INV, qty, useOnline } from '../../lib/shared';
import { movementOf } from '../../stock/meta';

function NeedsData({ insights }: { insights?: ProductInsights }) {
  const online = useOnline();
  if (insights) return null;
  return online ? <SkeletonRows count={4} /> : <EmptyState compact title={t('Internet aane par dikhega')} tone="neutral" />;
}

/** Simple bars of sale per day/week; no chart library needed. */
function SalesBars({ series }: { series: ProductInsights['series'] }) {
  const th = useTheme();
  const max = Math.max(1, ...series.map((s) => s.revenue));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 96 }}>
      {series.map((s) => (
        <View key={s.key} style={{ flex: 1, height: Math.max(2, (s.revenue / max) * 96), borderRadius: 3, backgroundColor: s.revenue ? th.colors.brand.solid : th.colors.divider }} />
      ))}
    </View>
  );
}

export function OverviewTab({ product: p, insights, days, setDays, costHidden, facts, stock }: {
  product: Product; insights?: ProductInsights; days: number; setDays: (d: number) => void; costHidden: boolean; facts: Array<[string, string]>; stock: number;
}) {
  const th = useTheme();
  const margin = p.price > 0 && p.costPrice > 0 ? ((p.price - p.costPrice) / p.price) * 100 : null;
  return (
    <>
      <DetailSection title={t('Sale')}>
        <View style={{ padding: th.space(4), gap: th.space(3) }}>
          <Segmented size="sm" value={String(days)} onChange={(v) => setDays(Number(v))} options={[7, 30, 90].map((d) => ({ value: String(d), label: t('{{d}} din', { d }) }))} />
          {insights ? (
            <>
              <SalesBars series={insights.series} />
              <Row justify="between">
                <Text size="xs" tone="muted">{t('{{qty}} {{unit}} · {{bills}} bill', { qty: qty(insights.totals.qty), unit: p.unit, bills: insights.totals.bills })}</Text>
                <Amount value={insights.totals.revenue} size="sm" weight="bold" />
              </Row>
            </>
          ) : <NeedsData insights={insights} />}
        </View>
      </DetailSection>
      <DetailSection title={t('Details')}>
        <DetailRow label={t('Retail price')} value={<Amount value={p.price} />} />
        {p.wholesalePrice ? <DetailRow label={t('Wholesale price')} value={<Amount value={p.wholesalePrice} />} /> : null}
        {p.creditPrice ? <DetailRow label={t('Credit (udhaar) price')} value={<Amount value={p.creditPrice} />} /> : null}
        {!costHidden && <DetailRow label={t('Cost price')} value={<Amount value={p.costPrice} />} />}
        {!costHidden && margin !== null && <DetailRow label={t('Margin')} value={<Text ltr weight="semibold" tone={margin < 0 ? 'danger' : 'success'}>{`${margin.toFixed(1)}%`}</Text>} />}
        <DetailRow label={t('Stock')} value={<Text ltr weight="semibold">{`${qty(stock)} ${p.unit}`}</Text>} />
        <DetailRow label={t('Kam stock ki had')} value={<Text ltr>{`${qty(p.lowStockAlert)} ${p.unit}`}</Text>} />
        {p.taxRate ? <DetailRow label={t('Tax')} value={<Text ltr>{`${p.taxRate}%`}</Text>} /> : null}
        {p.brand && <DetailRow label={t('Brand')} value={p.brand.name} />}
        {p.isRawMaterial && <DetailRow label={t('Raw material')} value={t('Haan')} />}
        {facts.map(([label, value]) => <DetailRow key={label} label={t(label)} value={value} />)}
        {insights?.allTime.firstSoldAt && <DetailRow label={t('Pehli sale')} value={formatDate(insights.allTime.firstSoldAt)} />}
        <DetailRow label={t('Aakhri sale')} value={insights?.allTime.lastSoldAt ? formatDate(insights.allTime.lastSoldAt) : t('abhi nahi bika')} last />
      </DetailSection>
      {p.description ? <DetailSection title={t('Details')}><Text size="sm" style={{ padding: th.space(4) }}>{p.description}</Text></DetailSection> : null}
    </>
  );
}

export function StockTab({ product: p, insights, stock, shopId, canAdjust, onAdjust }: {
  product: Product; insights?: ProductInsights; stock: number; shopId: string | null; canAdjust: boolean; onAdjust: () => void;
}) {
  return (
    <>
      <DetailSection title={t('Branches')} action={canAdjust ? <Button size="sm" variant="soft" icon={Plus} onPress={onAdjust}>{t('Stock')}</Button> : undefined}>
        {insights ? insights.shops.map((s, i) => (
          <DetailRow key={s.shopId} last={i === insights.shops.length - 1} label={s.shopId === shopId ? `${s.name} •` : s.name}
            value={<Text ltr weight="semibold" tone={s.stock <= 0 ? 'danger' : s.stock <= s.lowStockAlert ? 'warning' : 'default'}>{`${qty(s.stock)} ${p.unit}`}</Text>} />
        )) : <DetailRow label={t('Is branch mein')} value={<Text ltr weight="semibold">{`${qty(stock)} ${p.unit}`}</Text>} last />}
      </DetailSection>
      <DetailSection title={t('Stock ki movements')} action={<Button size="sm" variant="link" iconEnd={ArrowRight} iconEndFlip onPress={() => router.push({ pathname: '/stock-movements', params: { productId: p.id } } as never)}>{t('Sab dekhein')}</Button>}>
        {insights ? (insights.movements.length ? insights.movements.slice(0, 25).map((m) => {
          const meta = movementOf(m.type);
          return (
            <ListRow key={m.id} dense icon={meta.icon} iconTone={meta.tone} title={t(meta.label)}
              subtitle={[formatDateTime(m.createdAt), m.shop?.name, m.reference, m.note].filter(Boolean).join(' · ')}
              trailing={<View style={{ alignItems: 'flex-end' }}>
                <Text size="sm" weight="bold" ltr tone={m.quantity < 0 ? 'danger' : 'success'}>{`${m.quantity > 0 ? '+' : ''}${qty(m.quantity)}`}</Text>
                <Text size="2xs" tone="muted" ltr>{`→ ${qty(m.balanceAfter)}`}</Text>
              </View>} />
          );
        }) : <EmptyState compact title={t('Abhi koi movement nahi')} />) : <NeedsData insights={insights} />}
      </DetailSection>
    </>
  );
}

export function SalesTab({ insights }: { insights?: ProductInsights }) {
  if (!insights) return <NeedsData insights={insights} />;
  return (
    <>
      <DetailSection title={t('Aakhri bill')}>
        {insights.recent.length ? insights.recent.map((s) => (
          <ListRow key={s.id} dense title={s.saleNumber} subtitle={[formatDateTime(s.soldAt), s.customer?.name ?? t('Walk-in customer')].join(' · ')}
            trailing={<View style={{ alignItems: 'flex-end' }}>
              <Amount value={s.total} size="sm" weight="bold" />
              <Text size="2xs" tone="muted" ltr>{`${qty(s.qty)} × ${formatPKR(s.price)}`}</Text>
              {s.returnedQty > 0 && <Badge tone="warning">{t('{{qty}} wapas', { qty: qty(s.returnedQty) })}</Badge>}
            </View>}
            onPress={() => router.push(`/sales/${s.saleId}` as never)} chevron />
        )) : <EmptyState compact title={t('Abhi koi sale nahi')} />}
      </DetailSection>
      {insights.customers.length > 0 && (
        <DetailSection title={t('Kaun khareedta hai')}>
          {insights.customers.map((c, i) => (
            <ListRow key={c.id ?? i} dense title={c.name ?? t('Walk-in customer')} subtitle={c.phone ?? undefined}
              trailing={<Text size="sm" tone="muted">{t('{{bills}} bill', { bills: c.bills })}</Text>} />
          ))}
        </DetailSection>
      )}
    </>
  );
}

export function PurchasesTab({ product: p, costHidden, canBuy }: { product: Product; costHidden: boolean; canBuy: boolean }) {
  const online = useOnline();
  const q = useQuery({ queryKey: [INV, 'product-purchases', p.id], queryFn: () => insightsApi.purchases(p.id), enabled: online });
  if (!q.data) return q.isLoading ? <SkeletonRows count={4} /> : <EmptyState compact title={t('Internet aane par dikhega')} tone="neutral" />;
  const d = q.data;
  return (
    <>
      <DetailSection title={t('Purchase')} action={canBuy ? <Button size="sm" variant="soft" icon={Plus} onPress={() => router.push('/purchases/new' as never)}>{t('Purchase')}</Button> : undefined}>
        <DetailRow label={t('Kul khareeda')} value={<Text ltr weight="semibold">{`${qty(d.totals.qty)} ${p.unit}`}</Text>} />
        <DetailRow label={t('Bill')} value={String(d.totals.bills)} />
        {!costHidden && d.totals.lastCost !== null && <DetailRow label={t('Aakhri cost')} value={<Amount value={d.totals.lastCost} />} />}
        {!costHidden && d.totals.avgCost !== null && <DetailRow label={t('Average cost')} value={<Amount value={d.totals.avgCost} />} />}
        {!costHidden && d.totals.lastCost !== null && p.costPrice > 0 && d.totals.lastCost !== p.costPrice && (
          <View style={{ padding: 12 }}><Text size="xs" tone="warning">{t('Aakhri purchase ki cost product ki cost se alag hai — product ki cost theek kar lein.')}</Text></View>
        )}
        <DetailRow label={t('Aakhri purchase')} value={d.totals.lastAt ? formatDate(d.totals.lastAt) : '—'} last />
      </DetailSection>
      <DetailSection title={t('Bill')}>
        {d.recent.length ? d.recent.map((r) => (
          <ListRow key={r.id} dense title={`${r.purchaseNumber} · ${r.supplier?.name ?? ''}`}
            subtitle={[formatDate(r.purchasedAt), `${qty(r.quantity)} ${r.unitName}`, r.batchNo, r.expiryDate ? formatDate(r.expiryDate) : null].filter(Boolean).join(' · ')}
            trailing={costHidden ? undefined : <Amount value={r.costPrice} size="sm" />} chevron onPress={() => router.push(`/purchases/${r.purchaseId}` as never)} />
        )) : <EmptyState compact title={t('Abhi koi purchase nahi')} />}
      </DetailSection>
    </>
  );
}

export function BatchesTab({ product: p }: { product: Product }) {
  const today = new Date().toISOString().slice(0, 10);
  const list = [...(p.batches ?? [])].sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'));
  return (
    <DetailSection title={t('Batches')}>
      {list.length ? list.map((b) => {
        const s = expiryState(b.expiryDate, today);
        return (
          <ListRow key={b.id} dense icon={CalendarClock} iconTone={s === 'expired' ? 'danger' : s === 'soon' ? 'warning' : 'neutral'} title={b.batchNumber}
            subtitle={[b.expiryDate ? t('Expiry {{date}}', { date: formatDate(b.expiryDate) }) : t('Expiry nahi'), b.manufactureDate ? t('Bani {{date}}', { date: formatDate(b.manufactureDate) }) : null].filter(Boolean).join(' · ')}
            trailing={<Text weight="semibold" ltr>{`${qty(b.quantity)} ${p.unit}`}</Text>} />
        );
      }) : <EmptyState compact title={t('Naya batch Purchase ke saath aata hai — wahan batch number aur expiry likhein.')} />}
    </DetailSection>
  );
}

export function UnitsTab({ product: p, units, stock, costHidden }: { product: Product; units: ProductUnit[]; stock: number; costHidden: boolean }) {
  return (
    <>
      {units.length > 0 && (
        <DetailSection title={t('Packing')}>
          {units.map((u) => {
            const saving = u.isBase ? 0 : packSavingPct(p.price, u.price, u.conversionRate);
            return (
              <ListRow key={u.id} dense title={`${u.unitName}${u.isBase ? '' : ` · ${qty(u.conversionRate)} ${p.unit}`}`}
                subtitle={[u.barcode, !u.isBase ? t('Fi {{unit}}: {{price}}', { unit: p.unit, price: formatPKR(perBaseUnit(u.price, u.conversionRate)) }) : null,
                  !u.isBase && u.conversionRate > 0 ? t('Stock: {{n}}', { n: qty(stock / u.conversionRate) }) : null].filter(Boolean).join(' · ')}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Amount value={u.price} size="sm" weight="bold" />
                  {!costHidden && u.costPrice > 0 && <Text size="2xs" tone="muted" ltr>{formatPKR(u.costPrice)}</Text>}
                  {saving > 0.5 && <Badge tone="success">{t('{{value}}% sasta', { value: saving.toFixed(0) })}</Badge>}
                  {!u.isActive && <Badge tone="neutral">{t('Band')}</Badge>}
                </View>} />
            );
          })}
        </DetailSection>
      )}
      {(p.variants?.length ?? 0) > 0 && (
        <DetailSection title={t('Variants')}>
          {p.variants!.map((v) => (
            <ListRow key={v.id} dense title={v.name} subtitle={[v.sku, v.barcode].filter(Boolean).join(' · ') || undefined}
              leading={v.colorHex ? <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: v.colorHex }} /> : undefined}
              trailing={<View style={{ alignItems: 'flex-end' }}>
                <Amount value={v.price} size="sm" />
                <Text size="2xs" ltr tone={v.stock <= 0 ? 'danger' : 'muted'}>{`${qty(v.stock)} ${p.unit}`}</Text>
              </View>} />
          ))}
        </DetailSection>
      )}
    </>
  );
}

/** Who supplies the product: preferred first, usual and last cost per base unit, and the last purchases from each. */
export function SuppliersTab({ product: p, costHidden }: { product: Product; costHidden: boolean }) {
  const online = useOnline();
  const q = useQuery({ queryKey: [INV, 'product-suppliers', p.id], queryFn: () => productSuppliersApi.list(p.id), enabled: online });
  if (!q.data) return q.isLoading ? <SkeletonRows count={4} /> : <EmptyState compact title={t('Internet aane par dikhega')} tone="neutral" />;
  const items = [...q.data.items].sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred));
  if (!items.length) return <EmptyState compact title={t('Abhi koi supplier nahi')} message={t('Edit me ja kar Suppliers jorein.')} />;
  const unit = q.data.baseUnit || p.unit;
  return (
    <>
      {items.map((l) => (
        <DetailSection key={l.id} title={l.supplier.name} action={l.isPreferred ? <Badge tone="brand">{t('Preferred')}</Badge> : undefined}>
          {l.supplierSku ? <DetailRow label={t('Supplier SKU')} value={<Text ltr>{l.supplierSku}</Text>} /> : null}
          {!costHidden && l.costPrice != null ? <DetailRow label={t('Usual cost')} value={<Text ltr weight="semibold">{`${formatPKR(l.costPrice)} / ${unit}`}</Text>} /> : null}
          {!costHidden && l.lastPurchasePrice != null ? (
            <DetailRow label={t('Last purchase')} value={<Text ltr>{`${formatPKR(l.lastPurchasePrice)}${l.lastPurchasedAt ? ` · ${formatDate(l.lastPurchasedAt)}` : ''}`}</Text>} />
          ) : null}
          {l.minOrderQty ? <DetailRow label={t('Min order')} value={<Text ltr>{`${qty(l.minOrderQty)} ${unit}`}</Text>} /> : null}
          {l.leadDays ? <DetailRow label={t('Lead days')} value={<Text ltr>{t('{{n}} din', { n: l.leadDays })}</Text>} /> : null}
          {l.notes ? <DetailRow label={t('Notes')} value={l.notes} /> : null}
          {l.purchases.map((r) => (
            <ListRow key={`${r.purchaseId}-${r.unitName}`} dense title={r.purchaseNumber}
              subtitle={[formatDate(r.purchasedAt), `${qty(r.quantity)} ${r.unitName}`].join(' · ')}
              trailing={costHidden ? undefined : <Amount value={r.costPrice} size="sm" />} chevron onPress={() => router.push(`/purchases/${r.purchaseId}` as never)} />
          ))}
        </DetailSection>
      ))}
    </>
  );
}
