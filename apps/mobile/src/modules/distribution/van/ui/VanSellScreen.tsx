/**
 * Spot sale from the van: customer, items off the van, money taken now
 * (cash, wallet or cheque; the rest goes on the khata). The server prices
 * it with the customer's price list and schemes, makes the invoice out of
 * the van's stock and marks it delivered. Over the credit limit it asks for
 * the manager PIN.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { businessDayKey } from '@/core/format';
import { t } from '@/core/i18n';
import { isPinRequired, askManagerPin } from '@/core/security/ManagerPin';
import { Amount, Button, Card, Chip, DatePicker, Input, MoneyInput, Row, Screen, SectionHeader, Text, toast, useTheme } from '@/design';
import { phase2Api, type FieldMethod } from '@/modules/distribution/api/phase2.api';
import { distError } from '@/modules/distribution/api/distribution.api';
import { lineEstimate, LineEditor, CustomerPicker, newLine, StockList, type PickedCustomer, type PickedLine } from './VanParts';
import { VAN_KEY } from './VanHomeScreen';

const METHODS: { value: FieldMethod; label: string }[] = [
  { value: 'CASH', label: t('Cash') }, { value: 'JAZZCASH', label: t('JazzCash') }, { value: 'EASYPAISA', label: t('Easypaisa') },
  { value: 'BANK_TRANSFER', label: t('Bank') }, { value: 'CHEQUE', label: t('Cheque') },
];

const needsPin = (e: unknown) => isPinRequired(e) || !!(e as { response?: { data?: { needsPin?: boolean } } })?.response?.data?.needsPin;

export function VanSellScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { vanId } = useLocalSearchParams<{ vanId: string }>();
  const van = useQuery({ queryKey: ['van', 'one', vanId], queryFn: () => phase2Api.van(vanId), enabled: !!vanId }).data;
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [lines, setLines] = useState<PickedLine[]>([]);
  const [cash, setCash] = useState<number | null>(null);
  const [method, setMethod] = useState<FieldMethod>('CASH');
  const [bank, setBank] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  // One id per sale: a resend after a lost reply is saved once.
  const clientRef = useMemo(() => Crypto.randomUUID(), []);

  const cheque = method === 'CHEQUE';
  const picked = lines.filter((l) => l.qty > 0);
  const estimate = picked.reduce((s, l) => s + lineEstimate(l), 0);
  const valid = !!customer && picked.length > 0 && (!cheque || !(cash && cash > 0) || (!!bank.trim() && !!chequeNo.trim()));

  const save = async () => {
    if (!van || !customer) return;
    setSaving(true);
    const body = (pin?: string) => ({
      clientRef, customerId: customer.id,
      items: picked.map((l) => ({ productId: l.stock.productId, ...(l.stock.variantId && { variantId: l.stock.variantId }), ...(l.unitId && { unitId: l.unitId }), qty: l.qty })),
      ...(cash && cash > 0 && { cashReceived: cash, method }),
      ...(cheque && cash && cash > 0 && { bankName: bank.trim(), chequeNo: chequeNo.trim(), chequeDate: businessDayKey(chequeDate) }),
      ...(pin && { managerPin: pin }),
    });
    try {
      let r;
      try {
        r = await phase2Api.sellFromVan(van.id, body());
      } catch (e) {
        if (!needsPin(e)) throw e;
        const pin = await askManagerPin(t('Udhaar limit se zyada — manager PIN likhein'), 'credit');
        if (!pin) return;
        r = await phase2Api.sellFromVan(van.id, body(pin));
      }
      toast.success(`${r.invoice?.saleNumber ?? r.order.orderNumber} — Rs ${Math.round(r.order.total).toLocaleString('en-US')}`, { message: r.warnings[0] });
      qc.invalidateQueries({ queryKey: ['van'] });
      qc.invalidateQueries({ queryKey: VAN_KEY });
      router.back();
    } catch (e) {
      toast.error(distError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title={t('New sale')}
      subtitle={van?.name}
      keyboard
      narrow
      footer={(
        <View style={{ gap: th.space(2) }}>
          {estimate > 0 && <Row justify="between"><Text size="sm" tone="muted">{t('Andaza (server final price lagayega)')}</Text><Amount value={estimate} weight="bold" /></Row>}
          <Button size="xl" fullWidth style={{ flex: 1 }} icon={CheckCircle2} disabled={!valid} loading={saving} onPress={save}>{t('Save')}</Button>
        </View>
      )}
    >
      <CustomerPicker value={customer} onChange={setCustomer} />
      {lines.map((l) => (
        <LineEditor key={l.key} line={l} onChange={(n) => setLines((all) => all.map((x) => (x.key === l.key ? n : x)))} onRemove={() => setLines((all) => all.filter((x) => x.key !== l.key))} />
      ))}
      <SectionHeader title={t('Van se item chunein')} />
      <StockList stock={van?.stock ?? []} picked={lines} onAdd={(s) => setLines((all) => [...all, newLine(s)])} />

      <Card title={t('Abhi mila (baqi khata me)')}>
        <MoneyInput label={t('Amount')} value={cash} onChangeValue={setCash} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {METHODS.map((m) => <Chip key={m.value} label={m.label} selected={method === m.value} onPress={() => setMethod(m.value)} />)}
        </View>
        {cheque && (
          <View style={{ gap: th.space(3) }}>
            <Input label={t('Bank')} value={bank} onChangeText={setBank} maxLength={80} />
            <Input label={t('Cheque number')} value={chequeNo} onChangeText={setChequeNo} maxLength={40} ltr />
            <DatePicker label={t('Cheque ki date')} value={chequeDate} onChange={setChequeDate} />
          </View>
        )}
      </Card>
    </Screen>
  );
}
