/**
 * One supplier: what we owe and since when, the khata statement for any
 * period (print or share as PDF / WhatsApp), their bills, how their rates
 * moved, analytics, and contact and bank details. Pay, buy, order, call and
 * message from the top. Readable offline from the last load.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Banknote, BookOpen, ClipboardList, MessageCircle, Pencil, Phone, Printer, Share2, ShoppingCart, Trash2, TrendingDown, TrendingUp,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Avatar, Badge, Button, Card, ChipGroup, DetailRow, DetailSection, DetailTemplate, EmptyState, IconButton, ListRow, ProgressBar, Row, SkeletonRows, StatTile,
  SwipeRow, Tabs, Text, confirm, toast, useTheme,
} from '@/design';
import { PUR, useOnline } from '@/modules/inventory/lib/shared';
import { purchasesApi } from '../api/purchases';
import { entryDelta, ledgerMeta, supplierLedgerApi, suppliersApi, type SupplierDetail } from '../api/suppliers';
import { Bars } from '../components/Analytics';
import { SupplierMoneySheet, type MoneyKind } from '../components/SupplierMoneySheet';
import { printDoc, shareDoc, statementDoc } from '../lib/docs';
import { callPhone, day, openWhatsApp, payLabel, RANGE_PRESETS, rangeOf, STATUS, type RangePreset } from '../lib/meta';

type Tab = 'khata' | 'bills' | 'rates' | 'analytics' | 'info';

export function SupplierDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const canEdit = can(P.SUPPLIERS_EDIT);
  const canBuy = can(P.PURCHASES_CREATE);
  const online = useOnline();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('khata');
  const [money, setMoney] = useState<MoneyKind | null>(null);
  const q = useQuery({ queryKey: [PUR, 'supplier', id], queryFn: () => suppliersApi.getOne(id!), enabled: !!id });
  const s = q.data;
  const remove = useMutation({
    mutationFn: () => suppliersApi.remove(id!),
    onSuccess: () => { toast.success(t('Supplier mit gaya')); void qc.invalidateQueries({ queryKey: [PUR] }); router.back(); },
  });

  if (!s) return <DetailTemplate title={t('Supplier')} loading={q.isLoading} error={q.error ?? (!q.isLoading ? new Error(t('Supplier nahi mila')) : undefined)} onRetry={q.refetch} />;
  const since = s.ledger.daysSincePayment;

  return (
    <DetailTemplate
      title={s.name}
      subtitle={[s.contactPerson, s.phone, s.city].filter(Boolean).join(' · ') || t('Rabta darj nahi')}
      actions={canEdit ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => router.push(`/suppliers/${s.id}/edit` as never)} /> : undefined}
      refreshing={q.isRefetching}
      onRefresh={() => { void q.refetch(); void qc.invalidateQueries({ queryKey: [PUR, 'statement', s.id] }); }}
      summary={(
        <View style={{ gap: th.space(3) }}>
          <Card>
            <Row gap={3} align="center">
              <Avatar name={s.name} url={s.logoUrl ?? undefined} size={48} />
              <View style={{ flex: 1 }}>
                <Text size="xs" tone="muted">{t('Dena hai')}</Text>
                <Text size="2xl" weight="bold" tone={s.outstandingDue > 0 ? 'danger' : 'success'} ltr>{formatPKR(s.outstandingDue)}</Text>
                {s.outstandingDue > 0 && since != null && <Text size="xs" tone={since > 60 ? 'warning' : 'muted'}>{t('aakhri payment {{since}} din pehle', { since })}</Text>}
              </View>
              {!s.isActive && <Badge tone="neutral">{t('Band')}</Badge>}
            </Row>
            {s.paymentTerms ? <Text size="xs" tone="muted" style={{ marginTop: 6 }}>{t('· Shart: {{paymentTerms}}', { paymentTerms: s.paymentTerms }).replace(/^· /, '')}</Text> : null}
          </Card>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(2) }}>
            {canEdit && <Button size="sm" icon={Banknote} disabled={!online} onPress={() => setMoney('payment')}>{t('Payment')}</Button>}
            {canBuy && <Button size="sm" variant="secondary" icon={ShoppingCart} onPress={() => router.push(`/purchases/new?supplier=${s.id}` as never)}>{t('Purchase')}</Button>}
            {canBuy && <Button size="sm" variant="secondary" icon={ClipboardList} onPress={() => router.push(`/purchases/new?order=1&supplier=${s.id}` as never)}>{t('Order')}</Button>}
            {s.phone && <Button size="sm" variant="secondary" icon={Phone} onPress={() => callPhone(s.phone)}>{t('Call')}</Button>}
            {s.phone && <Button size="sm" variant="secondary" icon={MessageCircle} onPress={() => openWhatsApp(s.phone)}>{t('WhatsApp')}</Button>}
            {canEdit && <Button size="sm" variant="secondary" icon={BookOpen} disabled={!online} onPress={() => setMoney('due')}>{t('Khata entry')}</Button>}
          </ScrollView>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Kul purchase')} value={<Amount value={s.stats.totalAmount} size="lg" weight="bold" />} hint={t('{{count}} bill', { count: s.stats.totalPurchases })} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Kul diye')} value={formatPKR(s.ledger.paymentsMade + s.stats.totalPaid)}
              hint={s.stats.daysSinceLastPurchase == null ? undefined : `${t('Aakhri maal')}: ${(s.stats.daysSinceLastPurchase === 0 ? t('Aaj') : t('{{count}} din pehle', { count: s.stats.daysSinceLastPurchase }))}`} />
          </Row>
          <Tabs value={tab} onChange={setTab}
            tabs={[{ value: 'khata', label: t('Khata') }, { value: 'bills', label: t('Purchase'), count: s._count.purchases }, { value: 'rates', label: t('Rates') }, { value: 'analytics', label: t('Analytics') }, { value: 'info', label: t('Details') }]} />
        </View>
      )}
    >
      {tab === 'khata' && <Khata supplierId={s.id} canEdit={canEdit && online} phone={s.phone} />}
      {tab === 'bills' && <Bills supplierId={s.id} />}
      {tab === 'rates' && <Rates history={s.priceHistory} />}
      {tab === 'analytics' && <Analytics s={s} />}
      {tab === 'info' && (
        <>
          <DetailSection title={t('Rabta')}>
            <DetailRow label={t('Rabta')} value={s.contactPerson || '—'} />
            <DetailRow label={t('Phone')} value={s.phone || '—'} />
            <DetailRow label={t('Doosra phone')} value={s.altPhone || '—'} />
            <DetailRow label={t('Email')} value={s.email || '—'} />
            <DetailRow label={t('Pata')} value={[s.address, s.area, s.city].filter(Boolean).join(', ') || '—'} />
            <DetailRow label={t('CNIC')} value={s.cnic || '—'} />
            <DetailRow label={t('NTN')} value={s.ntn || '—'} last />
          </DetailSection>
          <DetailSection title={t('Bank')}>
            <DetailRow label={t('Bank')} value={s.bankName || '—'} />
            <DetailRow label={t('Account #')} value={s.accountNumber || '—'} />
            <DetailRow label={t('IBAN')} value={s.iban || '—'} />
            <DetailRow label={t('Shart')} value={s.paymentTerms || '—'} last={!s.notes} />
            {s.notes ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{s.notes}</Text></View> : null}
          </DetailSection>
          {canEdit && (
            <Button variant="ghost" icon={Trash2} disabled={!online} loading={remove.isPending}
              onPress={async () => {
                if (await confirm({ title: t('{{name}} mitayein?', { name: s.name }), message: t('Jis supplier se purchase ho chuki ya baqi ho, woh nahi mitta — use \'Badlein\' se band kar dein.'), tone: 'danger', confirmLabel: t('Mitayein') })) remove.mutate();
              }}>{t('Supplier mitayein')}</Button>
          )}
        </>
      )}
      <SupplierMoneySheet supplier={s} initial={money ?? 'payment'} open={!!money} onClose={() => setMoney(null)} />
    </DetailTemplate>
  );
}

function Khata({ supplierId, canEdit, phone }: { supplierId: string; canEdit: boolean; phone?: string | null }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [preset, setPreset] = useState<RangePreset>('all');
  const period = rangeOf(preset);
  const q = useQuery({ queryKey: [PUR, 'statement', supplierId, period?.from, period?.to], queryFn: () => supplierLedgerApi.statement(supplierId, period ?? undefined) });
  const st = q.data;
  const rows = useMemo(() => [...(st?.entries ?? [])].sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt)), [st]);
  const removeEntry = useMutation({
    mutationFn: (entryId: string) => supplierLedgerApi.removeEntry(supplierId, entryId),
    onSuccess: () => { toast.success(t('Entry hata di')); void qc.invalidateQueries({ queryKey: [PUR] }); },
  });
  const periodText = period ? `${period.from} — ${period.to}` : t('Shuru se aaj tak');
  const shareText = () => {
    if (!st) return;
    const lines = [`*${t('Supplier khata')} — ${st.supplier.name}*`, periodText, '',
      ...[...rows].reverse().slice(-20).map((e) => `${day(e.entryDate)} · ${t(ledgerMeta(e.type).label)}${e.reference ? ` ${e.reference}` : ''}: ${formatPKR(Math.abs(entryDelta(e)))} → ${formatPKR(e.balanceAfter)}`),
      '', `${t('Abhi dena hai')}: ${formatPKR(st.supplier.outstandingDue)}`];
    openWhatsApp(phone, lines.join('\n'));
  };
  return (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup value={preset} onChange={setPreset} options={RANGE_PRESETS.map((r) => ({ value: r.value, label: t(r.label) }))} style={{ marginHorizontal: -th.space(4) }} />
      {st && (
        <Row gap={2} wrap>
          <Text size="sm">{t('Barha')} <Text size="sm" weight="bold" tone="warning" ltr>{formatPKR(st.totals.added)}</Text></Text>
          <Text size="sm">{t('Diye')} <Text size="sm" weight="bold" tone="success" ltr>{formatPKR(st.totals.paid)}</Text></Text>
        </Row>
      )}
      <Row gap={2}>
        <Button size="sm" variant="secondary" icon={Printer} disabled={!st} onPress={() => st && void printDoc(statementDoc(st, periodText))}>{t('Statement')}</Button>
        <Button size="sm" variant="secondary" icon={Share2} disabled={!st} onPress={() => st && void shareDoc(statementDoc(st, periodText))}>{t('PDF')}</Button>
        <Button size="sm" variant="secondary" icon={MessageCircle} disabled={!st} onPress={shareText}>{t('WhatsApp')}</Button>
      </Row>
      {q.isLoading ? <SkeletonRows count={5} /> : !rows.length ? (
        <EmptyState compact icon={BookOpen} title={t('Is period me koi entry nahi')} />
      ) : (
        <Card flush>
          {rows.map((e) => {
            const m = ledgerMeta(e.type);
            const dlt = entryDelta(e);
            const manual = !(e.type === 'PURCHASE_CREDIT' && e.reference) && !(e.type === 'PURCHASE_RETURN' && e.reference?.startsWith('PO-'));
            return (
              <SwipeRow key={e.id} enabled={canEdit && manual}
                end={[{ icon: Trash2, label: t('Hatayein'), tone: 'danger', onPress: async () => { if (await confirm({ title: t('Yeh entry hata dein?'), tone: 'danger', confirmLabel: t('Hatayein') })) removeEntry.mutate(e.id); } }]}>
                <ListRow
                  style={{ backgroundColor: th.colors.surface }}
                  title={`${m.emoji} ${t(m.label)}${e.reference ? ` · ${e.reference}` : ''}`}
                  subtitle={`${day(e.entryDate)}${e.paymentMethod ? ` · ${payLabel(e.paymentMethod)}` : ''}${e.note ? `\n${t(e.note)}` : ''}`}
                  trailing={(
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text weight="semibold" tone={dlt > 0 ? 'warning' : 'success'} ltr>{`${dlt > 0 ? '+' : '−'}${formatPKR(Math.abs(dlt))}`}</Text>
                      <Text size="xs" tone="muted" ltr>{`${t('Baqi')} ${formatPKR(e.balanceAfter)}`}</Text>
                    </View>
                  )}
                />
              </SwipeRow>
            );
          })}
        </Card>
      )}
    </View>
  );
}

function Bills({ supplierId }: { supplierId: string }) {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: [PUR, 'list', { supplierId, page }], queryFn: () => purchasesApi.page({ supplierId, page, limit: 20, status: 'all' }) });
  const d = q.data;
  if (q.isLoading) return <SkeletonRows count={5} />;
  if (!d?.items.length) return <EmptyState compact icon={ShoppingCart} title={t('Is supplier se abhi koi purchase nahi')} />;
  return (
    <View style={{ gap: 8 }}>
      <Card flush>
        {d.items.map((p) => (
          <ListRow key={p.id} title={<Row gap={1.5} wrap><Text weight="semibold">{p.purchaseNumber}</Text><Badge tone={STATUS[p.status].tone}>{t(STATUS[p.status].label)}</Badge></Row>}
            subtitle={`${day(p.purchasedAt)} · ${p.items.map((i) => i.itemName).slice(0, 3).join(', ')}${p.items.length > 3 ? ` +${p.items.length - 3}` : ''}`}
            trailing={<Text weight="semibold" ltr>{formatPKR(p.status === 'PENDING' ? p.total : p.receivedValue)}</Text>} chevron
            onPress={() => router.push(`/purchases/${p.id}` as never)} />
        ))}
      </Card>
      {d.pages > 1 && (
        <Row gap={2} justify="center">
          <Button size="sm" variant="secondary" disabled={page <= 1} onPress={() => setPage((x) => x - 1)}>{t('Pichla')}</Button>
          <Text size="sm" tone="muted" ltr>{`${page} / ${d.pages}`}</Text>
          <Button size="sm" variant="secondary" disabled={page >= d.pages} onPress={() => setPage((x) => x + 1)}>{t('Agla')}</Button>
        </Row>
      )}
    </View>
  );
}

function Rates({ history }: { history: SupplierDetail['priceHistory'] }) {
  const th = useTheme();
  if (!history?.length) return <EmptyState compact icon={TrendingUp} title={t('Rates ka record abhi nahi')} />;
  return (
    <View style={{ gap: th.space(2) }}>
      {history.map((h) => {
        const up = h.changePct > 0.5;
        const down = h.changePct < -0.5;
        const max = Math.max(...h.points.map((p) => p.costPrice), 1);
        return (
          <Card key={h.productId}>
            <Row justify="between" align="start" gap={2}>
              <View style={{ flex: 1 }}>
                <Text weight="medium" numberOfLines={1}>{h.productName}</Text>
                <Text size="xs" tone="muted">{t('{{count}} dafa · fi {{unit}}', { count: h.points.length, unit: h.unit })}</Text>
              </View>
              <Badge tone={up ? 'danger' : down ? 'success' : 'neutral'} icon={up ? TrendingUp : down ? TrendingDown : undefined}>{`${h.changePct > 0 ? '+' : ''}${h.changePct.toFixed(0)}%`}</Badge>
            </Row>
            <Row gap={1} align="end" style={{ height: 48, marginTop: 8 }}>
              {h.points.slice(-24).map((p, i) => (
                <View key={i} style={{ flex: 1, height: `${Math.max((p.costPrice / max) * 100, 8)}%`, backgroundColor: th.colors.brand.solid, opacity: 0.7, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
              ))}
            </Row>
            <Row justify="between" style={{ marginTop: 6 }}>
              <Text size="xs" tone="muted">{t('Pehli {{firstCost}}', { firstCost: formatPKR(h.firstCost) })}</Text>
              <Text size="xs" tone="muted">{t('Ab {{lastCost}}', { lastCost: formatPKR(h.lastCost) })}</Text>
            </Row>
          </Card>
        );
      })}
    </View>
  );
}

function Analytics({ s }: { s: SupplierDetail }) {
  const th = useTheme();
  const max30 = Math.max(1, ...s.trend30Days.map((d) => d.total));
  return (
    <View style={{ gap: th.space(3) }}>
      <Card title={t('12 mahine — purchase aur payment')}>
        <Bars rows={s.months12.map((m) => ({ key: m.month, label: m.label, sub: `${t('Diye')} ${formatPKR(m.paid)}`, value: m.total, right: formatPKR(m.total) }))} />
      </Card>
      <Card title={t('Pichle 30 din')}>
        <Row gap={0.5} align="end" style={{ height: 64 }}>
          {s.trend30Days.map((d) => <View key={d.date} style={{ flex: 1, height: `${Math.max((d.total / max30) * 100, d.total ? 6 : 2)}%`, backgroundColor: th.colors.brand.solid, borderRadius: 2 }} />)}
        </Row>
      </Card>
      <Card title={t('Payment kaise ki')}>
        {s.paymentBreakdown.length ? <Bars tone="success" rows={s.paymentBreakdown.map((p) => ({ key: p.paymentMethod, label: payLabel(p.paymentMethod), value: p.total, right: formatPKR(p.total) }))} />
          : <Text size="sm" tone="muted">{t('Abhi koi payment nahi')}</Text>}
      </Card>
      <Card title={t('Is supplier se sab se zyada liya')}>
        {s.topProducts.length ? s.topProducts.map((x) => (
          <View key={x.productId} style={{ gap: 4, paddingVertical: 4 }}>
            <Row justify="between" gap={2}>
              <Text size="sm" style={{ flex: 1 }} numberOfLines={1}>{x.product?.name ?? '—'}</Text>
              <Text size="sm" weight="semibold" ltr>{formatPKR(x.total)}</Text>
            </Row>
            <Text size="xs" tone="muted">{t('{{value}} {{value2}} · {{orderCount}} bill', { value: Number(x.quantity.toFixed(2)), value2: x.product?.unit ?? '', orderCount: x.orderCount })}</Text>
            <ProgressBar value={x.total / Math.max(1, s.topProducts[0]?.total ?? 1)} height={4} />
          </View>
        )) : <Text size="sm" tone="muted">{t('Abhi koi purchase nahi')}</Text>}
      </Card>
    </View>
  );
}
