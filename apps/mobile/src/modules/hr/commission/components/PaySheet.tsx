/** Writes a commission payment for one person and month (a record only; the drawer cash is not touched). */

import { useState } from 'react';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, DetailRow, Input, MoneyInput, Sheet, Text, confirm } from '@/design';
import type { CommissionRow } from '../api/commission';
import { periodLabel, signed } from '../lib/meta';

export function PaySheet({ row, period, saving, onClose, onPay }: {
  row: CommissionRow | null; period: string; saving: boolean; onClose: () => void; onPay: (a: { amount: number; expectedPaid: number; note?: string }) => void;
}) {
  return (
    <Sheet open={!!row} onClose={onClose} title={row ? t('{{name}} ko commission', { name: row.name }) : undefined} description={periodLabel(period)}>
      {row && <Body key={row.userId} row={row} saving={saving} onPay={onPay} />}
    </Sheet>
  );
}

function Body({ row, saving, onPay }: { row: CommissionRow; saving: boolean; onPay: (a: { amount: number; expectedPaid: number; note?: string }) => void }) {
  const paid = row.paidAmount ?? 0;
  const [now, setNow] = useState<number | null>(row.due > 0 ? row.due : null);
  const [note, setNote] = useState('');
  const amount = now ?? 0;
  const after = paid + amount;

  const submit = async () => {
    if (!(amount > 0)) return;
    if (after > row.earned + 0.5 && !(await confirm({
      title: t('Banti se zyada amount?'), tone: 'danger', confirmLabel: t('Phir bhi likhein'),
      message: t('Banti {{earned}} hai, aap kul {{after}} likh rahe hain. Zyada amount advance ki tarah likhi jayegi.', { earned: signed(row.earned), after: formatPKR(after) }),
    }))) return;
    onPay({ amount: Math.round(after * 100) / 100, expectedPaid: paid, note: note.trim() || undefined });
  };

  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <Card>
        <DetailRow label={t('Banti hai')} value={<Text weight="bold" ltr>{signed(row.earned)}</Text>} />
        <DetailRow label={t('Pehle diye')} value={<Text weight="bold" ltr>{formatPKR(paid)}</Text>} />
        <DetailRow label={t('Baqi')} value={<Text weight="bold" tone="warning" ltr>{formatPKR(row.due)}</Text>} last />
      </Card>
      <MoneyInput label={t('Abhi kitne diye (Rs)')} value={now} onChangeValue={setNow}
        hint={amount > 0 ? t('Is mahine ki kul payment {{after}} ho jayegi', { after: formatPKR(after) }) : t('Poori ya kuch amount — baqi baad me de sakte hain')} />
      <Input label={t('Note (marzi se)')} value={note} onChangeText={setNote} maxLength={300} hint={t('Maslan "cash diya" ya "JazzCash se bheja"')} />
      <Text size="xs" tone="muted">{t('Ye sirf payment ka record hai — galle ka cash nahi ghatta. Jis mahine ki commission yahan ada likhi ho, Payroll use tankhwah me dobara nahi jorta.')}</Text>
      <Button fullWidth size="lg" loading={saving} disabled={!(amount > 0)} onPress={() => void submit()}>{t('Ada likhein')}</Button>
    </View>
  );
}
