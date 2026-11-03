/**
 * Old-balance money taken on the trip (cash, wallet, bank or cheque). Saved
 * on the phone against the load sheet and synced as a pending recovery; the
 * office counts it at settlement and verifies it into the khata.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { Check, HandCoins } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { businessDayKey } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, Chip, DatePicker, EmptyState, Input, ListRow, MoneyInput, PressableScale, Row, Screen, SectionHeader, StatusPill, Text, toast, useTheme } from '@/design';
import { currentGps, newClientRef } from '../../booker/native/device';
import { listSheets, queueRecovery, sheetRecoveries } from '../core/repo';
import type { FieldMethod, RecoveryPayload } from '../core/types';
import { useDeliveryQuery, useDeliveryStore } from '../store';
import { FIELD_METHODS } from './parts';

export function RecoveryScreen() {
  const th = useTheme();
  const { sheetId } = useLocalSearchParams<{ sheetId?: string }>();
  const { db, me, bump, sync } = useDeliveryStore();
  const { data } = useDeliveryQuery(async (d) => {
    const sheets = await listSheets(d);
    const sheet = sheets.find((s) => s.id === sheetId) ?? sheets[0] ?? null;
    return { sheet, done: sheet ? await sheetRecoveries(d, sheet) : [] };
  }, [sheetId]);
  const sheet = data?.sheet ?? null;
  const customers = useMemo(() => {
    const m = new Map<string, { id: string; name: string; sub: string; balance?: number }>();
    sheet?.invoices.forEach((i) => { if (i.customer) m.set(i.customer.id, { id: i.customer.id, name: i.customer.businessName || i.customer.name, sub: i.customer.area ?? '', balance: i.customer.balance }); });
    return [...m.values()];
  }, [sheet]);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<FieldMethod>('CASH');
  const [reference, setReference] = useState('');
  const [bank, setBank] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState<Date>(new Date());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const cheque = method === 'CHEQUE';
  const ok = !!customerId && (amount ?? 0) >= 0.01 && (!cheque || (!!bank.trim() && !!chequeNo.trim()));
  const back = () => (router.canGoBack() ? router.back() : router.replace('/delivery'));

  const save = async () => {
    if (!db || !sheet || !customerId || !ok || amount == null) return;
    setSaving(true);
    try {
      const gps = await currentGps(4000);
      const p: RecoveryPayload = { clientRef: newClientRef(), loadSheetId: sheet.id, customerId, amount: Math.round(amount * 100) / 100, method, collectedAt: new Date().toISOString() };
      if (cheque) { p.bankName = bank.trim().slice(0, 80); p.chequeNo = chequeNo.trim().slice(0, 40); p.chequeDate = businessDayKey(chequeDate); }
      else if (reference.trim()) p.reference = reference.trim().slice(0, 80);
      if (note.trim()) p.note = note.trim().slice(0, 300);
      if (gps.ok) { p.latitude = gps.gps.latitude; p.longitude = gps.gps.longitude; }
      await queueRecovery(db, p);
      toast.success(t('Recovery save ho gayi'), { message: t('Office check karega') });
      bump();
      sync({ quiet: true });
      back();
    } finally {
      setSaving(false);
    }
  };

  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? t('Customer');

  return (
    <Screen
      title={t('Recovery likhein')}
      subtitle={sheet ? `${sheet.number} · ${t('purane udhaar ka paisa')}` : undefined}
      onBack={back}
      keyboard
      narrow
      footer={me?.canCollect ? <Button size="xl" fullWidth disabled={!ok} loading={saving} onPress={save}>{ok && amount != null ? t('{{amount}} save karein', { amount: `Rs ${Math.round(amount).toLocaleString('en-US')}` }) : t('Save')}</Button> : undefined}
    >
      {!me?.canCollect ? (
        <EmptyState icon={HandCoins} title={t('Recovery likhne ki permission nahi')} message={t('Malik se "Recovery / cash collect" ki permission lein.')} />
      ) : (
        <>
          <SectionHeader title={t('Kis dukaan se?')} />
          <View style={{ gap: th.space(2) }}>
            {customers.map((c) => {
              const on = customerId === c.id;
              return (
                <PressableScale key={c.id} onPress={() => setCustomerId(c.id)} haptic="select" accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={{ minHeight: 56, borderRadius: th.radius('lg'), borderWidth: 1.5, borderColor: on ? th.colors.brand.solid : th.colors.border, backgroundColor: on ? th.colors.brand.soft : th.colors.surface, paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold" numberOfLines={1}>{c.name}</Text>
                    {!!c.sub && <Text size="xs" tone="muted" numberOfLines={1}>{c.sub}</Text>}
                  </View>
                  {c.balance != null && <Amount value={c.balance} size="sm" tone={c.balance > 0 ? 'danger' : 'muted'} />}
                  {on && <Check size={18} color={th.colors.brand.text} />}
                </PressableScale>
              );
            })}
          </View>

          <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {FIELD_METHODS.map((m) => <Chip key={m.value} label={t(m.label)} selected={method === m.value} onPress={() => setMethod(m.value)} />)}
          </View>
          {cheque ? (
            <View style={{ gap: th.space(3) }}>
              <Input label={t('Bank')} value={bank} onChangeText={setBank} maxLength={80} />
              <Input label={t('Cheque number')} value={chequeNo} onChangeText={setChequeNo} maxLength={40} ltr />
              <DatePicker label={t('Cheque ki date')} value={chequeDate} onChange={setChequeDate} hint={businessDayKey(chequeDate) > businessDayKey(new Date()) ? t('Aage ki date: post-dated cheque') : undefined} />
            </View>
          ) : method !== 'CASH' ? <Input label={t('Reference / TID')} value={reference} onChangeText={setReference} maxLength={80} ltr /> : null}
          <Input label={t('Note')} value={note} onChangeText={setNote} maxLength={300} />
          <Text size="xs" tone="muted">{cheque ? t('Cheque gaari ke cash me nahi ginta. Office deposit karega aur verify karne par khata me jama hoga.') : t('Ye paisa gaari ke cash me ginta hai. Office check karega, phir khata me jama hoga.')}</Text>

          {!!data?.done.length && (
            <Card title={t('Is trip ki recovery')} flush>
              {data.done.map((r, i) => (
                <ListRow key={r.key} icon={HandCoins} title={nameOf(r.customerId)} subtitle={r.method === 'CHEQUE' ? t('Cheque') : undefined} divider={i < data.done.length - 1}
                  trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Amount value={r.amount} size="sm" />{r.state === 'sent' ? <StatusPill tone="success">{t('Office pohanch gayi')}</StatusPill> : r.state === 'issue' ? <StatusPill tone="danger">{t('Nahi gayi')}</StatusPill> : <StatusPill tone="warning">{t('Sync hona hai')}</StatusPill>}</View>} />
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
