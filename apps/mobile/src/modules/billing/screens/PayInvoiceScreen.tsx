/**
 * Pay one Nafaa bill: card checkout on the web (Stripe) when it is on, or a
 * bank / wallet transfer with a receipt photo that the Nafaa team approves.
 * Same calls as the web.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Camera, Check, Copy, CreditCard, ImagePlus, Lock, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PLAN_INACTIVE_TEXT, canPurchaseInApp } from '@/core/platform/purchases';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Button, Card, ChipGroup, EmptyState, FormSection, FormTemplate, Icon, Input, PressableScale, Row, Screen, Skeleton, Text, TextArea, toast, useTheme,
} from '@/design';
import { pickAndUpload } from '@/modules/profile/lib/upload';
import { billingApi, stripeApi, type PaymentProvider } from '../api/billing';
import { INVOICE_STATUS, PROVIDER, daysText, daysUntil } from '../lib/meta';

const PROVIDERS: PaymentProvider[] = ['MANUAL_BANK', 'JAZZCASH', 'EASYPAISA', 'NAYAPAY'];

export function PayInvoiceScreen() {
  return canPurchaseInApp() ? <PayInvoiceForm /> : <PayNotOnIos />;
}

/** iOS: payments are not taken in the app (App Store rule); the bill opens read-only. */
function PayNotOnIos() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen title={t('Bill')}>
      <EmptyState icon={Lock} title={t('Ye bill sirf dekhne ke liye hai')} message={t(PLAN_INACTIVE_TEXT)}
        action={id ? <Button variant="secondary" onPress={() => router.replace(`/billing/invoice/${id}` as never)}>{t('Bill dekhein')}</Button> : undefined} />
    </Screen>
  );
}

function PayInvoiceForm() {
  const th = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const online = useOnlineStatus();
  const canPay = usePermission()(P.BILLING_MANAGE);

  const [provider, setProvider] = useState<PaymentProvider>('MANUAL_BANK');
  const [transactionId, setTransactionId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<{ id: string; uri: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const invoice = useQuery({ queryKey: ['billing-invoice', id], queryFn: () => billingApi.invoice(id), enabled: !!id });
  const bank = useQuery({ queryKey: ['billing-bank-info'], queryFn: billingApi.bankInfo });
  const stripe = useQuery({ queryKey: ['stripe-config'], queryFn: stripeApi.config });
  const inv = invoice.data;

  const refresh = () => ['billing-invoices', 'billing-payments', 'subscription-current', 'subscription-pending', 'billing-invoice'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const submit = useMutation({
    mutationFn: billingApi.submitPayment,
    onSuccess: () => {
      toast.success(t('Payment bhej di gayi'), { message: t('Nafaa team 24 ghante me check karegi. Notification aayegi.') });
      refresh();
      router.replace('/billing');
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Payment nahi gayi'))),
  });

  const card = useMutation({
    mutationFn: (invoiceId: string) => stripeApi.checkout(invoiceId),
    onSuccess: async (data) => { await WebBrowser.openBrowserAsync(data.url); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Card payment shuru nahi hui'))),
  });

  const pick = async (source: 'camera' | 'gallery') => {
    setUploading(true);
    try {
      const r = await pickAndUpload(source, 'payment-proof');
      if (r) { setReceipt({ id: r.id, uri: r.uri }); toast.success(t('Receipt upload ho gayi')); }
    } finally { setUploading(false); }
  };

  const copy = (text: string) => { void Clipboard.setStringAsync(text); toast.success(t('Copy ho gaya')); };

  if (invoice.isLoading) return <Screen title={t('Payment karein')}><Skeleton height={120} /></Screen>;
  if (!inv) {
    return (
      <Screen title={t('Payment karein')}>
        <EmptyState title={invoice.isError ? t('Bill load nahi hua') : t('Ye bill nahi mila')} action={invoice.isError ? <Button variant="secondary" onPress={() => invoice.refetch()}>{t('Dobara koshish')}</Button> : undefined} />
      </Screen>
    );
  }

  const st = INVOICE_STATUS[inv.status];
  const pendingPayment = inv.payments?.find((p) => p.status === 'PENDING') ?? null;
  const lastRejected = !pendingPayment ? inv.payments?.find((p) => p.status === 'REJECTED') ?? null : null;
  const canSubmit = inv.status !== 'PAID' && inv.status !== 'CANCELLED' && !pendingPayment;
  const days = daysUntil(inv.dueDate);
  const b = bank.data;

  const accountRows = (): Array<{ label: string; value?: string | null; big?: boolean }> => {
    if (!b) return [];
    if (provider === 'MANUAL_BANK') return [
      { label: t('Bank'), value: b.bank.name }, { label: t('Account title'), value: b.bank.accountTitle },
      { label: t('Account number'), value: b.bank.accountNumber }, { label: t('IBAN'), value: b.bank.iban },
    ];
    if (provider === 'JAZZCASH') return [{ label: t('Account title'), value: b.jazzcash.title }, { label: t('JazzCash number'), value: b.jazzcash.number, big: true }];
    if (provider === 'EASYPAISA') return [{ label: t('Account title'), value: b.easypaisa.title }, { label: t('EasyPaisa number'), value: b.easypaisa.number, big: true }];
    return [
      { label: t('Account title'), value: b.nayapay.title }, { label: t('NayaPay number'), value: b.nayapay.number, big: true },
      ...(b.nayapay.handle ? [{ label: t('NayaPay handle'), value: `@${b.nayapay.handle}` }] : []),
    ];
  };

  const send = () => {
    if (!online) { toast.warning(onlineNeededText('billing')); return; }
    if (!receipt) { toast.error(t('Payment ka screenshot upload karein')); return; }
    if (!payerName.trim()) { toast.error(t('Bhejne wale ka naam zaroori hai')); return; }
    submit.mutate({
      invoiceId: inv.id, amount: inv.amountDue, provider,
      bankName: bankName.trim() || undefined, transactionId: transactionId.trim() || undefined,
      payerName: payerName.trim(), payerPhone: payerPhone.trim() || undefined, uploadId: receipt.id, notes: notes.trim() || undefined,
    });
  };

  const summary = (
    <>
      <Card>
        <Row justify="between">
          <View style={{ gap: 2 }}>
            <Text size="xs" tone="muted">{inv.status === 'PAID' ? t('Ada ho chuka') : t('Dena hai')}</Text>
            <Amount value={inv.status === 'PAID' ? inv.total : inv.amountDue} size="2xl" weight="bold" />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text size="sm" weight="semibold" tone={st.tone === 'neutral' || st.tone === 'accent' ? 'muted' : st.tone}>{t(st.label)}</Text>
            <Text size="xs" tone="muted">{t('{{value}} · Due {{dueDate}}', { value: inv.subscription?.plan?.name || inv.description || 'Subscription', dueDate: formatDate(inv.dueDate, { year: true }) })}</Text>
            {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && <Text size="xs" weight="semibold" tone={days < 0 ? 'danger' : 'muted'}>{days < 0 ? t('{{days}} din der ho gayi', { days: Math.abs(days) }) : daysText(days)}</Text>}
          </View>
        </Row>
      </Card>

      {inv.status === 'PAID' && <Card tone="success" title={t('Payment mil gayi')}><Text size="sm">{t('Ye bill ada ho chuka hai.')}</Text></Card>}
      {inv.status === 'CANCELLED' && <Card tone="muted" title={t('Ye bill band hai')}><Text size="sm">{t('Is par payment nahi ho sakti.')}</Text></Card>}
      {pendingPayment && <Card tone="warning" title={t('Payment check ho rahi hai')}><Text size="sm">{t('Nafaa team 24 ghante me dekhegi')}</Text></Card>}
      {lastRejected && <Card tone="danger" title={t('Pichli payment wapas ki gayi')}><Text size="sm">{lastRejected.rejectionReason || t('Wajah parh kar dobara bhejein')}</Text></Card>}
      {!canPay && canSubmit && <Card tone="info"><Text size="sm">{t('Payment sirf malik (billing ki permission wala) kar sakta hai.')}</Text></Card>}
    </>
  );

  if (!canSubmit || !canPay) return <Screen title={inv.invoiceNumber}>{summary}</Screen>;

  return (
    <FormTemplate title={inv.invoiceNumber} saveLabel={t('Payment bhejein')} saving={submit.isPending} onSave={send}>
      {summary}
      {(
        <>
          {stripe.data?.enabled && (
            <FormSection title={t('Card se payment')}>
              <Button icon={CreditCard} loading={card.isPending} onPress={() => (online ? card.mutate(inv.id) : toast.warning(onlineNeededText('billing')))}>{t('Card se ada karein')}</Button>
              <Row gap={2}><Icon icon={Lock} size={14} tone="muted" /><Text size="xs" tone="muted">{t('Visa / Mastercard')}</Text></Row>
            </FormSection>
          )}

          <FormSection title={t('Tareeqa chunein')}>
            <ChipGroup wrap value={provider} onChange={(v) => setProvider(v as PaymentProvider)}
              options={PROVIDERS.map((p) => ({ value: p, label: t(PROVIDER[p].label), icon: PROVIDER[p].icon }))} />
            <Card tone="muted" flush>
              {accountRows().map((r, i, all) => (
                <Row key={r.label} gap={3} justify="between" style={{ padding: th.space(3), borderBottomWidth: i < all.length - 1 ? 1 : 0, borderBottomColor: th.colors.divider }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text size="xs" tone="muted">{r.label}</Text>
                    <Text size={r.big ? 'lg' : 'sm'} weight="semibold" ltr>{r.value || '—'}</Text>
                  </View>
                  {r.value ? <Button variant="ghost" size="sm" icon={Copy} onPress={() => copy(r.value!)}>{t('Copy')}</Button> : null}
                </Row>
              ))}
            </Card>
          </FormSection>

          <FormSection title={t('Receipt upload')}>
            {receipt ? (
              <View style={{ alignSelf: 'flex-start' }}>
                <Image source={{ uri: receipt.uri }} style={{ width: 120, height: 120, borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }} contentFit="cover" />
                <PressableScale onPress={() => setReceipt(null)} accessibilityLabel={t('Hatayein')} hitSlop={8}
                  style={{ position: 'absolute', top: 4, end: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: th.colors.overlay, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon={X} size={14} color={th.colors.neutral.onSolid} />
                </PressableScale>
                <Row gap={1} style={{ marginTop: 4 }}><Icon icon={Check} size={14} tone="success" /><Text size="xs" tone="success">{t('Ho gaya')}</Text></Row>
              </View>
            ) : uploading ? <ActivityIndicator /> : (
              <Row gap={3}>
                <Button variant="secondary" icon={Camera} style={{ flex: 1 }} onPress={() => void pick('camera')}>{t('Camera')}</Button>
                <Button variant="secondary" icon={ImagePlus} style={{ flex: 1 }} onPress={() => void pick('gallery')}>{t('Gallery')}</Button>
              </Row>
            )}
            <Text size="xs" tone="muted">{t('Payment ka screenshot upload karein')}</Text>
          </FormSection>

          <FormSection title={t('Bhejne wale ki details')}>
            <Input label={t('Poora naam')} value={payerName} onChangeText={setPayerName} />
            <Input label={t('Phone')} value={payerPhone} onChangeText={setPayerPhone} keyboardType="phone-pad" ltr />
            <Input label={t('Ref / TID')} value={transactionId} onChangeText={setTransactionId} ltr autoCapitalize="characters" />
            <Input label={t('Bank')} value={bankName} onChangeText={setBankName} />
            <TextArea label={t('Notes')} value={notes} onChangeText={setNotes} />
          </FormSection>
        </>
      )}
    </FormTemplate>
  );
}
