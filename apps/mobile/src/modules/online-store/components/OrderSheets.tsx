/**
 * Reason sheet around an order: asks why before cancel, reject or RTO.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, ChipGroup, Sheet, TextArea, useTheme } from '@/design';

/** Asks the reason before cancel, reject or "parcel came back". */
export function ReasonSheet({ open, title, description, reasons, confirmLabel, loading, onClose, onConfirm }: {
  open: boolean; title: string; description?: string; reasons: string[]; confirmLabel: string; loading?: boolean;
  onClose: () => void; onConfirm: (reason: string) => void;
}) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  const options = reasons.map((r) => ({ value: t(r), label: t(r) }));
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}
      footer={<Button variant="danger" fullWidth size="lg" loading={loading} disabled={!reason.trim()} onPress={() => onConfirm(reason.trim())}>{confirmLabel}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup wrap options={options} value={reason} onChange={setReason} />
        <TextArea label={t('Wajah')} value={reason} onChangeText={setReason} placeholder={t('Wajah likhein…')} maxLength={200} />
      </View>
    </Sheet>
  );
}
