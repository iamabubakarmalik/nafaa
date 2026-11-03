/** Sheets the trade packs share: take or pay an amount with its method, and ask for a short reason or note. */

import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Button, ChipGroup, Input, MoneyInput, Sheet, Text, useTheme } from '@/design';

export const PAY_METHODS = [
  { value: 'CASH', label: msg('Cash') }, { value: 'JAZZCASH', label: msg('JazzCash') }, { value: 'EASYPAISA', label: msg('EasyPaisa') },
  { value: 'BANK_TRANSFER', label: msg('Bank') }, { value: 'CARD', label: msg('Card') },
];

export interface MoneyAnswer { amount: number; paymentMethod: string; notes?: string }

/** Takes an amount with its method; `max` stops more than what is due. */
export function MoneySheet({ open, title, description, due, max, hint, extra, outgoing, busy, cta, onSubmit, onClose }: {
  open: boolean; title: string; description?: string; due?: number; max?: number; hint?: ReactNode; extra?: ReactNode; outgoing?: boolean; busy?: boolean; cta?: string;
  onSubmit: (v: MoneyAnswer) => void; onClose: () => void;
}) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setAmount(due && due > 0 ? Math.round(due) : null); setMethod('CASH'); setNotes(''); setError(''); } }, [open, due]);
  const submit = () => {
    if (!amount || amount <= 0) { setError(t('Amount likhein')); return; }
    if (max !== undefined && amount > max + 0.01) { setError(t('Zyada se zyada {{max}}', { max: formatMoney(max) })); return; }
    setError('');
    onSubmit({ amount: Math.round(amount * 100) / 100, paymentMethod: method, notes: notes.trim() || undefined });
  };
  const chips = [due && due > 0 ? Math.round(due) : null, 1000, 5000, 10000, 25000].filter((v, i, a): v is number => !!v && a.indexOf(v) === i && (max === undefined || v <= max + 0.01));
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} onPress={submit}>{cta ?? t('Payment lein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Amount (Rs)')} value={amount} onChangeValue={setAmount} size="xl" error={error || undefined} hint={typeof hint === 'string' ? hint : undefined} />
        {hint && typeof hint !== 'string' ? hint : null}
        <ChipGroup wrap value={amount != null ? String(amount) : ''} onChange={(v) => setAmount(Number(v))} options={chips.map((c) => ({ value: String(c), label: c === Math.round(due ?? -1) ? t('Poora {{formatPKR}}', { formatPKR: formatMoney(c) }) : formatMoney(c) }))} />
        {extra}
        <Text size="sm" weight="semibold" tone="secondary">{outgoing ? t('Kaise diya') : t('Kaise mila')}</Text>
        <ChipGroup wrap value={method} onChange={setMethod} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
        <Text size="xs" tone="muted">{method === 'CASH' ? (outgoing ? t('Drawer ke cash se kat-ta hai') : t('Cash khule drawer me jata hai')) : outgoing ? t('Is account se jata hai; drawer ka cash nahi badalta') : t('Is account me jata hai; drawer ka cash nahi badalta')}</Text>
        <Input label={t('Note (marzi)')} value={notes} onChangeText={setNotes} />
      </View>
    </Sheet>
  );
}

/** One short text (a reason or a note) before an action that cannot be undone from the screen. */
export function ReasonSheet({ open, title, message, label, placeholder, cta, danger, required = true, busy, onSubmit, onClose }: {
  open: boolean; title: string; message?: ReactNode; label: string; placeholder?: string; cta: string; danger?: boolean; required?: boolean; busy?: boolean;
  onSubmit: (text: string) => void; onClose: () => void;
}) {
  const th = useTheme();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setText(''); setError(''); } }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={title}
      footer={<Button fullWidth size="lg" variant={danger ? 'danger' : 'primary'} loading={busy} onPress={() => { if (required && !text.trim()) { setError(label); return; } onSubmit(text.trim()); }}>{cta}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {message ? (typeof message === 'string' ? <Text size="sm">{message}</Text> : message) : null}
        <Input label={label} value={text} onChangeText={setText} placeholder={placeholder} error={error || undefined} />
      </View>
    </Sheet>
  );
}
