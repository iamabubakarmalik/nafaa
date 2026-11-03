/**
 * Billing centre: the plan in use, usage against plan limits, Nafaa bills,
 * payments sent and the plan comparison. /billing, /plan and /plan-usage
 * open it on their own tab.
 */

import { router } from 'expo-router';
import { RefreshCw, Receipt } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Amount, Card, ChipGroup, EmptyState, ErrorState, IconButton, Row, Screen, SkeletonRows, StatTile, Tabs, Text, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import type { BillingInterval, Invoice, InvoiceStatus, Payment, PaymentStatus } from '../api/billing';
import { InvoiceRows, PaymentRows, PaymentSheet } from '../components/InvoiceRows';
import { PlanCards } from '../components/PlanCards';
import { PlanSummary } from '../components/PlanSummary';
import { UsageMeters } from '../components/UsageMeters';
import { daysText } from '../lib/meta';
import { useBilling } from '../lib/useBilling';

export type BillingTab = 'overview' | 'usage' | 'invoices' | 'payments' | 'plans';
type InvoiceFilter = 'all' | 'open' | InvoiceStatus;
type PaymentFilter = 'all' | PaymentStatus;

export function BillingScreen({ defaultTab = 'overview' }: { defaultTab?: BillingTab }) {
  const th = useTheme();
  const b = useBilling();
  const [asked, setTab] = useState<BillingTab | null>(null);
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [openPayment, setOpenPayment] = useState<Payment | null>(null);

  const allowed = useMemo(() => (['overview', 'usage', 'invoices', 'payments', 'plans'] as BillingTab[])
    .filter((x) => (x === 'usage' ? b.can.usage : x === 'plans' ? b.can.plans : b.can.billing)), [b.can.usage, b.can.plans, b.can.billing]);
  const tab: BillingTab = asked && allowed.includes(asked) ? asked : allowed.includes(defaultTab) ? defaultTab : allowed[0] ?? defaultTab;

  const goPlans = () => { if (b.needsRenewal && b.sub?.interval) setInterval(b.sub.interval); setTab('plans'); };
  const openInvoice = (i: Invoice) => router.push(`/billing/invoice/${i.id}` as never);

  const invoices = useMemo(() => b.invoices.filter((i) => invoiceFilter === 'all' || (invoiceFilter === 'open' ? i.status === 'PENDING' || i.status === 'OVERDUE' : i.status === invoiceFilter)), [b.invoices, invoiceFilter]);
  const payments = useMemo(() => b.payments.filter((p) => paymentFilter === 'all' || p.status === paymentFilter), [b.payments, paymentFilter]);

  const tabs = ([
    { value: 'overview', label: t('Mera plan') },
    { value: 'usage', label: t('Istemaal') },
    { value: 'invoices', label: t('Bill'), count: b.invoices.length || undefined },
    { value: 'payments', label: t('Payments'), count: b.payments.length || undefined },
    { value: 'plans', label: t('Plans') },
  ] as Array<{ value: BillingTab; label: string; count?: number }>).filter((x) => allowed.includes(x.value));

  const refreshing = b.fetching && !b.loading.sub;

  if (!allowed.length) return <Screen title={t('Billing')}><EmptyState title={t('Is ki ijazat nahi')} /></Screen>;

  return (
    <Screen title={t('Billing')} refreshing={refreshing} onRefresh={() => void b.refresh()}
      actions={<IconButton icon={RefreshCw} label={t('Taaza karein')} onPress={() => void b.refresh()} />}>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {b.error && !b.sub && b.can.billing && tab === 'overview' ? <ErrorState error={b.error} onRetry={() => void b.refresh()} /> : null}
      {b.queries.current.isFetched && <CachedNote query={b.queries.current} />}

      {tab === 'overview' && (
        <>
          <PlanSummary b={b} onPlans={goPlans} />
          {b.can.billing && (
            <Row gap={3}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Dena hai')} loading={b.loading.invoices}
                value={<Amount value={b.totals.due} size="lg" weight="bold" />}
                hint={b.totals.open.length ? t('{{count}} bill', { count: b.totals.open.length }) : t('kuch nahi')}
                onPress={b.totals.open.length ? () => { setInvoiceFilter('open'); setTab('invoices'); } : undefined} />
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Ab tak ada kiya')} loading={b.loading.invoices}
                value={<Amount value={b.totals.paidTotal} size="lg" weight="bold" />} hint={t('{{paidCount}} bill', { paidCount: b.totals.paidCount })} />
            </Row>
          )}
          {b.can.usage && <UsageMeters usage={b.usage} loading={b.loading.usage} error={b.usageError} onUpgrade={b.can.plans ? goPlans : undefined} />}
          {b.invoices.length > 0 && (
            <View style={{ gap: th.space(2) }}>
              <Row justify="between"><Text weight="semibold">{t('Naye bill')}</Text><Text size="sm" tone="brand" weight="semibold" onPress={() => setTab('invoices')}>{t('Sab dekhein')}</Text></Row>
              <InvoiceRows invoices={b.invoices.slice(0, 4)} onOpen={openInvoice} />
            </View>
          )}
        </>
      )}

      {tab === 'usage' && <UsageMeters usage={b.usage} loading={b.loading.usage} error={b.usageError} full onUpgrade={b.can.plans ? goPlans : undefined} />}

      {tab === 'invoices' && (
        <>
          <ChipGroup value={invoiceFilter} onChange={(v) => setInvoiceFilter(v as InvoiceFilter)} options={[
            { value: 'all', label: t('Sab') }, { value: 'open', label: t('Khule bill') }, { value: 'PAID', label: t('Ada') },
            { value: 'OVERDUE', label: t('Der ho gayi') }, { value: 'CANCELLED', label: t('Cancel') },
          ]} />
          {b.loading.invoices ? <SkeletonRows count={5} /> : !invoices.length ? (
            <EmptyState icon={Receipt} compact title={b.invoices.length ? t('Is filter me koi bill nahi') : t('Abhi koi bill nahi')}
              message={b.invoices.length ? t('Filter badal kar dekhein') : t('Plan lene par yahan bill aayenge')} />
          ) : <InvoiceRows invoices={invoices} onOpen={openInvoice} />}
        </>
      )}

      {tab === 'payments' && (
        <>
          <ChipGroup value={paymentFilter} onChange={(v) => setPaymentFilter(v as PaymentFilter)} options={[
            { value: 'all', label: t('Sab') }, { value: 'PENDING', label: t('Check ho rahi hai') }, { value: 'APPROVED', label: t('Approve') }, { value: 'REJECTED', label: t('Wapas ki gayi') },
          ]} />
          {b.loading.payments ? <SkeletonRows count={5} /> : !payments.length ? (
            <EmptyState icon={Receipt} compact title={b.payments.length ? t('Is filter me koi payment nahi') : t('Abhi koi payment nahi bheji')}
              message={b.payments.length ? t('Filter badal kar dekhein') : t('Bill kholein aur "Payment karein" dabayein')} />
          ) : <PaymentRows payments={payments} onOpen={setOpenPayment} />}
        </>
      )}

      {tab === 'plans' && <PlanCards b={b} interval={interval} setInterval={setInterval} />}

      <PaymentSheet payment={openPayment} onClose={() => setOpenPayment(null)} />
    </Screen>
  );
}
