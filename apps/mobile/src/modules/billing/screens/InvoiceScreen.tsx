/** One Nafaa bill: amount, period, payments made against it, share and pay. */

import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Copy, CreditCard, ExternalLink, Share2 } from 'lucide-react-native';
import { Share, View } from 'react-native';
import { formatDate, formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { canPurchaseInApp } from '@/core/platform/purchases';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, StatusPill, Text, toast, useTheme } from '@/design';
import { billingApi } from '../api/billing';
import { INTERVAL, INVOICE_STATUS, PAYMENT_STATUS, PROVIDER, daysText, daysUntil, isOpenInvoice } from '../lib/meta';

export function InvoiceScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const q = useQuery({ queryKey: ['billing-invoice', id], queryFn: () => billingApi.invoice(id), enabled: !!id });
  const inv = q.data;
  const st = inv ? INVOICE_STATUS[inv.status] : null;
  const open = inv ? isOpenInvoice(inv.status) : false;
  const days = inv ? daysUntil(inv.dueDate) : 0;

  const share = () => {
    if (!inv) return;
    const lines = [
      `${t('Nafaa bill')} ${inv.invoiceNumber}`,
      `${t('Plan')}: ${inv.subscription?.plan?.name || inv.description || t('Subscription')}`,
      `${t('Kul')}: Rs ${Math.round(inv.total).toLocaleString('en-US')}`,
      `${t('Ada kiya')}: Rs ${Math.round(inv.amountPaid).toLocaleString('en-US')}`,
      `${t('Due date')}: ${formatDate(inv.dueDate, { year: true })}`,
    ];
    void Share.share({ message: lines.join('\n') });
  };

  return (
    <DetailTemplate
      title={inv?.invoiceNumber ?? t('Bill')}
      subtitle={st ? t(st.hint) : undefined}
      actions={inv ? <IconButton icon={Share2} label={t('Share')} onPress={share} /> : undefined}
      loading={q.isLoading} error={q.error} onRetry={q.refetch} onRefresh={q.refetch} refreshing={q.isRefetching}
      summary={inv && st ? (
        <View style={{ alignItems: 'center', gap: 2, padding: th.space(4), borderRadius: th.radius('xl'), backgroundColor: th.colors[st.tone].soft }}>
          <Text size="xs" weight="semibold" color={th.colors[st.tone].text}>{open ? t('Abhi dena hai') : t('Kul amount')}</Text>
          <Amount value={open ? inv.amountDue : inv.total} size="3xl" weight="bold" />
          <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>
          {open && <Text size="xs" weight="semibold" color={th.colors[st.tone].text}>{days < 0 ? t('{{days}} din der ho gayi', { days: Math.abs(days) }) : t('Due: {{days}}', { days: daysText(days) })}</Text>}
        </View>
      ) : undefined}
      bottomActions={inv && open && can(P.BILLING_MANAGE) && canPurchaseInApp() ? (
        <Button icon={CreditCard} fullWidth onPress={() => router.push(`/billing/invoice/${inv.id}/pay` as never)}>{t('Payment karein')}</Button>
      ) : undefined}
    >
      {inv && (
        <>
          <DetailSection>
            <DetailRow label={t('Plan')} value={inv.subscription?.plan?.name || inv.description || t('Subscription')} />
            {inv.subscription?.interval ? <DetailRow label={t('Period')} value={t(INTERVAL[inv.subscription.interval].label)} /> : null}
            {inv.periodStart && inv.periodEnd ? <DetailRow label={t('Kab se kab tak')} value={`${formatDate(inv.periodStart, { year: true })} – ${formatDate(inv.periodEnd, { year: true })}`} /> : null}
            <DetailRow label={t('Bana')} value={formatDate(inv.createdAt, { year: true })} />
            <DetailRow label={t('Due date')} value={formatDate(inv.dueDate, { year: true })} />
            {inv.paidAt ? <DetailRow label={t('Ada hua')} value={formatDateTime(inv.paidAt)} /> : null}
          </DetailSection>
          <DetailSection>
            <DetailRow label={t('Amount')} value={<Amount value={inv.subtotal ?? inv.total} />} />
            {inv.tax ? <DetailRow label={t('Tax')} value={<Amount value={inv.tax} />} /> : null}
            <DetailRow label={t('Kul')} value={<Amount value={inv.total} weight="bold" />} />
            <DetailRow label={t('Ada kiya')} value={<Amount value={inv.amountPaid} tone="success" />} last />
          </DetailSection>
          {!!inv.payments?.length && (
            <DetailSection title={t('Is bill ki payments')}>
              {inv.payments.map((p, i) => {
                const ps = PAYMENT_STATUS[p.status];
                return (
                  <View key={p.id}>
                    <ListRow
                      icon={PROVIDER[p.provider]?.icon}
                      iconTone={ps.tone}
                      title={`${t(PROVIDER[p.provider]?.label ?? p.provider)} · ${formatDate(p.createdAt, { year: true })}`}
                      subtitle={p.transactionId ? t('Ref {{transactionId}}', { transactionId: p.transactionId }) : t('Ref nahi diya')}
                      trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={p.amount} weight="bold" /><StatusPill tone={ps.tone}>{t(ps.label)}</StatusPill></View>}
                      divider={i < inv.payments!.length - 1}
                    />
                    {p.rejectionReason ? <Text size="xs" tone="danger" style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(2) }}>{t('Wajah: {{rejectionReason}}', { rejectionReason: p.rejectionReason })}</Text> : null}
                    {p.upload?.url ? <Button variant="link" size="sm" icon={ExternalLink} onPress={() => void WebBrowser.openBrowserAsync(p.upload!.url)}>{t('Receipt dekhein')}</Button> : null}
                  </View>
                );
              })}
            </DetailSection>
          )}
          <Button variant="ghost" icon={Copy} onPress={() => { void Clipboard.setStringAsync(inv.invoiceNumber); toast.success(t('Bill number copy ho gaya')); }}>{t('Copy')}</Button>
        </>
      )}
    </DetailTemplate>
  );
}
