/** Invoice and payment rows plus the payment detail sheet. */

import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Copy, ExternalLink } from 'lucide-react-native';
import { View } from 'react-native';
import { formatDate, formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, DetailRow, ListGroup, ListRow, Row, Sheet, StatusPill, Text, toast, useTheme } from '@/design';
import type { Invoice, Payment } from '../api/billing';
import { INVOICE_STATUS, PAYMENT_STATUS, PROVIDER, daysText, daysUntil, isOpenInvoice } from '../lib/meta';

export function InvoiceRows({ invoices, onOpen }: { invoices: Invoice[]; onOpen: (i: Invoice) => void }) {
  return (
    <ListGroup>
      {invoices.map((inv) => {
        const st = INVOICE_STATUS[inv.status];
        const open = isOpenInvoice(inv.status);
        const days = daysUntil(inv.dueDate);
        return (
          <ListRow
            key={inv.id}
            icon={st.icon}
            iconTone={st.tone}
            title={<Text weight="semibold" ltr>{inv.invoiceNumber}</Text>}
            subtitle={`${inv.subscription?.plan?.name || inv.description || t('Subscription')} · ${formatDate(inv.createdAt, { year: true })}${open ? ` · ${t('Due {{value}}', { value: daysText(days).toLowerCase() })}` : ''}`}
            trailing={(
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Amount value={open ? inv.amountDue : inv.total} weight="bold" />
                <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>
              </View>
            )}
            chevron
            onPress={() => onOpen(inv)}
          />
        );
      })}
    </ListGroup>
  );
}

export function PaymentRows({ payments, onOpen }: { payments: Payment[]; onOpen: (p: Payment) => void }) {
  return (
    <ListGroup>
      {payments.map((p) => {
        const st = PAYMENT_STATUS[p.status];
        const pv = PROVIDER[p.provider];
        return (
          <ListRow
            key={p.id}
            icon={pv?.icon}
            iconTone={st.tone}
            title={pv ? t(pv.label) : p.provider}
            subtitle={`${formatDateTime(p.createdAt)}${p.invoice?.invoiceNumber ? ` · ${p.invoice.invoiceNumber}` : ''}${p.transactionId ? ` · ${t('Ref {{transactionId}}', { transactionId: p.transactionId })}` : ''}`}
            trailing={(
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Amount value={p.amount} weight="bold" />
                <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>
              </View>
            )}
            chevron
            onPress={() => onOpen(p)}
          />
        );
      })}
    </ListGroup>
  );
}

export function PaymentSheet({ payment: p, onClose }: { payment: Payment | null; onClose: () => void }) {
  const th = useTheme();
  const st = p ? PAYMENT_STATUS[p.status] : null;
  const rows: Array<[string, string]> = p ? [
    [t('Tareeqa'), t(PROVIDER[p.provider]?.label ?? p.provider)],
    [t('Bheji'), formatDateTime(p.createdAt)],
    ...(p.invoice?.invoiceNumber ? [[t('Bill'), p.invoice.invoiceNumber] as [string, string]] : []),
    ...(p.transactionId ? [[t('Ref / TID'), p.transactionId] as [string, string]] : []),
    ...(p.payerName ? [[t('Bhejne wala'), p.payerName] as [string, string]] : []),
    ...(p.bankName ? [[t('Bank'), p.bankName] as [string, string]] : []),
    ...(p.approvedAt ? [[t('Approve hui'), formatDateTime(p.approvedAt)] as [string, string]] : []),
  ] : [];
  return (
    <Sheet open={!!p} onClose={onClose} title={t('Payment ki details')} description={st ? t(st.hint) : undefined}
      footer={p ? (
        <Row gap={3}>
          {p.transactionId ? <Button variant="secondary" icon={Copy} style={{ flex: 1 }} onPress={() => { void Clipboard.setStringAsync(p.transactionId!); toast.success(t('Ref copy ho gaya')); }}>{t('Ref copy')}</Button> : null}
          {p.upload?.url ? <Button variant="secondary" icon={ExternalLink} style={{ flex: 1 }} onPress={() => void WebBrowser.openBrowserAsync(p.upload!.url)}>{t('Receipt dekhein')}</Button> : null}
        </Row>
      ) : undefined}>
      {p && st && (
        <View style={{ gap: th.space(3) }}>
          <View style={{ alignItems: 'center', gap: 2, padding: th.space(4), borderRadius: th.radius('xl'), backgroundColor: th.colors[st.tone].soft }}>
            <Text size="xs" weight="semibold" color={th.colors[st.tone].text}>{t(st.label)}</Text>
            <Amount value={p.amount} size="3xl" weight="bold" />
          </View>
          <Card flush>
            {rows.map(([k, v], i) => <DetailRow key={k} label={k} value={<Text size="sm" weight="semibold" ltr={k === t('Ref / TID')}>{v}</Text>} last={i === rows.length - 1} />)}
          </Card>
          {p.rejectionReason ? <Card tone="danger" title={t('Wapas kyun ki gayi')}><Text size="sm">{p.rejectionReason}</Text></Card> : null}
          {p.notes ? <Card tone="muted"><Text size="sm">{p.notes}</Text></Card> : null}
        </View>
      )}
    </Sheet>
  );
}
