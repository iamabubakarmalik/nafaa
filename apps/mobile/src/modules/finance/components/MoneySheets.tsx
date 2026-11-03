/** Money movements (cash in/out of the drawer, transfers, deposits, withdrawals, adjustments) and the account form. Needs internet. */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '@/core/api/errors';
import { useOnlineStatus } from '@/core/net';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Field, Input, MoneyInput, Select, Segmented, Sheet, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { moneyApi, type MoneyAccountKind, type MoneyAccountRow } from '../api/money';
import { FIN } from '../lib/meta';

const rid = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type MoveMode = 'cashIn' | 'cashOut' | 'toAccount' | 'fromAccount' | 'transfer' | 'deposit' | 'withdraw' | 'adjust';
const TITLE: Record<MoveMode, string> = {
  cashIn: 'Galle me cash daalein', cashOut: 'Galle se cash nikalein', toAccount: 'Galle se account me', fromAccount: 'Account se galle me',
  transfer: 'Account se account', deposit: 'Account me jama', withdraw: 'Account se nikalein', adjust: 'Balance theek karein',
};

export function MoveSheet({ mode, accounts, account, onClose }: { mode: MoveMode | null; accounts: MoneyAccountRow[]; account?: MoneyAccountRow | null; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [key, setKey] = useState(rid());
  const [negative, setNegative] = useState(false);

  useEffect(() => {
    if (!mode) return;
    setAmount(null); setReason(''); setNote(''); setKey(rid()); setNegative(false);
    setFrom(mode === 'transfer' ? account?.id ?? '' : ''); setTo(mode === 'toAccount' || mode === 'fromAccount' || mode === 'deposit' || mode === 'withdraw' || mode === 'adjust' ? account?.id ?? '' : '');
  }, [mode, account]);

  const needsAccount = mode === 'toAccount' || mode === 'fromAccount' || mode === 'deposit' || mode === 'withdraw' || mode === 'adjust';
  const problem = !online ? t('Yeh kaam internet par hota hai') : !(amount && amount > 0) ? t('Amount likhein') : !reason.trim() ? t('Wajah likhein')
    : needsAccount && !to ? t('Account chunein') : mode === 'transfer' && (!from || !to || from === to) ? t('Do alag accounts chunein') : null;

  const save = useMutation({
    mutationFn: async () => {
      const base = { amount: amount!, reason: reason.trim(), note: note.trim() || undefined, requestId: key };
      switch (mode) {
        case 'cashIn': case 'cashOut': return moneyApi.drawerMove({ type: mode === 'cashIn' ? 'CASH_IN' : 'CASH_OUT', amount: amount!, reason: base.reason, note: base.note, requestId: key });
        case 'toAccount': return moneyApi.drawerToAccount({ ...base, accountId: to });
        case 'fromAccount': return moneyApi.accountToDrawer({ ...base, accountId: to });
        case 'transfer': return moneyApi.transfer({ ...base, fromAccountId: from, toAccountId: to });
        case 'deposit': return moneyApi.entry({ ...base, accountId: to, type: 'DEPOSIT' });
        case 'withdraw': return moneyApi.entry({ ...base, accountId: to, type: 'WITHDRAW', allowNegative: negative });
        default: return moneyApi.entry({ ...base, accountId: to, type: 'ADJUSTMENT', amount: amount! });
      }
    },
    onSuccess: () => { toast.success(t('{{amount}} — ho gaya', { amount: formatMoney(amount) })); void qc.invalidateQueries({ queryKey: [FIN] }); void qc.invalidateQueries({ queryKey: ['report'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] }); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const opts = accounts.filter((a) => a.isActive).map((a) => ({ value: a.id, label: `${a.name} · ${formatMoney(a.balance)}` }));
  return (
    <Sheet open={!!mode} onClose={onClose} title={mode ? t(TITLE[mode]) : undefined} footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(4) }}>
        {mode === 'transfer' && <Select label={t('Kahan se')} value={from || null} onChange={setFrom} options={opts} />}
        {(needsAccount || mode === 'transfer') && <Select label={mode === 'transfer' ? t('Kahan par') : t('Account')} value={to || null} onChange={setTo} options={opts} />}
        <MoneyInput label={t('Amount (Rs)')} value={amount} onChangeValue={setAmount} size="xl" />
        <Input label={t('Wajah')} value={reason} onChangeText={setReason} maxLength={80} placeholder={t('Maslan: bank me jama, chai ka kharcha')} />
        <TextArea label={t('Details')} value={note} onChangeText={setNote} maxLength={300} />
        {mode === 'withdraw' && <Switch value={negative} onChange={setNegative} label={t('Balance se zyada nikalne dein')} />}
        {problem && (amount || reason) ? <Text size="sm" tone="warning">{problem}</Text> : null}
      </View>
    </Sheet>
  );
}

const KINDS: Array<{ value: MoneyAccountKind; label: string }> = [{ value: 'CASH', label: 'Tijori / safe' }, { value: 'BANK', label: 'Bank' }, { value: 'WALLET', label: 'Wallet' }];

export function AccountSheet({ open, account, onClose }: { open: boolean; account: MoneyAccountRow | null; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<MoneyAccountKind>('BANK');
  const [method, setMethod] = useState<'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA' | 'CARD'>('BANK_TRANSFER');
  const [bank, setBank] = useState('');
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [iban, setIban] = useState('');
  const [opening, setOpening] = useState<number | null>(null);
  const [isDefault, setDefault] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? ''); setKind(account?.kind ?? 'BANK'); setMethod((account?.method as typeof method) ?? 'BANK_TRANSFER'); setBank(account?.bankName ?? ''); setTitle(account?.accountTitle ?? '');
    setNumber(account?.accountNumber ?? ''); setIban(account?.iban ?? ''); setOpening(account ? account.openingBalance : null); setDefault(!!account?.isDefault);
  }, [open, account]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), kind, method: kind === 'CASH' ? null : method, bankName: bank || undefined, accountTitle: title || undefined, accountNumber: number || undefined, iban: iban || undefined, openingBalance: opening ?? 0, isDefault };
      return account ? moneyApi.updateAccount(account.id, body) : moneyApi.createAccount(body);
    },
    onSuccess: () => { toast.success(t('Account save ho gaya')); void qc.invalidateQueries({ queryKey: [FIN] }); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const wallet = kind === 'WALLET';
  return (
    <Sheet open={open} onClose={onClose} height={0.9} title={account ? t('Account badlein') : t('Naya account')} footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!name.trim() || !online} onPress={() => save.mutate()}>{online ? t('Save') : t('Yeh kaam internet par hota hai')}</Button>}>
      <View style={{ gap: th.space(4) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} maxLength={60} placeholder={t('Maslan: Meezan Bank')} />
        <Field label={t('Kism')}><Segmented value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k.value, label: t(k.label) }))} /></Field>
        {kind !== 'CASH' && (
          <Select label={t('Is par kaunsi payment aati hai')} value={method} onChange={(v) => setMethod(v as typeof method)}
            options={[{ value: 'BANK_TRANSFER', label: t('Bank') }, { value: 'JAZZCASH', label: t('JazzCash') }, { value: 'EASYPAISA', label: t('Easypaisa') }, { value: 'CARD', label: t('Card') }]} />
        )}
        {kind === 'BANK' && <><Input label={t('Bank')} value={bank} onChangeText={setBank} /><Input label={t('Account title')} value={title} onChangeText={setTitle} /><Input label={t('Account number')} value={number} onChangeText={setNumber} ltr /><Input label="IBAN" value={iban} onChangeText={setIban} ltr autoCapitalize="characters" /></>}
        {wallet && <Input label={t('Wallet number')} value={number} onChangeText={setNumber} ltr keyboardType="phone-pad" />}
        <MoneyInput label={t('Shuru ka balance')} value={opening} onChangeValue={setOpening} />
        <Switch value={isDefault} onChange={setDefault} label={t('Aam account')} />
      </View>
    </Sheet>
  );
}
