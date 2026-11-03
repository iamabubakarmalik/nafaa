/**
 * Take a payment, add credit, or bring in the old balance from a paper
 * register, for one customer. Shows the balance before and after, and for a
 * payment (online) the bills it clears, oldest first, with the profit it
 * brings in. Payments and credit also work without internet.
 */

import { useQuery } from '@tanstack/react-query';
import { HandCoins } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { balanceAfter, paymentTooMuch, quickAmounts, type KhataAction } from '@nafaa/core/customers';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { OfflineRuleError, type PaymentMethod } from '@/core/offline';
import { Amount, Button, Chip, Input, MoneyInput, Row, Sheet, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { MethodGrid, METHODS } from '@/modules/pos/components/parts';
import { ledgerApi } from '../api/customers';
import { giveCredit, receivePayment } from '../lib/actions';
import { refreshCustomers } from '../lib/refresh';

const TITLES: Record<KhataAction, { title: string; hint: string; button: string }> = {
  payment: { title: msg('Payment receive'), hint: msg('Customer ne kitne diye'), button: msg('Receive karein') },
  udhaar: { title: msg('Udhaar chadhayein'), hint: msg('Bina bill ke udhaar — jaise naqd paise diye'), button: msg('Chadhayein') },
  opening: { title: msg('Purana khata'), hint: msg('Kaapi / register ka purana baqi — maujooda khate mein jurega'), button: msg('Jor dein') },
};

export function KhataActionSheet({ open, action, customer, onClose, onDone }: {
  open: boolean;
  action: KhataAction;
  customer: { id: string; name: string; balance: number };
  onClose: () => void;
  onDone?: () => void;
}) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [amount, setAmount] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) { setAmount(action === 'payment' && customer.balance > 0 ? Math.round(customer.balance * 100) / 100 : null); setNote(''); setMethod('CASH'); }
  }, [open, action, customer.balance]);

  const n = amount ?? 0;
  const after = balanceAfter(customer.balance, n, action);
  const tooMuch = action === 'payment' && paymentTooMuch(customer.balance, n);
  const asked = useDebouncedValue(n, 350);
  const preview = useQuery({
    queryKey: ['khata-payment-preview', customer.id, asked],
    queryFn: () => ledgerApi.preview(customer.id, asked),
    enabled: open && action === 'payment' && online && asked > 0 && !tooMuch && !customer.id.startsWith('tmp_'),
    staleTime: 15_000,
    retry: false,
  });
  const needsOnline = action === 'opening' && !online;
  const text = TITLES[action];
  const p = preview.data && asked === n ? preview.data : null;

  const save = async () => {
    if (!(n > 0) || tooMuch) return;
    setBusy(true);
    try {
      if (action === 'payment') await receivePayment({ customerId: customer.id, amount: n, paymentMethod: method, note: note.trim() || undefined });
      else if (action === 'udhaar') await giveCredit({ customerId: customer.id, amount: n, note: note.trim() || undefined });
      else { await ledgerApi.opening(customer.id, { balance: n, note: note.trim() || undefined }); refreshCustomers(); }
      toast.success(`${customer.name}: ${t(text.title)}`, { message: `Rs ${Math.round(n).toLocaleString('en-US')}${online ? '' : ` · ${t('internet aate hi server par jayega')}`}` });
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof OfflineRuleError ? e.message : apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`${t(text.title)} · ${customer.name}`} description={t(text.hint)}
      footer={<Button fullWidth size="lg" variant={action === 'payment' ? 'success' : 'primary'} loading={busy} disabled={!(n > 0) || tooMuch || needsOnline} onPress={() => void save()}>{t(text.button)}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount} size="xl" autoFocus={action !== 'payment'} />
        <Row gap={2} wrap>
          {quickAmounts(customer.balance, action).map((q) => <Chip key={q} label={`Rs ${q.toLocaleString('en-US')}`} selected={n === q} onPress={() => setAmount(q)} />)}
        </Row>
        {action === 'payment' && (
          <View style={{ gap: th.space(1.5) }}>
            <Text size="sm" weight="semibold" tone="secondary">{t('Kaise mile')}</Text>
            <MethodGrid value={method} onChange={setMethod} methods={METHODS} />
            {method !== 'CASH' && <Text size="xs" tone="muted">{t('Ye paisa galle (drawer) me nahi, {{label}} ke account me jayega.', { label: t(METHODS.find((m) => m.id === method)?.label ?? method) })}</Text>}
          </View>
        )}
        <Input label={t('Note')} value={note} onChangeText={setNote} placeholder={action === 'payment' ? t('Note (jaise: transaction ID)') : t('Note (kis cheez ka)')} />
        <Row gap={2}>
          <View style={{ flex: 1, padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted, alignItems: 'center' }}>
            <Text size="xs" tone="muted">{t('Abhi')}</Text><Amount value={customer.balance} weight="bold" />
          </View>
          <View style={{ flex: 1, padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: tooMuch ? th.colors.danger.soft : th.colors.surfaceMuted, alignItems: 'center' }}>
            <Text size="xs" tone="muted">{t('Is ke baad')}</Text><Amount value={after} weight="bold" tone={after > 0 ? 'danger' : 'success'} />
          </View>
        </Row>
        {tooMuch && <Text size="sm" tone="danger">{t('Baqi sirf {{balance}} hai — is se zyada receive nahi ho sakta.', { balance: `Rs ${Math.round(customer.balance).toLocaleString('en-US')}` })}</Text>}
        {needsOnline && <Text size="sm" tone="warning">{t('Purana khata likhne ke liye internet chahiye')}</Text>}
        {p && (
          <View style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.success.border, backgroundColor: th.colors.success.soft }}>
            {!p.costHidden && p.profit != null && (
              <Row justify="between"><Row gap={1.5}><HandCoins size={16} color={th.colors.success.text} /><Text size="sm" weight="semibold">{t('Is payment se Profit')}</Text></Row>
                <Amount value={p.profit} weight="bold" tone="success" /></Row>
            )}
            {p.bills.length > 0 ? p.bills.slice(0, 5).map((b) => (
              <Row key={b.saleId} justify="between">
                <Text size="xs" style={{ flex: 1 }} numberOfLines={1}><Text size="xs" weight="bold" ltr>{b.saleNumber}</Text> · {formatDate(b.soldAt)} · {b.leftAfter <= 0.5 ? t('poora clear') : t('baqi {{leftAfter}}', { leftAfter: Math.round(b.leftAfter) })}</Text>
                <Amount value={b.amount} size="xs" />
              </Row>
            )) : <Text size="xs" tone="secondary">{t('Ye payment kisi bill par nahi jayegi.')}</Text>}
            {p.bills.length > 5 && <Text size="xs" tone="muted">{`+${p.bills.length - 5}`}</Text>}
            {p.toOther > 0.5 && <Text size="xs" tone="secondary">{t('{{toOther}} purane khate / bina bill ke udhaar ya advance mein — is par Profit nahi.', { toOther: `Rs ${Math.round(p.toOther)}` })}</Text>}
          </View>
        )}
      </View>
    </Sheet>
  );
}
