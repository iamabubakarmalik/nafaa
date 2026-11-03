/**
 * One bill: customer, items, money, how it was paid, profit (with cost.view),
 * and what can be done: open the receipt (print / PDF / share), WhatsApp it,
 * return items, or cancel the whole bill. The return and cancel screens belong
 * to the counter; this links to them. Works from the phone's copy offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, CloudOff, Link2, MessageCircle, Receipt, RotateCcw } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatDateTime, formatNumber } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { useSale, type SaleRow } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { saleToReceipt, saleRowToReceipt, sendReceiptWhatsApp, useBillLanguage } from '@/core/receipt';
import {
  Amount, Avatar, Badge, Button, DetailRow, DetailSection, DetailTemplate, ListRow, PageHero, HeroAmount, Row, Text, toast, useTheme,
} from '@/design';
import { methodLabel } from '@/modules/pos/components/parts';
import { VoidSheet } from '@/modules/pos/components/VoidSheet';
import { rowToHistorySale, salesHistoryApi, serverSaleToHistory, type HistorySale } from '../api/history';
import { useCostMask } from '../lib/mask';
import { SALE_STATUS, SOURCE_LABEL, tierLabel } from '../lib/meta';
import { useSalesExtras } from '../industry/registry';

const isTemp = (id: string) => id.startsWith('tmp_') || id.startsWith('OFF-');

export function SaleDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const online = useOnlineStatus();
  const lang = useBillLanguage();
  const { costHidden, cost } = useCostMask();
  const local = useSale(id);
  const serverId = !isTemp(id ?? '') && !local.data?.pending ? id : null;
  const full = useQuery({ queryKey: ['sales', 'one', serverId], queryFn: () => salesHistoryApi.one(serverId!), enabled: !!serverId && online, staleTime: 30_000 });
  const [voiding, setVoiding] = useState(false);

  const sale: HistorySale | null = useMemo(() => (full.data ? serverSaleToHistory(full.data) : local.data ? rowToHistorySale(local.data) : null), [full.data, local.data]);
  const extras = useSalesExtras();
  const raw = (full.data as Record<string, unknown> | undefined) ?? null;
  const loading = !sale && (local.isLoading || full.isLoading);
  const voided = sale?.status === 'VOIDED';
  const returnable = !!sale && !voided && sale.status !== 'FULLY_RETURNED' && !sale.pending;
  const profit = sale ? sale.total - sale.costOfGoods : 0;
  const st = sale ? SALE_STATUS[sale.status] : null;

  // Older bills are not on the phone: the void sheet only needs the bill's identity.
  const voidTarget: SaleRow | null = local.data ?? (sale ? {
    id: sale.id, saleNumber: sale.saleNumber, shopId: sale.shop?.id ?? null, customerId: sale.customer?.id ?? null, customerName: sale.customer?.name ?? null,
    subtotal: sale.subtotal, discount: sale.discount, total: sale.total, paidAmount: sale.paidAmount, changeAmount: sale.changeAmount, creditAmount: sale.creditAmount,
    paymentMethod: sale.paymentMethod, payments: [], status: sale.status, soldAt: sale.soldAt, items: [], pending: false, opId: null, note: null,
  } : null);

  const whatsapp = async () => {
    if (!sale) return;
    const doc = full.data ? saleToReceipt(full.data, lang) : local.data ? saleRowToReceipt(local.data, lang) : null;
    if (doc && !(await sendReceiptWhatsApp(doc, lang, sale.customer?.phone))) toast.error(t('WhatsApp is not installed'));
  };

  return (
    <>
      <DetailTemplate
        title={sale?.saleNumber ?? t('Bill')}
        subtitle={sale ? formatDateTime(sale.soldAt) : undefined}
        loading={loading}
        onRefresh={serverId && online ? () => void full.refetch() : undefined}
        refreshing={full.isRefetching}
        summary={sale ? (
          <PageHero
            title={sale.customer?.name ?? t('Walk-in customer')}
            chip={sale.status === 'COMPLETED' && !sale.pending ? undefined : t(sale.pending ? 'Waiting' : st!.label)}
            stats={[
              { label: t('Kul'), value: <HeroAmount value={sale.total} size="2xl" /> },
              ...(sale.creditAmount > 0 ? [{ label: t('Udhaar'), value: <HeroAmount value={sale.creditAmount} size="xl" /> }] : [{ label: t('Mila'), value: <HeroAmount value={sale.paidAmount - sale.changeAmount} size="xl" /> }]),
            ]}
          />
        ) : undefined}
        bottomActions={sale ? (
          <View style={{ flex: 1, gap: th.space(2) }}>
            {!sale.pending && (
              <Row gap={2}>
                <Button icon={Receipt} style={{ flex: 1 }} onPress={() => router.push(`/sales/${sale.id}/receipt` as never)}>{t('Receipt')}</Button>
                <Button icon={MessageCircle} variant="secondary" style={{ flex: 1 }} onPress={() => void whatsapp()}>{t('WhatsApp')}</Button>
              </Row>
            )}
            {!voided && (can(P.RETURNS_CREATE) || can(P.SALES_VOID)) && (
              <Row gap={2}>
                {can(P.RETURNS_CREATE) && returnable && <Button size="sm" icon={RotateCcw} variant="soft" style={{ flex: 1 }} onPress={() => router.push(`/pos/return?saleId=${sale.id}` as never)}>{t('Maal wapas')}</Button>}
                {can(P.SALES_VOID) && <Button size="sm" icon={Ban} variant="ghost" style={{ flex: 1 }} onPress={() => setVoiding(true)}>{t('Void')}</Button>}
              </Row>
            )}
          </View>
        ) : undefined}
      >
        {sale && (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2} wrap>
              {sale.pending && <Badge tone="warning" icon={CloudOff}>{t('Waiting to sync')}</Badge>}
              {sale.status !== 'COMPLETED' && <Badge tone={st!.tone}>{t(st!.label)}</Badge>}
              {sale.priceTier && sale.priceTier !== 'RETAIL' && <Badge tone="info">{tierLabel(sale.priceTier)}</Badge>}
              {sale.source !== 'POS' && <Badge tone="accent">{t(SOURCE_LABEL[sale.source] ?? sale.source)}{sale.sourceRef ? ` ${sale.sourceRef}` : ''}</Badge>}
              {(extras.rowChips?.(sale) ?? []).map((c) => <Badge key={c.label} tone={c.tone ?? 'neutral'} icon={c.icon}>{c.label}</Badge>)}
            </Row>
            {!!sale.note && <Text size="xs" tone="muted">{sale.note}</Text>}

            <DetailSection title={t('Customer')}>
              {sale.customer ? (
                <ListRow leading={<Avatar name={sale.customer.name} size={40} />} title={sale.customer.name} subtitle={sale.customer.phone ?? undefined} chevron
                  onPress={() => router.push(`/customers/${sale.customer!.id}` as never)} />
              ) : <DetailRow label={t('Walk-in')} value="" last />}
              {!!sale.receivedByName && <DetailRow label={t('Maal liya')} value={sale.receivedByName} />}
              {!!sale.staff && <DetailRow label={t('Staff')} value={sale.staff} />}
              {!!sale.shop && <DetailRow label={t('Branch')} value={sale.shop.name} last />}
            </DetailSection>

            <DetailSection title={t('Cheezein · {{count}}', { count: sale.items.length })}>
              {sale.items.map((it, i) => (
                <ListRow key={it.id} dense divider={i < sale.items.length - 1}
                  leading={<Text weight="bold" ltr style={{ minWidth: 34, textAlign: 'right' }}>{formatNumber(it.quantity, { maxDecimals: 3 })}</Text>}
                  title={`${it.name}${it.variant ? ` · ${it.variant}` : ''}`}
                  subtitle={<Text size="xs" tone="muted">
                    <Amount value={it.price} size="xs" tone="muted" />{` / ${it.unit}`}
                    {it.returnedQty > 0 ? <Text size="xs" tone="danger">{`  ${t('· {{returnedQty}} wapas', { returnedQty: formatNumber(it.returnedQty, { maxDecimals: 3 }) })}`}</Text> : null}
                    {it.priceTier && it.priceTier !== 'RETAIL' && it.retailPrice != null ? `  ${t('Retail {{retailPrice}}', { retailPrice: Math.round(it.retailPrice) })}` : ''}
                  </Text>}
                  trailing={<Amount value={it.total} weight="semibold" />} />
              ))}
            </DetailSection>

            {extras.DetailExtra && <extras.DetailExtra sale={sale} raw={raw} />}
            {(() => {
              const links = sale.pending ? [] : (extras.detailLinks?.(sale, raw) ?? []);
              return links.length ? (
                <DetailSection title={t('Linked')}>
                  {links.map((l, i) => <ListRow key={l.href} dense icon={l.icon ?? Link2} title={l.label} subtitle={l.hint} chevron divider={i < links.length - 1} onPress={() => router.push(l.href as never)} />)}
                </DetailSection>
              ) : null;
            })()}

            <DetailSection title={t('Payment')}>
              {sale.discount > 0 && <DetailRow label={t('Subtotal')} value={<Amount value={sale.subtotal} />} />}
              {sale.discount > 0 && <DetailRow label={t('Discount')} value={<Amount value={-sale.discount} tone="warning" />} />}
              <DetailRow label={t('Kul')} value={<Amount value={sale.total} weight="bold" />} />
              {(sale.payments?.length ?? 0) > 1 || sale.payments?.some((p) => p.method === 'TRADE_IN')
                ? sale.payments!.map((p, i) => <DetailRow key={i} label={`${t('Mila')} · ${methodLabel(p.method)}${p.note ? ` (${p.note})` : ''}`} value={<Amount value={p.amount} />} />)
                : <DetailRow label={`${t('Mila')} · ${methodLabel(sale.paymentMethod)}`} value={<Amount value={sale.paidAmount} />} />}
              {sale.changeAmount > 0 && <DetailRow label={t('Return di')} value={<Amount value={sale.changeAmount} tone="success" />} />}
              {sale.creditAmount > 0 && <DetailRow label={t('Udhaar')} value={<Amount value={sale.creditAmount} tone="warning" />} />}
              {sale.refundedAmount > 0 && <DetailRow label={t('Wapas kiya')} value={<Amount value={sale.refundedAmount} tone="danger" />} />}
              {!sale.pending && (
                <DetailRow last label={t('Profit')} value={costHidden ? <Text weight="semibold">{'Rs ••••'}</Text>
                  : <Text weight="semibold" tone={profit >= 0 ? 'success' : 'danger'} ltr>{`${cost(profit)} (${sale.total > 0 ? ((profit / sale.total) * 100).toFixed(1) : 0}%)`}</Text>} />
              )}
            </DetailSection>
          </View>
        )}
      </DetailTemplate>
      <VoidSheet sale={voidTarget} open={voiding} onClose={() => setVoiding(false)}
        onDone={() => { setVoiding(false); if (local.data?.pending) router.back(); else void full.refetch(); }} />
    </>
  );
}
