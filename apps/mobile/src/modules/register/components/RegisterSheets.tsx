/**
 * Register sheets: open with the opening cash, cash in / out with a reason,
 * close with the count. Counting by notes adds them up; the count is saved
 * with the shift. All three work offline through the outbox.
 */

import { Calculator, Check, Lock, PlayCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { enqueueCashMove, enqueueRegisterClose, enqueueRegisterOpen, OfflineRuleError } from '@/core/offline';
import { Amount, Button, Chip, Input, MoneyInput, Row, Segmented, Sheet, Text, toast, useTheme } from '@/design';
import { cleanDenoms, COINS, diffKind, NOTES, REASONS, sumDenoms } from '../lib/register';

function DenominationCounter({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(1.5) }}>
      {[...NOTES, ...COINS].map((n) => {
        const count = Number(value[n] || 0);
        return (
          <Row key={n} gap={2}>
            <Text weight="semibold" ltr style={{ width: 72 }}>{`Rs ${n.toLocaleString('en-US')}`}</Text>
            <Text tone="muted">×</Text>
            <Input
              value={value[n] ?? ''}
              onChangeText={(v) => onChange({ ...value, [n]: v.replace(/\D/g, '').slice(0, 5) })}
              keyboardType="number-pad"
              placeholder="0"
              ltr
              size="sm"
              containerStyle={{ flex: 1 }}
              accessibilityLabel={t('Count of Rs {{n}}', { n })}
            />
            <Amount value={n * count} size="sm" weight="semibold" style={{ width: 96, textAlign: 'right' }} />
          </Row>
        );
      })}
    </View>
  );
}

function CountInput({ amount, setAmount, denoms, setDenoms, by, setBy, label }: {
  amount: number | null; setAmount: (v: number | null) => void; denoms: Record<string, string>; setDenoms: (v: Record<string, string>) => void;
  by: 'total' | 'notes'; setBy: (v: 'total' | 'notes') => void; label: string;
}) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={by} onChange={setBy} options={[{ value: 'total', label: t('One total') }, { value: 'notes', label: t('Count notes') }]} />
      {by === 'total' ? <MoneyInput label={label} value={amount} onChangeValue={setAmount} autoFocus />
        : (
          <>
            <DenominationCounter value={denoms} onChange={setDenoms} />
            <Row justify="between" style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
              <Text weight="semibold">{t('Total')}</Text>
              <Amount value={sumDenoms(denoms)} size="xl" weight="bold" />
            </Row>
          </>
        )}
    </View>
  );
}

const errorText = (e: unknown) => (e instanceof OfflineRuleError ? e.message : t('Not saved. Try again.'));

export function OpenSheet({ open, shopId, onClose, onDone }: { open: boolean; shopId: string; onClose: () => void; onDone: () => void }) {
  const [by, setBy] = useState<'total' | 'notes'>('total');
  const [amount, setAmount] = useState<number | null>(null);
  const [denoms, setDenoms] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setAmount(null); setDenoms({}); setNotes(''); setBy('total'); } }, [open]);
  const total = by === 'notes' ? sumDenoms(denoms) : amount ?? 0;
  const save = async () => {
    setBusy(true);
    try {
      await enqueueRegisterOpen({ shopId, openingBalance: total, notes: notes.trim() || undefined, denominations: by === 'notes' ? cleanDenoms(denoms) : undefined });
      toast.success(t('Register opened'));
      onDone();
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Open register')} description={t('Count the cash in the drawer before the first sale.')}
      footer={<Button size="lg" fullWidth icon={PlayCircle} loading={busy} onPress={() => void save()}>{t('Open with {{amount}}', { amount: formatMoney(total) })}</Button>}>
      <View style={{ gap: 12 }}>
        <CountInput amount={amount} setAmount={setAmount} denoms={denoms} setDenoms={setDenoms} by={by} setBy={setBy} label={t('Opening cash')} />
        <Input label={t('Note')} value={notes} onChangeText={setNotes} placeholder={t('Optional')} />
      </View>
    </Sheet>
  );
}

export function CashMoveSheet({ type, shopId, onClose, onDone }: { type: 'CASH_IN' | 'CASH_OUT' | null; shopId: string; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(type);
  useEffect(() => { if (type) { setLast(type); setAmount(null); setReason(''); setNote(''); } }, [type]);
  const kind = type ?? last ?? 'CASH_IN';
  const reasons = REASONS[kind];
  const save = async () => {
    if (!(amount && amount > 0)) { toast.error(t('Enter an amount')); return; }
    if (!reason.trim()) { toast.error(t('Pick or write a reason')); return; }
    setBusy(true);
    try {
      await enqueueCashMove({ shopId, type: kind, amount, reason: reason.trim(), note: note.trim() || undefined });
      toast.success(kind === 'CASH_IN' ? t('Cash put in') : t('Cash taken out'));
      onDone();
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!type} onClose={onClose} title={kind === 'CASH_IN' ? t('Cash in') : t('Cash out')}
      footer={<Button size="lg" fullWidth icon={Check} loading={busy} variant={kind === 'CASH_OUT' ? 'danger' : 'primary'} onPress={() => void save()}>{amount ? `${kind === 'CASH_IN' ? '+' : '−'} ${formatMoney(amount)}` : t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount} autoFocus />
        <Text size="xs" weight="semibold" tone="muted">{t('Reason')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {reasons.map((r) => <Chip key={r} label={t(r)} selected={reason === r} onPress={() => setReason(reason === r ? '' : r)} />)}
        </View>
        <Input value={reasons.includes(reason) ? '' : reason} onChangeText={setReason} placeholder={t('Or write the reason')} />
        <Input label={t('Note')} value={note} onChangeText={setNote} placeholder={t('Optional')} />
      </View>
    </Sheet>
  );
}

export function CloseSheet({ open, shopId, expected, exact, onClose, onDone }: { open: boolean; shopId: string; expected: number; exact: boolean; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [by, setBy] = useState<'total' | 'notes'>('notes');
  const [amount, setAmount] = useState<number | null>(null);
  const [denoms, setDenoms] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setAmount(null); setDenoms({}); setNotes(''); setBy('notes'); } }, [open]);
  const counted = by === 'notes' ? sumDenoms(denoms) : amount ?? 0;
  const diff = counted - expected;
  const kind = diffKind(diff);
  const tone = kind === 'match' ? th.colors.success : kind === 'short' ? th.colors.danger : th.colors.info;
  const save = async () => {
    setBusy(true);
    try {
      await enqueueRegisterClose({ shopId, closingBalance: counted, notes: notes.trim() || undefined, denominations: by === 'notes' ? cleanDenoms(denoms) : undefined });
      toast.success(t('Register closed'));
      onDone();
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Close register')} description={t('Count the cash in the drawer.')}
      footer={<Button size="lg" fullWidth icon={Lock} variant="danger" loading={busy} onPress={() => void save()}>{t('Close with {{amount}}', { amount: formatMoney(counted) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <CountInput amount={amount} setAmount={setAmount} denoms={denoms} setDenoms={setDenoms} by={by} setBy={setBy} label={t('Cash counted')} />
        <View style={{ borderRadius: th.radius('lg'), overflow: 'hidden', borderWidth: 1, borderColor: th.colors.border }}>
          <Row justify="between" style={{ padding: th.space(3) }}><Text tone="secondary">{t('Should be')}</Text><Amount value={expected} weight="semibold" /></Row>
          <Row justify="between" style={{ padding: th.space(3), backgroundColor: tone.soft }}>
            <Row gap={1.5}><Calculator size={16} color={tone.text} /><Text weight="semibold" color={tone.text}>{kind === 'match' ? t('Matched') : kind === 'short' ? t('Short') : t('Over')}</Text></Row>
            <Amount value={diff} signed size="xl" weight="bold" color={tone.text} />
          </Row>
        </View>
        {!exact && <Text size="xs" tone="muted">{t('Without internet the expected cash leaves out this phone\'s sales; the server works out the real difference when the close is sent.')}</Text>}
        <Input label={t('Note')} value={notes} onChangeText={setNotes} placeholder={t('Optional')} />
      </View>
    </Sheet>
  );
}
