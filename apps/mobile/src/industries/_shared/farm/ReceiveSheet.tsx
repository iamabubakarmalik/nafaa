/** Money received with no fixed amount owed (a customer's payment on an open khata, an advance before the price is known): amount and method, optional cap. */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, MoneyInput, Sheet, Text, toast, useTheme } from '@/design';
import { MethodChips, errorText, type PayResult } from '../deskKit';

export function ReceiveSheet({ open, title, description, max, cta, onConfirm, onClose }: {
  open: boolean; title: string; description?: string; max?: number; cta: string; onConfirm: (pay: PayResult) => Promise<unknown>; onClose: () => void;
}) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setAmount(max && max > 0 ? max : null); setMethod('CASH'); } }, [open, max]);
  const n = amount ?? 0;
  const error = max != null && n > max + 0.005 ? t('Baqi sirf {{due}} hai', { due: formatMoney(max) }) : undefined;
  const run = async () => {
    setBusy(true);
    try { await onConfirm({ paymentMethod: method, paidAmount: Math.round(n * 100) / 100 }); onClose(); }
    catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={!(n > 0) || !!error} onPress={() => void run()}>{cta}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount} size="xl" error={error} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Payment kaise mili')}</Text>
        <MethodChips value={method} onChange={setMethod} />
      </View>
    </Sheet>
  );
}
