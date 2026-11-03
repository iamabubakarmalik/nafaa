/**
 * One panel's statement (web PanelStatementPage): bills of its people and the
 * payments the company made, for a period. Take a payment on the panel's khata
 * (works offline) and print or share the statement for the company.
 */

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Building2, Pencil, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { enqueueKhataPayment } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, Card, DatePicker, EmptyState, IconButton, Input, KpiStrip, ListRow, MoneyInput, Row, Screen, Sheet, Text, toast, useTheme } from '@/design';
import { MethodChips, dateToKey, errorText, todayKey } from '../../_shared/deskKit';
import { DocActions, L, type PackDoc } from '../../_shared/docKit';
import { FormSheet } from '../../_shared/serviceKit';
import { clinicApi, type PanelStatement } from '../api';
import { CLINIC_KEYS, dateOf, refreshClinic } from '../meta';

const stamp = (k: string, end?: boolean) => `${k}T${end ? '23:59:59' : '00:00:00'}+05:00`;

const statementDoc = (s: PanelStatement, from: string, to: string, lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `panel-${s.panel.name}-${from}`,
  title: L(lang, 'Panel statement', 'پینل اسٹیٹمنٹ', 'Panel statement'),
  subtitle: s.panel.name,
  meta: [[L(lang, 'Period', 'مدت', 'Muddat'), `${dateOf(from)} – ${dateOf(to)}`]],
  rows: [[L(lang, 'Billed', 'بل', 'Billed'), formatMoney(s.totals.billed)], [L(lang, 'On account', 'ادھار', 'Udhaar'), formatMoney(s.totals.onKhata)], [L(lang, 'Received', 'وصول', 'Wasool'), formatMoney(s.totals.received)],
    [L(lang, 'Balance', 'باقی', 'Baqi'), formatMoney(s.customer?.balance ?? 0), 'strong']],
  tables: [
    { heading: L(lang, 'Bills', 'بل', 'Bills'), columns: [L(lang, 'Date', 'تاریخ', 'Date'), L(lang, 'Bill', 'بل', 'Bill'), L(lang, 'Patient', 'مریض', 'Mareez'), L(lang, 'Amount', 'رقم', 'Amount')],
      rows: s.bills.map((b) => [dateOf(b.createdAt), b.saleNumber, b.patient?.fullName ?? '—', formatMoney(b.total)]) },
    ...(s.payments.length ? [{ heading: L(lang, 'Payments', 'ادائیگیاں', 'Payments'), columns: [L(lang, 'Date', 'تاریخ', 'Date'), L(lang, 'Method', 'طریقہ', 'Tareeqa'), L(lang, 'Amount', 'رقم', 'Amount')],
      rows: s.payments.map((p) => [dateOf(p.createdAt), p.paymentMethod ?? '—', formatMoney(p.amount)]) }] : []),
  ],
});

export function PanelStatementScreen() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [to, setTo] = useState(new Date());
  const [paying, setPaying] = useState(false);
  const [edit, setEdit] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const f = dateToKey(from);
  const e = dateToKey(to) > todayKey() ? todayKey() : dateToKey(to);
  const q = useQuery({ queryKey: [CLINIC_KEYS.panels, 'statement', id, f, e], queryFn: () => clinicApi.panelStatement(id, stamp(f), stamp(e, true)) });
  const s = q.data;
  const balance = s?.customer?.balance ?? 0;
  const pay = async () => {
    if (!s?.customer || !(amount && amount > 0)) { toast.warning(t('Amount likhein')); return; }
    setBusy(true);
    try {
      await enqueueKhataPayment({ customerId: s.customer.id, amount, paymentMethod: method as never, note: note.trim() || undefined });
      refreshClinic(true); void q.refetch(); toast.success(t('Payment likh li')); setPaying(false);
    } catch (err) { toast.error(errorText(err, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Screen title={s?.panel.name ?? t('Panel')} subtitle={t('Panel statement')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={<Row gap={1}>{can(P.CUSTOMERS_EDIT) && <IconButton icon={Pencil} label={t('Edit')} onPress={() => setEdit(true)} />}{s && <DocActions build={(lang) => statementDoc(s, f, e, lang)} />}</Row>}
      footer={can(P.KHATA_MANAGE) && s?.customer && balance > 0 ? <Button fullWidth size="lg" icon={Wallet} onPress={() => { setAmount(balance); setPaying(true); }}>{t('Payment lein')}</Button> : undefined}>
      <View style={{ gap: th.space(3) }}>
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker label={t('Se')} value={from} onChange={setFrom} maximumDate={to} /></View>
          <View style={{ flex: 1 }}><DatePicker label={t('Tak')} value={to} onChange={setTo} minimumDate={from} maximumDate={new Date()} /></View>
        </Row>
        {s && (
          <>
            <KpiStrip items={[{ key: 'b', label: t('Billed'), value: formatMoney(s.totals.billed) }, { key: 'k', label: t('Khata me'), value: formatMoney(s.totals.onKhata) }, { key: 'r', label: t('Wasool'), value: formatMoney(s.totals.received) }]} />
            <Row justify="between"><Text tone="muted">{t('Baqi')}{s.panel.creditLimit > 0 ? ` · ${t('Limit')} ${formatMoney(s.panel.creditLimit)}` : ''}</Text><Amount value={balance} weight="bold" tone={balance > 0 ? 'warning' : undefined} /></Row>
            <Text size="sm" weight="semibold" tone="secondary">{t('Bills')}</Text>
            {s.bills.length === 0 ? <EmptyState icon={Building2} title={t('Is muddat me koi bill nahi')} /> : (
              <Card flush>{s.bills.map((b, i) => <ListRow key={b.id} divider={i < s.bills.length - 1} dense title={b.patient?.fullName ?? b.saleNumber} subtitle={`${dateOf(b.createdAt)} · ${b.saleNumber}${b.line ? ` · ${b.line}` : ''}`} trailing={<Amount value={b.total} weight="bold" />} />)}</Card>
            )}
            {s.payments.length > 0 && (
              <>
                <Text size="sm" weight="semibold" tone="secondary">{t('Payments')}</Text>
                <Card flush>{s.payments.map((p, i) => <ListRow key={p.id} divider={i < s.payments.length - 1} dense title={dateOf(p.createdAt)} subtitle={p.note ?? p.reference ?? p.paymentMethod ?? undefined} trailing={<Amount value={p.amount} weight="bold" tone="success" />} />)}</Card>
              </>
            )}
          </>
        )}
      </View>
      <Sheet open={paying} onClose={() => setPaying(false)} title={t('Payment lein')} description={s?.panel.name}
        footer={<Button fullWidth size="lg" variant="success" loading={busy} onPress={() => void pay()}>{t('Save')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount} size="xl" />
          <MethodChips value={method} onChange={setMethod} />
          <Input label={t('Note')} value={note} onChangeText={setNote} />
        </View>
      </Sheet>
      <FormSheet open={edit} title={t('Edit panel')} onClose={() => setEdit(false)}
        fields={[{ key: 'name', label: t('Company ka naam'), required: true }, { key: 'creditLimit', label: t('Udhaar ki had'), kind: 'money' }, { key: 'isActive', label: t('Chalu'), kind: 'switch' }]}
        initial={s ? { ...s.panel } : {}} onSubmit={async (v) => { await clinicApi.panels.update(id, { name: v.name.trim(), creditLimit: v.creditLimit ?? 0, isActive: !!v.isActive }); refreshClinic(); void q.refetch(); toast.success(t('Save ho gaya')); }} />
    </Screen>
  );
}
