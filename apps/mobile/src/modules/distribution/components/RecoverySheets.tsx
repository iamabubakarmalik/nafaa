/** Sheets for recoveries: take money from a customer (cash, bank or cheque) and send WhatsApp reminders. */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MessageCircle, SkipForward } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, DatePicker, Input, ListRow, MoneyInput, Select, Sheet, Text, toast, useTheme } from '@/design';
import { DIST_KEY, distError, distributionApi, type MoneyMethod, type RecoveryRow } from '../api/distribution.api';
import { hasWhatsapp, reminderLink } from '../lib/reminder';
import { METHOD_LABEL, METHODS, partyName, rs } from '../lib/meta';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Paisa mila: an office or field collection, optionally by cheque (PDC). */
export function CollectSheet({ open, row, rows, onClose }: { open: boolean; row: RecoveryRow | null; rows: RecoveryRow[]; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<MoneyMethod | 'CHEQUE'>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState<Date>(new Date());
  const [clientRef, setClientRef] = useState('');
  useEffect(() => {
    if (!open) return;
    setCustomerId(row?.customer.id ?? ''); setAmount(null); setMethod('CASH'); setReference(''); setNote(''); setBankName(''); setChequeNo(''); setChequeDate(new Date());
    setClientRef(`${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
  }, [open, row]);
  const cur = rows.find((x) => x.customer.id === customerId) ?? row;

  const save = useMutation({
    mutationFn: () => {
      if (!customerId) throw new Error(t('Customer chunein'));
      if (!(Number(amount) > 0)) throw new Error(t('Amount likhein'));
      const cheque = method === 'CHEQUE';
      if (cheque && (!bankName.trim() || !chequeNo.trim())) throw new Error(t('Cheque ka bank, number aur date likhein'));
      return distributionApi.collect({
        clientRef, customerId, amount: Number(amount), method, reference: cheque ? undefined : reference.trim() || undefined, note: note.trim() || undefined,
        ...(cheque && { bankName: bankName.trim(), chequeNo: chequeNo.trim(), chequeDate: ymd(chequeDate) }),
      });
    },
    onSuccess: (r) => {
      toast.success(r.collection.status === 'VERIFIED' ? t('Paisa khata me jama ho gaya') : t('Recovery save — verify ke baad khata me jayegi'));
      void qc.invalidateQueries({ queryKey: [DIST_KEY] });
      onClose();
    },
    onError: (e) => toast.error(distError(e, t('Save nahi hua'))),
  });

  return (
    <Sheet open={open} onClose={onClose} title={t('Paisa mila')} description={t('Office me ya field se aaya purana udhaar')}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {row ? (
          <View>
            <Text size="md" weight="semibold">{partyName(row.customer)}</Text>
            <Text size="sm" tone="muted">{t('Khata')}: <Text size="sm" ltr>{rs(row.balance)}</Text></Text>
          </View>
        ) : (
          <Select label={t('Customer')} value={customerId} onChange={setCustomerId} placeholder={t('Chunein')} searchable
            options={rows.map((x) => ({ value: x.customer.id, label: `${partyName(x.customer)} — ${rs(x.balance)}` }))} />
        )}
        <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount} hint={cur ? t('Khata baqi: {{rs}}', { rs: rs(cur.balance) }) : undefined} />
        <Select label={t('Tareeqa')} value={method} onChange={(m) => setMethod(m as MoneyMethod | 'CHEQUE')}
          options={[...METHODS.map((m) => ({ value: m, label: t(METHOD_LABEL[m]) })), { value: 'CHEQUE', label: t('Cheque') }]} />
        {method === 'CHEQUE' ? <>
          <Input label={t('Bank')} value={bankName} onChangeText={setBankName} placeholder={t('HBL')} />
          <Input label={t('Cheque no.')} value={chequeNo} onChangeText={setChequeNo} ltr />
          <DatePicker label={t('Cheque ki date')} value={chequeDate} onChange={setChequeDate} hint={t('Aage ki date = post-dated (PDC). Cheque register me nazar aayega.')} />
        </> : method !== 'CASH' && <Input label={t('Reference')} placeholder={t('Transaction ID')} value={reference} onChangeText={setReference} ltr />}
        <Input label={t('Note')} placeholder={t('Zaroori nahi')} value={note} onChangeText={setNote} />
      </View>
    </Sheet>
  );
}

/** Overdue customers with a phone number; WhatsApp opens one customer at a time. */
export function ReminderSheet({ open, rows, shop, onClose }: { open: boolean; rows: RecoveryRow[]; shop: string; onClose: () => void }) {
  const th = useTheme();
  const list = useMemo(() => rows.filter((r) => r.overdue && r.balance > 0 && hasWhatsapp(r.customer.phone)), [rows]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  useEffect(() => { if (open) setSent(new Set()); }, [open]);
  const next = list.find((r) => !sent.has(r.customer.id));
  const send = (r: RecoveryRow) => {
    const url = reminderLink(r.customer, r.balance, r.dueDays, shop);
    if (!url) return;
    void Linking.openURL(url);
    setSent((s) => new Set(s).add(r.customer.id));
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Sab overdue ko WhatsApp')} description={t('{{count}} customers · ek ek kar ke WhatsApp khulega, wahan Send dabayein', { count: list.length })}
      footer={<Button fullWidth size="lg" icon={MessageCircle} disabled={!next} onPress={() => next && send(next)}>{next ? (sent.size ? t('Agla bhejein') : t('Pehla bhejein')) : t('Sab ho gaye')}</Button>}>
      {!list.length ? <Text size="sm" tone="muted">{t('Kisi overdue customer ka phone number nahi — customer me phone likhein.')}</Text> : (
        <View>
          {list.map((r) => {
            const done = sent.has(r.customer.id);
            return (
              <ListRow key={r.customer.id} title={partyName(r.customer)} subtitle={`${rs(r.balance)}${r.dueDays ? t(' · {{dueDays}} din purana', { dueDays: r.dueDays }) : ''}`}
                icon={done ? CheckCircle2 : undefined} iconTone={done ? 'success' : undefined}
                trailing={<Button size="sm" variant={done ? 'ghost' : 'success'} icon={done ? SkipForward : MessageCircle} onPress={() => send(r)}>{done ? t('Dobara') : t('Bhejein')}</Button>} />
            );
          })}
          <Text size="xs" tone="muted" style={{ marginTop: th.space(2) }}>{t('{{size}}/{{count}} bheje', { size: sent.size, count: list.length })}</Text>
        </View>
      )}
    </Sheet>
  );
}
