/**
 * Bottom sheets of the booker screens: no-order reason, recovery (old balance
 * money, kept PENDING until the office verifies it) and the shop picker for
 * market returns.
 */

import { Check, MapPin, Store } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { businessDayKey, formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Amount, Button, ChipGroup, DatePicker, EmptyState, Icon, Input, ListRow, MoneyInput, SearchBar, Sheet, Text, TextArea, useDebouncedValue, useTheme } from '@/design';
import { routeCustomers, type RouteCustomer } from '../core/repo';
import type { MoneyMethod } from '../core/types';
import { useBookerStore, useDbQuery } from '../store';

export function NoOrderSheet({ open, reasons, onClose, onSave, saving }: {
  open: boolean;
  reasons: { code: string; label: string }[];
  onClose: () => void;
  onSave: (code: string, note: string) => void;
  saving?: boolean;
}) {
  const th = useTheme();
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState('');
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('No order')}
      description={t('Order nahi mila — wajah')}
      footer={<Button size="xl" fullWidth disabled={!code} loading={saving} onPress={() => code && onSave(code, note)}>{t('Save')}</Button>}
    >
      <View style={{ gap: th.space(2) }}>
        {reasons.map((r) => (
          <ListRow
            key={r.code}
            title={t(r.label)}
            selected={code === r.code}
            trailing={code === r.code ? <Icon icon={Check} tone="brand" /> : undefined}
            onPress={() => setCode(r.code)}
          />
        ))}
        <TextArea label={t('Note')} labelHint={t('(optional)')} value={note} onChangeText={setNote} maxLength={300} numberOfLines={2} />
      </View>
    </Sheet>
  );
}

const METHODS: { value: MoneyMethod; label: string }[] = [
  { value: 'CASH', label: msg('Cash') },
  { value: 'BANK_TRANSFER', label: msg('Bank') },
  { value: 'JAZZCASH', label: msg('JazzCash') },
  { value: 'EASYPAISA', label: msg('Easypaisa') },
  { value: 'CHEQUE', label: msg('Cheque') },
];

export interface RecoveryValue {
  amount: number; method: MoneyMethod; reference: string; note: string;
  cheque?: { bankName: string; chequeNo: string; chequeDate: string };
}

export function RecoverySheet({ open, balance, onClose, onSave, saving }: {
  open: boolean;
  balance: number | null;
  onClose: () => void;
  onSave: (v: RecoveryValue) => void;
  saving?: boolean;
}) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<MoneyMethod>('CASH');
  const [bankName, setBankName] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState<Date>(new Date());
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const chequeOk = method !== 'CHEQUE' || (!!bankName.trim() && !!chequeNo.trim());
  const ok = !!amount && amount >= 0.01 && chequeOk;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('Recovery')}
      description={balance != null ? t('Khata balance: {{value}}', { value: formatMoney(balance) }) : undefined}
      footer={
        <Button size="xl" fullWidth disabled={!ok} loading={saving} onPress={() => ok && onSave({
          amount: Math.round((amount ?? 0) * 100) / 100, method, reference, note,
          ...(method === 'CHEQUE' && { cheque: { bankName: bankName.trim(), chequeNo: chequeNo.trim(), chequeDate: businessDayKey(chequeDate) } }),
        })}>
          {ok ? `${t('Save')} ${formatMoney(amount)}` : t('Save')}
        </Button>
      }
    >
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount} size="lg" />
        <ChipGroup wrap options={METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} value={method} onChange={setMethod} />
        {method === 'CHEQUE' && (
          <>
            <Input label={t('Bank')} value={bankName} onChangeText={setBankName} maxLength={80} placeholder="HBL, MCB…" />
            <Input label={t('Cheque number')} value={chequeNo} onChangeText={setChequeNo} maxLength={40} ltr />
            <DatePicker label={t('Cheque date')} value={chequeDate} onChange={setChequeDate} hint={t('Aage ki date = post-dated cheque. Bounce hua to khata me wapas lag jayega.')} />
          </>
        )}
        {method !== 'CASH' && method !== 'CHEQUE' && <Input label={t('Reference')} value={reference} onChangeText={setReference} maxLength={80} ltr />}
        <Input label={t('Note')} value={note} onChangeText={setNote} maxLength={300} />
        <Text size="xs" tone="muted">{t('Office check karega, phir ye amount khata me jama hoga.')}</Text>
      </View>
    </Sheet>
  );
}

/** Pick a shop from the phone's customers (all routes). */
export function ShopPickerSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const today = useBookerStore((s) => s.today);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 200);
  const { data: rows = [] } = useDbQuery((db) => routeCustomers(db, { dayKey: today, routeIds: null, search: q }), [today, q]);
  return (
    <Sheet open={open} onClose={onClose} title={t('Dukaan chunein')} height={0.85} scrollable={false}>
      <View style={{ flex: 1, gap: 12 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Dukaan, naam ya phone')} />
        <View style={{ flex: 1 }}>
          {rows.length === 0 ? (
            <EmptyState compact icon={Store} title={t('Koi dukaan nahi mili')} />
          ) : (
            <FlatListLite rows={rows.slice(0, 60)} onPick={onPick} />
          )}
        </View>
      </View>
    </Sheet>
  );
}


function FlatListLite({ rows, onPick }: { rows: RouteCustomer[]; onPick: (id: string) => void }) {
  return (
    <FlatList
      data={rows}
      keyExtractor={(c) => c.id}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <ListRow
          icon={MapPin}
          title={item.businessName || item.name}
          subtitle={[item.businessName ? item.name : null, item.area].filter(Boolean).join(' · ') || undefined}
          trailing={item.balance != null && item.balance > 0 ? <Amount value={item.balance} size="sm" tone="danger" /> : undefined}
          onPress={() => onPick(item.id)}
          divider
        />
      )}
    />
  );
}
