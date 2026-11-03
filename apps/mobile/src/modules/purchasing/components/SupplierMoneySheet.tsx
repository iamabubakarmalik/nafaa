/**
 * One sheet for every change to a supplier's khata, like the web dialog:
 * pay them, credit taken without a bill, money for returned goods, a
 * correction, or the balance from before the khata started. Needs internet.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Button, Card, ChipGroup, DatePicker, Input, MoneyInput, Row, Sheet, Text, toast, useTheme } from '@/design';
import { PUR, useOnline } from '@/modules/inventory/lib/shared';
import { supplierLedgerApi, type SupplierPaymentMethod } from '../api/suppliers';
import { todayPk } from '../lib/meta';

export type MoneyKind = 'payment' | 'due' | 'return' | 'adjust' | 'opening';

const KINDS: Array<{ value: MoneyKind; label: string; hint: string }> = [
  { value: 'payment', label: msg('Paisa diya'), hint: msg('Supplier ko payment — dena kam hoga') },
  { value: 'due', label: msg('Udhaar liya'), hint: msg('Bagair bill ke maal liya — dena barhega') },
  { value: 'return', label: msg('Maal wapas'), hint: msg('Wapas kiye maal ki amount — dena kam hoga') },
  { value: 'adjust', label: msg('Correction'), hint: msg('+ dena barhe, − dena kam ho') },
  { value: 'opening', label: msg('Purana hisaab'), hint: msg('Khata shuru hone se pehle ka baqi (sirf ek dafa)') },
];
const METHODS: Array<{ value: SupplierPaymentMethod; label: string }> = [
  { value: 'CASH', label: msg('Cash') }, { value: 'BANK_TRANSFER', label: msg('Bank') }, { value: 'JAZZCASH', label: msg('JazzCash') },
  { value: 'EASYPAISA', label: msg('EasyPaisa') }, { value: 'CARD', label: msg('Card') },
];

const toDate = (s: string) => new Date(`${s}T12:00:00`);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function SupplierMoneySheet({ supplier, initial = 'payment', open, onClose }: {
  supplier: { id: string; name: string; outstandingDue: number } | null;
  initial?: MoneyKind;
  open: boolean;
  onClose: () => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useOnline();
  const [kind, setKind] = useState<MoneyKind>(initial);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<SupplierPaymentMethod>('CASH');
  const [date, setDate] = useState(todayPk());
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const due = supplier?.outstandingDue ?? 0;

  useEffect(() => {
    if (!open) return;
    setKind(initial);
    setAmount(initial === 'payment' && due > 0 ? String(Math.round(due)) : '');
    setMethod('CASH'); setDate(todayPk()); setReference(''); setNote('');
  }, [open, initial, supplier?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = Number(amount) || 0;
  const delta = kind === 'payment' || kind === 'return' ? -Math.abs(n) : kind === 'adjust' ? n : Math.abs(n);
  const after = kind === 'opening' ? null : due + delta;
  const valid = kind === 'adjust' ? n !== 0 && !!note.trim() : n > 0 && (kind !== 'payment' || n <= due + 0.01);

  const mut = useMutation({
    mutationFn: () => {
      const id = supplier!.id;
      const base = { amount: kind === 'adjust' ? n : Math.abs(n), entryDate: date, note: note.trim() || undefined };
      switch (kind) {
        case 'payment': return supplierLedgerApi.recordPayment(id, { ...base, paymentMethod: method, reference: reference.trim() || undefined });
        case 'due': return supplierLedgerApi.addDue(id, { ...base, reference: reference.trim() || undefined });
        case 'return': return supplierLedgerApi.recordReturn(id, { ...base, reference: reference.trim() || undefined });
        case 'adjust': return supplierLedgerApi.adjust(id, { amount: n, entryDate: date, note: note.trim() });
        default: return supplierLedgerApi.setOpeningBalance(id, base);
      }
    },
    onSuccess: () => {
      toast.success(t('Khata me darj ho gaya'));
      void qc.invalidateQueries({ queryKey: [PUR] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  if (!supplier) return null;
  return (
    <Sheet open={open} onClose={onClose} title={supplier.name} description={t('Abhi dena hai: {{outstandingDue}}', { outstandingDue: formatPKR(due) })}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1 }} loading={mut.isPending} disabled={!valid || !online} onPress={() => mut.mutate()}>{t('Darj karein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        {!online && <Card tone="info"><Text size="sm">{t('Supplier ke khate me entry ke liye internet chahiye.')}</Text></Card>}
        <ChipGroup wrap value={kind} onChange={(k) => setKind(k as MoneyKind)} options={KINDS.map((k) => ({ value: k.value, label: t(k.label) }))} />
        <Text size="sm" tone="muted">{t(KINDS.find((k) => k.value === kind)!.hint)}</Text>
        {kind === 'adjust' ? (
          <Input label={t('Amount')} value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.-]/g, ''))} keyboardType="numbers-and-punctuation" placeholder={t('+500 ya −500')} size="lg" ltr />
        ) : (
          <MoneyInput label={t('Amount')} value={amount ? Number(amount) : null} onChangeValue={(v) => setAmount(v == null ? '' : String(v))} size="lg" />
        )}
        <DatePicker label={t('Date')} value={toDate(date)} onChange={(d) => setDate(ymd(d))} />
        {kind === 'payment' && (
          <>
            <ChipGroup wrap value={method} onChange={(m) => setMethod(m as SupplierPaymentMethod)} options={METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
            {due > 0 && <Button size="sm" variant="ghost" onPress={() => setAmount(String(Math.round(due)))}>{t('Poora baqi')}</Button>}
          </>
        )}
        {kind !== 'adjust' && kind !== 'opening' && (
          <Input value={reference} onChangeText={setReference} maxLength={80}
            placeholder={kind === 'payment' ? t('Cheque # ya JazzCash / bank transaction ID (ikhtiyari)') : t('Supplier ki parchi ka # (ikhtiyari)')} />
        )}
        <Input value={note} onChangeText={setNote} maxLength={200}
          placeholder={kind === 'adjust' ? t('Wajah zaroori — misaal: hisaab milate waqt 500 ka farq') : t('Note — misaal: Ali bhai ke haath diye')} />
        {after != null && n !== 0 && (
          <Card tone={after > 0 ? 'warning' : 'success'}>
            <Text size="sm">{t('Is ke baad dena:')} <Text size="sm" weight="bold" ltr>{formatPKR(Math.max(after, 0))}</Text>{after < 0 ? t(' (supplier ke paas {{formatPKR}} advance)', { formatPKR: formatPKR(-after) }) : ''}</Text>
          </Card>
        )}
        {kind === 'payment' && n > due + 0.01 && <Text size="sm" tone="danger">{t('Baqi se zyada payment darj nahi hoti')}</Text>}
      </View>
    </Sheet>
  );
}
