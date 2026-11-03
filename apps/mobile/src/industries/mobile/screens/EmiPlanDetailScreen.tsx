/**
 * One installment plan (web EmiPlanDetailPage): the customer and the bill it
 * splits, every installment with its due date and what was paid, the khata
 * entries made against it, and the actions — take money, forgive one
 * installment, mark default or close the plan.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, HandCoins, MessageCircle, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatDate, formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Button, DetailRow, DetailSection, DetailTemplate, HeroAmount, HeroText, IconButton, ListRow, PageHero, Row, Text, useTheme } from '@/design';
import { emiApi } from '../api';
import { CollectSheet, EmiReasonSheet, type EmiPop } from '../components/EmiSheets';
import { MetaPill } from '../components/kit';
import { EMI_KEY, installmentOf, methodLabel, openWhatsApp, planStatusOf } from '../meta';
import { emiMessage } from '../slips';

export function EmiPlanDetailScreen() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const canManage = usePermission()(P.KHATA_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) ?? '';
  const lang = useBillLanguage();
  const [collect, setCollect] = useState(false);
  const [pop, setPop] = useState<EmiPop>(null);
  const q = useQuery({ queryKey: [EMI_KEY, 'one', id], queryFn: () => emiApi.getOne(id), enabled: !!id });
  const p = q.data;
  const active = p?.status === 'ACTIVE';
  const collected = p ? Number(p.paidAmount) - Number(p.downPayment) : 0;

  return (
    <DetailTemplate
      title={p?.customerName ?? t('Qist plan')}
      subtitle={p ? `${p.planNumber} · ${p.installmentCount} × ${formatMoney(p.installmentAmount)}` : undefined}
      loading={q.isLoading} error={p ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={p && (p.customerPhone ?? p.customer?.phone) ? <IconButton icon={MessageCircle} label={t('Yaad dilayein')} onPress={() => openWhatsApp(p.customerPhone ?? p.customer?.phone, emiMessage(p, shopName, lang))} /> : undefined}
      summary={p ? (
        <PageHero title={p.customerName} chip={t(planStatusOf(p.status).label)} stats={[
          { label: t('Qiston me'), value: <HeroAmount value={p.financedAmount} size="xl" /> },
          { label: t('Mila'), value: <HeroAmount value={collected} size="xl" /> },
          { label: t('Baqi'), value: <HeroAmount value={p.remainingAmount} size="xl" /> },
        ]} />
      ) : undefined}
      bottomActions={p && canManage && active ? <Button icon={HandCoins} variant="success" style={{ flex: 1 }} onPress={() => setCollect(true)}>{t('Qist lein')}</Button> : undefined}
    >
      {p && (
        <>
          {p.overdueAmount > 0 ? <Text size="sm" tone="danger">{t('Late')}: {formatMoney(p.overdueAmount)} ({p.overdueCount})</Text> : p.nextDueDate && active ? <Text size="sm" tone="muted">{t('Agli qist')}: {formatMoney(p.nextDueAmount)} — {formatDate(p.nextDueDate)}</Text> : null}
          {p.customer && active && Math.abs(Number(p.customer.balance) - Number(p.remainingAmount)) > 1 ? (
            <Text size="xs" tone="info">{t('Customer ka poora khata {{value}} hai — is plan ke baqi {{remaining}} ke ilawa aur udhaar ya advance bhi ho sakta hai.', { value: formatMoney(Number(p.customer.balance)), remaining: formatMoney(p.remainingAmount) })}</Text>
          ) : null}
          <DetailSection title={t('Qistein')}>
            {p.installments.map((i, n) => {
              const due = Number(i.amount) - Number(i.paidAmount);
              return (
                <ListRow key={i.id} divider={n < p.installments.length - 1} leading={<Text weight="bold" tone="muted" ltr>{i.installmentNumber}</Text>}
                  title={formatDate(i.dueDate)} subtitle={i.paidDate ? t('mili {{paidDate}}', { paidDate: formatDate(i.paidDate) }) : i.status === 'WAIVED' && i.notes ? i.notes : undefined}
                  trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Text weight="bold" ltr>{formatMoney(i.amount)}</Text><MetaPill m={installmentOf(i.status)} />{Number(i.paidAmount) > 0 && i.status !== 'PAID' ? <Text size="2xs" tone="warning">{t('mila {{paidAmount}}', { paidAmount: formatMoney(i.paidAmount) })}</Text> : null}</View>}
                  onPress={canManage && active && (i.status === 'PENDING' || i.status === 'OVERDUE') && due > 0 ? () => setPop({ kind: 'waive', i }) : undefined} />
              );
            })}
            {canManage && active ? <Text size="2xs" tone="muted" style={{ padding: th.space(3) }}>{t('Qist maaf karne ke liye us par dabayein')}</Text> : null}
          </DetailSection>
          <DetailSection title={t('Bill')}>
            <DetailRow label={t('Bill')} value={p.sale?.saleNumber ?? '—'} />
            <DetailRow label={t('Kul')} value={formatMoney(p.totalAmount)} />
            <DetailRow label={t('Down payment')} value={formatMoney(p.downPayment)} last={!p.sale} />
            {(p.sale?.items ?? []).map((it, n) => <DetailRow key={it.id} label={`${it.product?.name ?? ''}${it.note ? ` · ${it.note}` : ''}`} value={formatMoney(it.total)} last={n === (p.sale?.items.length ?? 0) - 1} />)}
          </DetailSection>
          {p.payments.length > 0 && (
            <DetailSection title={t('Khata entries')}>
              {p.payments.map((x, n) => <DetailRow key={x.id} last={n === p.payments.length - 1} label={`${formatDateTime(x.createdAt)} · ${methodLabel(x.paymentMethod)}`} value={formatMoney(x.amount)} />)}
            </DetailSection>
          )}
          {p.notes ? <DetailSection title={t('Note')}><Text size="sm" style={{ padding: th.space(3) }}>{p.notes}</Text></DetailSection> : null}
          {canManage && active && (
            <Row gap={2} wrap>
              <Button variant="ghost" icon={XCircle} onPress={() => setPop({ kind: 'default' })}>{t('Default karein')}</Button>
              <Button variant="ghost" icon={Ban} onPress={() => setPop({ kind: 'cancel' })}>{t('Plan cancel')}</Button>
            </Row>
          )}
          {p.saleId ? <Button variant="ghost" onPress={() => router.push(`/sales/${p.saleId}` as never)}>{t('Bill kholein')}</Button> : null}
        </>
      )}
      <CollectSheet plan={collect ? p ?? null : null} onClose={() => setCollect(false)} />
      <EmiReasonSheet plan={p ?? null} pop={pop} onClose={() => setPop(null)} />
    </DetailTemplate>
  );
}
