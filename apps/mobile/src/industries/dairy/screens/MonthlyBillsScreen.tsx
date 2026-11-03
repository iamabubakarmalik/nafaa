/**
 * Monthly milk bills (web MonthlyBillsPage): a statement of one month's
 * deliveries with the khata balance before and after. Deliveries are already on
 * the khata, so a bill books no money; a payment taken here goes on the khata.
 * Share on WhatsApp.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, FileText, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatDate, formatMoney, pkParts } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, DetailRow, EmptyState, ListRow, ListTemplate, Row, Select, Sheet, Text, toast, useTheme } from '@/design';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, PaySheet, errorText, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { monthlyBillsApi, type MonthlyBill } from '../api';
import { DAIRY_KEYS, DELIVERY_STATUS, MONTHS, liters, monthLabel, refreshDairy } from '../meta';

type Tab = 'unpaid' | 'paid' | 'all';

export function MonthlyBillsScreen() {
  const th = useTheme();
  const canKhata = usePermission()(P.KHATA_MANAGE);
  const { guard } = useDeskOnline('dairyDesk');
  const { cost } = useCostMask();
  const now = pkParts(Date.now());
  const [period, setPeriod] = useState({ month: now.month === 0 ? 12 : now.month, year: now.month === 0 ? now.year - 1 : now.year });
  const [tab, setTab] = useState<Tab>('unpaid');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: [DAIRY_KEYS.bills, period.month, period.year], queryFn: () => monthlyBillsApi.all({ month: period.month, year: period.year }) });
  const all = q.data ?? [];
  const totals = useMemo(() => ({ billed: all.reduce((s, b) => s + b.totalAmount, 0), due: all.reduce((s, b) => s + Math.max(b.remainingAmount, 0), 0), liters: all.reduce((s, b) => s + b.totalLiters, 0), paid: all.filter((b) => b.remainingAmount <= 0.009).length }), [all]);
  const s = search.trim().toLowerCase();
  const rows = all.filter((b) => (tab === 'all' ? true : tab === 'paid' ? b.remainingAmount <= 0.009 : b.remainingAmount > 0.009) && (!s || [b.customer?.name, b.customer?.customerNumber, b.customer?.phone, b.billNumber].join(' ').toLowerCase().includes(s)));
  const makeAll = useMutation({
    mutationFn: () => monthlyBillsApi.makeAll(period),
    onSuccess: (r) => { refreshDairy([DAIRY_KEYS.bills]); toast.success(t('{{generated}} naye bill bane{{value}}', { generated: r.generated, value: r.updated ? t(', {{updated}} purane theek kiye', { updated: r.updated }) : '' })); },
    onError: (e) => toast.error(errorText(e, t('Bill nahi bane'))),
  });
  const years = [now.year - 2, now.year - 1, now.year];

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <View style={{ flex: 1 }}><Select value={String(period.month)} onChange={(v) => setPeriod((p) => ({ ...p, month: Number(v) }))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: t(m) }))} /></View>
        <View style={{ flex: 1 }}><Select value={String(period.year)} onChange={(v) => setPeriod((p) => ({ ...p, year: Number(v) }))} options={years.map((y) => ({ value: String(y), label: String(y) }))} /></View>
      </Row>
      <StatRow tiles={[
        { icon: FileText, tone: 'info', label: t('Kul bill'), loading: q.isLoading, value: cost(totals.billed) },
        { icon: Wallet, tone: 'danger', label: t('Abhi baqi'), loading: q.isLoading, value: cost(totals.due), hint: liters(totals.liters) },
      ]} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'unpaid', label: `${t('Baqi')} · ${all.length - totals.paid}` }, { value: 'paid', label: `${t('Ada')} · ${totals.paid}` }, { value: 'all', label: `${t('Sab')} · ${all.length}` }]} />
      {canKhata && <Button variant="secondary" icon={FileText} loading={makeAll.isPending} onPress={() => guard(() => makeAll.mutate())}>{t('Sab ke bill banayein')}</Button>}
      <OfflineNote feature="dairyDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<MonthlyBill>
        title={t('Monthly bills')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Customer ka naam, number, phone ya bill number…') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(b) => b.id}
        renderItem={({ item: b }) => (
          <RowCard>
            <ListRow icon={b.remainingAmount > 0.009 ? Wallet : CheckCircle2} iconTone={b.remainingAmount > 0.009 ? 'danger' : 'success'}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{b.customer?.name ?? t('Customer')}</Text>{b.sentToCustomer && <Badge tone="info">{t('Bheja')}</Badge>}</Row>}
              subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" ltr numberOfLines={1}>{`${b.billNumber} · ${b.customer?.customerNumber ?? ''}`}</Text><Text size="xs" tone="secondary">{t('{{totalLiters}} · {{totalDeliveries}} delivery', { totalLiters: liters(b.totalLiters), totalDeliveries: b.totalDeliveries })}</Text></View>}
              trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={b.totalAmount} weight="bold" />{b.remainingAmount > 0.009 ? <Text size="2xs" tone="danger">{t('Baqi')} {formatMoney(b.remainingAmount)}</Text> : <Text size="2xs" tone="success">{t('Ada')}</Text>}</View>}
              chevron onPress={() => setOpen(b.id)} />
          </RowCard>
        )}
        empty={<EmptyState icon={FileText} title={all.length ? t('Is tab me koi bill nahi') : t('{{month}} ke bill abhi nahi bane', { month: monthLabel(period.month, period.year) })} message={t('Mahina khatam hone par sab customers ke bill ek saath banayein.')} />}
      />
      <BillSheet id={open} canKhata={canKhata} onClose={() => setOpen(null)} />
    </>
  );
}

function BillSheet({ id, canKhata, onClose }: { id: string | null; canKhata: boolean; onClose: () => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('dairyDesk');
  const [paying, setPaying] = useState(false);
  const q = useQuery({ queryKey: [DAIRY_KEYS.bills, 'one', id], queryFn: () => monthlyBillsApi.getOne(id!), enabled: !!id });
  const b = q.data;
  const whatsapp = () => {
    if (!b) return;
    const lines = [`${b.customer?.name ?? ''} — ${monthLabel(b.month, b.year)}`, `${b.billNumber}`, `${t('Doodh')}: ${liters(b.totalLiters)}`, `${t('Is mahine')}: ${formatMoney(b.totalAmount)}`, `${t('Mahine ke aakhir')}: ${formatMoney(b.closingBalance)}`];
    if (openWhatsApp(b.customer?.phone, lines.join('\n'))) void monthlyBillsApi.markSent(b.id).then(() => refreshDairy([DAIRY_KEYS.bills])).catch(() => undefined);
  };
  return (
    <>
      <Sheet open={!!id && !paying} onClose={onClose} height={0.9} title={b ? `${b.customer?.name ?? ''} — ${monthLabel(b.month, b.year)}` : t('Bill')} description={b ? t('{{billNumber}} · {{totalLiters}} · {{totalDeliveries}} delivery', { billNumber: b.billNumber, totalLiters: liters(b.totalLiters), totalDeliveries: b.totalDeliveries }) : undefined}
        footer={b ? <Row gap={2}>{!!b.customer?.phone && <Button style={{ flex: 1 }} size="lg" variant="secondary" onPress={whatsapp}>{t('WhatsApp')}</Button>}{canKhata && b.remainingAmount > 0.009 && <Button style={{ flex: 1 }} size="lg" icon={Wallet} onPress={() => guard(() => setPaying(true))}>{t('Payment lein')}</Button>}</Row> : undefined}>
        {b && (
          <View style={{ gap: th.space(3) }}>
            <Card flush>
              <DetailRow label={t('Pichla baqi')} value={formatMoney(b.openingBalance)} />
              <DetailRow label={t('Is mahine')} value={formatMoney(b.totalAmount)} />
              <DetailRow label={t('Jama hua')} value={formatMoney(b.openingBalance + b.totalAmount - b.closingBalance)} />
              <DetailRow label={t('Mahine ke aakhir')} value={<Amount value={b.closingBalance} weight="bold" />} last />
            </Card>
            <Card flush title={t('Delivery')}>
              {(b.deliveries ?? []).map((d, i, a) => (
                <ListRow key={d.id} dense divider={i < a.length - 1} title={`${formatDate(d.deliveryDate)} · ${t(d.slot === 'EVENING' ? 'Shaam' : 'Subah')}`} trailing={<Text size="sm" tone={d.status === 'DELIVERED' ? undefined : 'muted'} ltr>{d.status === 'DELIVERED' ? liters(d.deliveredQty) : t(DELIVERY_STATUS[d.status]?.label ?? d.status)}</Text>} />
              ))}
            </Card>
          </View>
        )}
      </Sheet>
      <PaySheet open={paying} title={t('Bill ki payment')} name={b?.customer?.name ?? ''} due={b?.remainingAmount ?? 0} advance cta={t('Payment lein')}
        onConfirm={async ({ paymentMethod, paidAmount }) => { await monthlyBillsApi.payment(b!.id, { amount: paidAmount, paymentMethod }); refreshDairy([DAIRY_KEYS.bills], true); void q.refetch(); toast.success(t('Payment khate me jama')); }} onClose={() => setPaying(false)} />
    </>
  );
}
